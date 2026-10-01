import type { Email } from '@/lib/convex/types';

import { deliveryState, type DeliveryState } from './delivery-status';

/**
 * Messages seen this session, kept in memory so reopening one shows it at
 * once instead of waiting for its folder to load again. The reader still
 * refreshes it in the background, unless the message has settled (below).
 * Read, star and folder changes made on this device are written through
 * (pending-changes.ts), so a cached copy never shows an undone change.
 */
const MAX = 200;
const emails = new Map<string, Email>();
const conversations = new Map<string, Email[]>();

/** Keep the most recently used entries, dropping the oldest past MAX. */
function put<T>(map: Map<string, T>, key: string, value: T) {
  map.delete(key);
  map.set(key, value);
  if (map.size > MAX) map.delete(map.keys().next().value!);
}

export function cachedEmail(id: string): Email | undefined {
  return emails.get(id);
}

export function rememberEmail(email: Email) {
  put(emails, email._id, email);
}

/** Apply a change made on this device to the cached copy, if there is one. */
export function patchCachedEmail(id: string, change: Partial<Pick<Email, 'read' | 'starred' | 'folder'>>) {
  const email = emails.get(id);
  if (!email) return;
  const set = Object.fromEntries(Object.entries(change).filter(([, v]) => v !== undefined));
  emails.set(id, { ...email, ...set });
}

export function forgetEmail(id: string) {
  emails.delete(id);
  conversations.delete(id);
}

export function cachedConversation(id: string): Email[] | undefined {
  return conversations.get(id);
}

export function rememberConversation(id: string, messages: Email[]) {
  put(conversations, id, messages);
}

export function clearEmailCache() {
  emails.clear();
  conversations.clear();
}

/**
 * Sent mail whose delivery has reached a point the reader no longer needs to
 * watch: the recipient opened it (or went further), or it bounced, failed,
 * was blocked or marked as spam. Reopening such a message uses the cached
 * copy without fetching it again.
 */
const SETTLED: DeliveryState[] = ['opened', 'clicked', 'replied', 'bounced', 'failed', 'blocked', 'complained'];

export function isSettled(email: Email): boolean {
  if (email.folder !== 'sent') return false;
  const state = deliveryState(email);
  return state !== null && SETTLED.includes(state);
}
