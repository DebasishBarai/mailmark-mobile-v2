import type { FunctionReference } from 'convex/server';

import { api } from '@/lib/convex/api';
import type { Domain, Email, Id, Mailbox } from '@/lib/convex/types';
import { local } from '@/lib/storage';

import { CATEGORIES, CHANNELS } from './push';

/**
 * What the background check looks at, using only queries the website makes:
 * domains.listForCurrentUser, mailboxes.listByDomain and the first page of
 * emails.listByFolderPaginated for each mailbox's inbox and sent folders.
 */

type Query = <Args extends Record<string, unknown>, Ret>(
  ref: FunctionReference<'query', 'public', Args, Ret>,
  args: Args,
) => Promise<Ret>;

/** Adapt any Convex client (HTTP in the background, React while open) to `Query`. */
export function convexQuery(client: {
  query: (ref: FunctionReference<'query'>, args: Record<string, unknown>) => Promise<unknown>;
}): Query {
  return (ref, args) => client.query(ref as FunctionReference<'query'>, args) as Promise<never>;
}

export type NotifyPreferences = {
  enabled: boolean;
  newMail: boolean;
  bounces: boolean;
};

export const DEFAULT_NOTIFY_PREFS: NotifyPreferences = { enabled: false, newMail: true, bounces: true };

const PREFS_KEY = 'notifyPrefs';
const STATE_KEY = 'notifyState';
const PAGE = 20;
const PROBLEM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type State = {
  /** Newest inbox _creationTime already seen or announced, per mailbox. */
  inbox: Record<string, number>;
  /** Sent messages whose delivery problem was already announced. */
  problems: string[];
};

export async function loadNotifyPrefs(): Promise<NotifyPreferences> {
  return { ...DEFAULT_NOTIFY_PREFS, ...(await local.get<Partial<NotifyPreferences>>(PREFS_KEY, {})) };
}

export async function saveNotifyPrefs(prefs: NotifyPreferences) {
  await local.set(PREFS_KEY, prefs);
}

export async function clearNotifyState() {
  await local.remove(STATE_KEY);
}

export type LocalNotification = {
  title: string;
  body: string;
  data: Record<string, string>;
  channelId: string;
  categoryIdentifier?: string;
};

function nameOf(address: string): string {
  const m = address.match(/^(.+?)\s*<([^>]+)>$/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : address.replace(/[<>]/g, '');
}

function emailPath(e: Pick<Email, '_id' | 'mailboxId' | 'folder'>) {
  return `/email/${e._id}?mailbox=${encodeURIComponent(e.mailboxId)}&folder=${e.folder}`;
}

/**
 * Compare the newest inbox and sent mail with what was last seen and return
 * the notifications to show. With `silent`, only record the current state:
 * used while the app is open, so mail the user has already seen on screen is
 * never announced later. A mailbox seen for the first time is recorded, not
 * announced, so enabling notifications does not replay old mail.
 */
export async function checkMail(query: Query, options: { silent: boolean; prefs: NotifyPreferences }): Promise<LocalNotification[]> {
  const state = await local.get<State>(STATE_KEY, { inbox: {}, problems: [] });
  const out: LocalNotification[] = [];

  const domains: Domain[] = await query(api.domains.listForCurrentUser, {});
  const mailboxes: Mailbox[] = (
    await Promise.all(domains.map((d) => query(api.mailboxes.listByDomain, { domainId: d._id })))
  ).flat();

  const newMail: Email[] = [];
  const problems: Email[] = [];
  const now = Date.now();

  for (const mailbox of mailboxes) {
    const mailboxId = mailbox._id as Id<'mailboxes'>;
    const inbox = await query(api.emails.listByFolderPaginated, {
      mailboxId,
      folder: 'inbox',
      paginationOpts: { numItems: PAGE, cursor: null },
    });
    const newest = Math.max(0, ...inbox.page.map((e) => e._creationTime));
    const seen = state.inbox[mailbox._id];
    if (seen !== undefined) {
      newMail.push(...inbox.page.filter((e) => e._creationTime > seen && !e.read));
    }
    state.inbox[mailbox._id] = Math.max(seen ?? 0, newest);

    const sent = await query(api.emails.listByFolderPaginated, {
      mailboxId,
      folder: 'sent',
      paginationOpts: { numItems: PAGE, cursor: null },
    });
    for (const e of sent.page) {
      const bad = e.deliveryStatus === 'bounced' || e.deliveryStatus === 'failed' || e.deliveryStatus === 'complained';
      if (!bad || now - e.date > PROBLEM_WINDOW_MS || state.problems.includes(e._id)) continue;
      problems.push(e);
      state.problems.push(e._id);
    }
  }
  state.problems = state.problems.slice(-300);
  await local.set(STATE_KEY, state);

  if (options.silent) return [];

  if (options.prefs.newMail && newMail.length > 0) {
    newMail.sort((a, b) => b._creationTime - a._creationTime);
    if (newMail.length <= 3) {
      for (const e of newMail) {
        out.push({
          title: nameOf(e.from),
          body: e.subject || '(no subject)',
          data: { url: emailPath(e), emailId: e._id, mailboxId: e.mailboxId, folder: e.folder, type: 'new_mail' },
          channelId: CHANNELS.mail,
          categoryIdentifier: CATEGORIES.email,
        });
      }
    } else {
      out.push({
        title: `${newMail.length} new messages`,
        body: newMail.slice(0, 3).map((e) => `${nameOf(e.from)}: ${e.subject}`).join('\n'),
        data: { url: `/mailbox/${newMail[0].mailboxId}` , type: 'new_mail' },
        channelId: CHANNELS.mail,
      });
    }
  }

  if (options.prefs.bounces && problems.length > 0) {
    const byBatch = new Map<string, Email[]>();
    for (const e of problems) {
      const key = e.batchId ?? e._id;
      byBatch.set(key, [...(byBatch.get(key) ?? []), e]);
    }
    for (const [key, group] of byBatch) {
      const first = group[0];
      const what = first.deliveryStatus === 'complained' ? 'was marked as spam' : 'bounced';
      out.push(
        first.batchId
          ? {
              title: 'Delivery problems in a campaign',
              body: `${group.length} message${group.length === 1 ? '' : 's'} in “${first.subject}” ${group.length === 1 ? what : 'did not arrive'}.`,
              data: { url: `/campaign/${encodeURIComponent(key)}`, batchId: key, type: 'delivery_issue' },
              channelId: CHANNELS.campaigns,
              categoryIdentifier: CATEGORIES.campaign,
            }
          : {
              title: `Your email ${what}`,
              body: `To ${first.to.join(', ')}: ${first.subject}`,
              data: { url: emailPath(first), emailId: first._id, mailboxId: first.mailboxId, folder: first.folder, type: 'bounce' },
              channelId: CHANNELS.campaigns,
            },
      );
    }
  }

  return out;
}
