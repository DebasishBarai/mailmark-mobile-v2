import type { FunctionReference } from 'convex/server';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { api } from '@/lib/convex/api';
import { isNetworkError } from '@/lib/convex/errors';
import type { Email, Id } from '@/lib/convex/types';
import { local } from '@/lib/storage';

/**
 * Changes to messages (read, starred, folder) made on this device and not yet
 * confirmed by the server, kept on the device so they survive being offline
 * and the app being closed.
 *
 * Every mail action goes through here, online or not: the change shows on
 * screen at once (`withPending`) and is sent in order when a connection
 * allows. Repeated changes to the same message coalesce, so toggling a star
 * twice offline sends nothing.
 *
 * Read, unread and move set a value, so sending one twice is harmless. The
 * backend only toggles a star, so each entry keeps the server's value from
 * before the first change (`base`) and toggles only when the wanted value
 * differs; `base` is updated as soon as a toggle lands, so a retry never
 * toggles back.
 */

export type MailFields = { read?: boolean; starred?: boolean; folder?: string };
type Field = keyof MailFields;

export type PendingChange = {
  emailId: string;
  mailboxId?: string;
  /** The server's values before this device changed them. */
  base: MailFields;
  /** The values wanted. */
  change: MailFields;
};

/** A message as the caller sees it, pending changes included. */
export type MailTarget = { _id: string; mailboxId?: string } & MailFields;

type Mutate = (ref: FunctionReference<'mutation'>, args: Record<string, unknown>) => Promise<unknown>;
/** A way to reach the server now, or null (signed out). */
export type ClientSource = () => Promise<Mutate | null>;

const KEY = 'pendingMailChanges';
/** Sent in this order for each message: where it lives, then its flags. */
const FIELDS: Field[] = ['folder', 'read', 'starred'];

let entries: PendingChange[] = [];
const loaded = local.get<PendingChange[]>(KEY, []).then((saved) => {
  entries = saved;
  emit();
});

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

/** Changes to the list run one at a time, after it has loaded. */
let chain: Promise<unknown> = loaded;
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => {});
  return run;
}

/** The list with `old` swapped for `next` in place (or `next` appended), dropping it once it wants nothing. */
function replace(old: PendingChange | undefined, next: PendingChange): PendingChange[] {
  const keep = Object.keys(next.change).length > 0;
  if (!old) return keep ? [...entries, next] : entries;
  return keep ? entries.map((e) => (e === old ? next : e)) : entries.filter((e) => e !== old);
}

async function commit(next: PendingChange[]) {
  entries = next;
  emit();
  await local.set(KEY, next);
}

/**
 * Record a change and start sending it. `target` is the message as shown,
 * which for any field without a pending change is the server's value.
 */
export function queueMailChange(target: MailTarget, change: MailFields): Promise<void> {
  const saved = serial(async () => {
    const existing = entries.find((e) => e.emailId === target._id);
    const entry: PendingChange = existing
      ? { ...existing, base: { ...existing.base }, change: { ...existing.change } }
      : { emailId: target._id, base: {}, change: {} };
    if (target.mailboxId) entry.mailboxId = target.mailboxId;
    for (const field of FIELDS) {
      if (entry.base[field] === undefined && target[field] !== undefined) {
        (entry.base as Record<Field, unknown>)[field] = target[field];
      }
      const value = change[field];
      if (value === undefined) continue;
      // Back to what the server has: nothing to send.
      if (value === entry.base[field]) delete entry.change[field];
      else (entry.change as Record<Field, unknown>)[field] = value;
    }
    await commit(replace(existing, entry));
  });
  void saved.then(() => flushMailChanges());
  return saved;
}

export function clearMailChanges(): Promise<void> {
  return serial(() => commit([]));
}

/** Pending changes laid over a message from the server. */
export function withPending<T extends Pick<Email, '_id'> & Required<MailFields>>(email: T, pending: PendingChange[]): T {
  const entry = pending.find((e) => e.emailId === email._id);
  return entry ? { ...email, ...entry.change } : email;
}

export function pendingSnapshot(): PendingChange[] {
  return entries;
}

export function usePendingChanges(): PendingChange[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pendingSnapshot,
    pendingSnapshot,
  );
}

/**
 * How much each mailbox's unread inbox count moves once the pending changes
 * land: a message counts when it is in the inbox and unread.
 */
export function unreadDelta(pending: PendingChange[]): Record<string, number> {
  const unread = (f: MailFields) => (f.folder ?? 'inbox') === 'inbox' && f.read === false;
  const out: Record<string, number> = {};
  for (const e of pending) {
    if (!e.mailboxId) continue;
    const d = Number(unread({ ...e.base, ...e.change })) - Number(unread(e.base));
    if (d) out[e.mailboxId] = (out[e.mailboxId] ?? 0) + d;
  }
  return out;
}

// --- Sending ---------------------------------------------------------------

type Rejection = { emailId: string; error: unknown };
const rejectionListeners = new Set<(r: Rejection) => void>();

/** Called when the server refuses a change (the message was deleted, say). */
export function onMailChangeRejected(listener: (r: Rejection) => void): () => void {
  rejectionListeners.add(listener);
  return () => rejectionListeners.delete(listener);
}

let live: { mutate: Mutate; connected: () => boolean } | null = null;
let fallback: ClientSource | null = null;

/** The app's own Convex client, while signed in. Preferred while connected. */
export function setLiveClient(client: typeof live) {
  live = client;
}

/** How to reach the server when the app's client is absent or offline (a background task). */
export function setFallbackClient(source: ClientSource) {
  fallback = source;
}

/**
 * The app's client while it is connected. In the foreground without a
 * connection there is nothing to do but wait for it (the sync component
 * sends on reconnect). In the background, where the app's socket may be
 * asleep, or with no app client at all, a one-off HTTP client.
 */
async function pickClient(): Promise<Mutate | null> {
  if (live) {
    if (live.connected()) return live.mutate;
    if (AppState.currentState === 'active') return null;
  }
  return fallback ? fallback().catch(() => null) : null;
}

type Job = { emailId: string; field: Field; value: MailFields[Field]; base: MailFields[Field] };

function nextJob(): Job | null {
  for (const e of entries) {
    for (const field of FIELDS) {
      if (e.change[field] !== undefined) return { emailId: e.emailId, field, value: e.change[field], base: e.base[field] };
    }
  }
  return null;
}

function send(mutate: Mutate, { emailId, field, value, base }: Job): Promise<unknown> {
  const id = emailId as Id<'emails'>;
  if (field === 'folder') return mutate(api.emails.moveToFolder, { emailId: id, folder: value as string });
  if (field === 'read') return mutate(value ? api.emails.markAsRead : api.emails.markAsUnread, { emailId: id });
  // Toggle only from a known, different state.
  return base === undefined || base === value ? Promise.resolve() : mutate(api.emails.toggleStar, { emailId: id });
}

/** A job is done, landed or refused: drop it unless the user changed that field since. */
function settle({ emailId, field, value }: Job, landed: boolean): Promise<void> {
  return serial(async () => {
    const entry = entries.find((e) => e.emailId === emailId);
    if (!entry) return;
    const next = { ...entry, base: { ...entry.base }, change: { ...entry.change } };
    if (landed) (next.base as Record<Field, unknown>)[field] = value;
    if (next.change[field] === value || next.change[field] === next.base[field]) delete next.change[field];
    await commit(replace(entry, next));
  });
}

async function drain() {
  await loaded;
  if (!nextJob()) return;
  const mutate = await pickClient();
  if (!mutate) return;
  for (let job = nextJob(); job; job = nextJob()) {
    try {
      await send(mutate, job);
    } catch (error) {
      // No connection (fetch throws a TypeError): the rest wait for the next try.
      if (error instanceof TypeError || isNetworkError(error)) return;
      await settle(job, false);
      for (const l of rejectionListeners) l({ emailId: job.emailId, error });
      continue;
    }
    await settle(job, true);
  }
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Send what is pending, one change at a time. Never throws; what cannot be
 * sent now stays for the next call (on every change, on reconnect, on return
 * to the app and in the background check).
 */
export function flushMailChanges(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await drain().catch(() => {});
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}
