import { useQueries } from 'convex/react';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { useWorkspace } from '@/features/workspace/workspace';
import { api } from '@/lib/convex/api';
import { useLivePaginated, type LiveQuery } from '@/lib/convex/hooks';
import type { Email, Id } from '@/lib/convex/types';

import { cachedEmail, forgetEmail, isSettled, rememberEmail } from './email-cache';
import type { MailFolder } from './folders';
import { pendingSnapshot, withPending } from './pending-changes';

/** How far back to page through a folder looking for a message. */
const SEARCH_LIMIT = 500;
const PAGE = 50;

export type EmailLocation = { mailboxId?: string; folder?: string };

/** An in-app link to a message; mailbox and folder let the reader find it. */
export function emailHref(email: Pick<Email, '_id' | 'mailboxId' | 'folder'>) {
  return { pathname: '/email/[id]' as const, params: { id: email._id, mailbox: email.mailboxId, folder: email.folder } };
}

/** Open a message shown in a list, which the reader can show before its own copy loads. */
export function openEmail(email: Email) {
  rememberEmail(email);
  router.push(emailHref(email));
}

/**
 * One message, live, found the way the website's mailbox page finds the
 * selected message: in the folder list from emails.listByFolderPaginated,
 * loading further pages until it turns up. The list subscription keeps it
 * current (read state, delivery, opens, clicks).
 *
 * A link without mailbox and folder (an old deep link) is first located by
 * looking through the recent inbox and sent pages of every mailbox.
 *
 * A message opened before this session (email-cache.ts) shows at once from
 * memory while the folder loads behind it; one whose delivery has settled is
 * not fetched again at all.
 */
export function useEmail(id: string, location: EmailLocation): LiveQuery<Email | null> {
  const active = id.length > 0;
  const cached = active ? cachedEmail(id) : undefined;
  // Decided once per open, so a message that settles while on screen keeps its subscription.
  const [fetch] = useState(() => active && !(cached && isSettled(cached)));
  const located = useLocate(id, fetch && !cached && (!location.mailboxId || !location.folder));
  const mailboxId = location.mailboxId ?? cached?.mailboxId ?? located.data?.mailboxId;
  const folder = location.folder ?? cached?.folder ?? located.data?.folder;

  const page = useLivePaginated(
    api.emails.listByFolderPaginated,
    fetch && mailboxId && folder ? { mailboxId: mailboxId as Id<'mailboxes'>, folder } : 'skip',
    PAGE,
  );
  const email = page.items.find((e) => e._id === id);
  const { canLoadMore, loadMore } = page;
  const searchedEnough = page.items.length >= SEARCH_LIMIT;
  const searching = page.status === 'loading' || page.isLoadingMore || (canLoadMore && !searchedEnough);

  useEffect(() => {
    if (!email && canLoadMore && !searchedEnough) loadMore();
  }, [email, canLoadMore, searchedEnough, loadMore]);

  useEffect(() => {
    // With this device's unsent changes, which the cache already carries.
    if (email) rememberEmail(withPending(email, pendingSnapshot()));
  }, [email]);

  // Searched its folder and it is not there: moved or deleted elsewhere.
  const gone = fetch && !!cached && !email && page.status === 'success' && !searching;
  useEffect(() => {
    if (gone) forgetEmail(id);
  }, [gone, id]);

  return useMemo<LiveQuery<Email | null>>(() => {
    if (!active) return { status: 'success', data: null, error: undefined };
    if (email) return { status: 'success', data: email, error: undefined };
    if (cached && !gone) return { status: 'success', data: cached, error: undefined };
    if (!location.mailboxId || !location.folder) {
      if (located.status === 'loading') return { status: 'loading', data: undefined, error: undefined };
      if (located.status === 'error') return located;
      if (!located.data) return { status: 'success', data: null, error: undefined };
    }
    if (page.status === 'error') return { status: 'error', data: undefined, error: page.error! };
    if (searching) return { status: 'loading', data: undefined, error: undefined };
    return { status: 'success', data: null, error: undefined };
  }, [active, location.mailboxId, location.folder, located, email, cached, gone, page.status, page.error, searching]);
}

const LOCATE_FOLDERS: MailFolder[] = ['inbox', 'sent', 'outbox', 'drafts', 'trash'];

function useLocate(id: string, enabled: boolean): LiveQuery<Email | null> {
  const { mailboxes } = useWorkspace();
  const requests = useMemo(() => {
    if (!enabled) return {};
    const out: Record<string, { query: typeof api.emails.listByFolderPaginated; args: { mailboxId: Id<'mailboxes'>; folder: string; paginationOpts: { numItems: number; cursor: null } } }> = {};
    for (const m of mailboxes.data ?? []) {
      for (const folder of LOCATE_FOLDERS) {
        out[`${m._id}:${folder}`] = {
          query: api.emails.listByFolderPaginated,
          args: { mailboxId: m._id, folder, paginationOpts: { numItems: 100, cursor: null } },
        };
      }
    }
    return out;
  }, [enabled, mailboxes.data]);
  const results = useQueries(requests);

  if (!enabled) return { status: 'success', data: null, error: undefined };
  if (mailboxes.status !== 'success') {
    return mailboxes.status === 'error' ? { status: 'error', data: undefined, error: mailboxes.error } : { status: 'loading', data: undefined, error: undefined };
  }
  let pending = false;
  for (const value of Object.values(results)) {
    if (value === undefined) {
      pending = true;
      continue;
    }
    if (value instanceof Error) continue;
    const found = (value as { page: Email[] }).page.find((e) => e._id === id);
    if (found) return { status: 'success', data: found, error: undefined };
  }
  return pending ? { status: 'loading', data: undefined, error: undefined } : { status: 'success', data: null, error: undefined };
}
