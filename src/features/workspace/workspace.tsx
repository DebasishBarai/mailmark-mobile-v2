import { useQueries } from 'convex/react';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/features/auth/session';
import type { MailFolder } from '@/features/mail/folders';
import { api } from '@/lib/convex/api';
import { useLiveQuery, type LiveQuery } from '@/lib/convex/hooks';
import type { Domain, Id, Mailbox } from '@/lib/convex/types';
import { local } from '@/lib/storage';

type WorkspaceApi = {
  mailboxes: LiveQuery<Mailbox[]>;
  domains: LiveQuery<Domain[]>;
  /** The mailbox the Mail tab shows; null until mailboxes load (or if none exist). */
  mailbox: Mailbox | null;
  selectMailbox: (id: Id<'mailboxes'>) => void;
  /** The folder open in Mail. Switching mailbox keeps the folder. */
  folder: MailFolder;
  setFolder: (folder: MailFolder) => void;
  unreadByMailbox: Record<string, number>;
  totalUnread: number;
  domainFor: (mailbox: Mailbox) => Domain | undefined;
};

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

/**
 * Every mailbox, read the way the website's sidebar reads them: the user's
 * domains, then mailboxes.listByDomain for each domain.
 */
function useMailboxesByDomain(domains: LiveQuery<Domain[]>): LiveQuery<Mailbox[]> {
  const requests = useMemo(
    () =>
      Object.fromEntries(
        (domains.data ?? []).map((d) => [d._id, { query: api.mailboxes.listByDomain, args: { domainId: d._id } }]),
      ),
    [domains.data],
  );
  const results = useQueries(requests);

  let status: 'loading' | 'success' | 'error' = domains.status;
  let error: Error | undefined = domains.error;
  const merged: Mailbox[] = [];
  if (domains.status === 'success') {
    for (const d of domains.data) {
      const value = results[d._id];
      if (value instanceof Error) {
        status = 'error';
        error = value;
        break;
      }
      if (value === undefined) {
        status = 'loading';
        break;
      }
      merged.push(...(value as Mailbox[]));
    }
  }
  // useQueries hands back a new object every render; keying on the content
  // keeps the list's identity stable so dependants do not resubscribe.
  const signature = status === 'success' ? JSON.stringify(merged) : '';
  const data = useMemo(() => (signature ? (JSON.parse(signature) as Mailbox[]) : undefined), [signature]);

  return useMemo<LiveQuery<Mailbox[]>>(() => {
    if (status === 'error') return { status, data: undefined, error: error! };
    if (status === 'success' && data) return { status, data, error: undefined };
    return { status: 'loading', data: undefined, error: undefined };
  }, [status, data, error]);
}

/**
 * Account-wide data several tabs read: the user's mailboxes and domains, the
 * mailbox currently open in Mail (remembered across launches), and live
 * unread counts for the mailbox switcher and the tab badge.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useSession();
  const domains = useLiveQuery(api.domains.listForCurrentUser, isAuthenticated ? {} : 'skip');
  const mailboxes = useMailboxesByDomain(domains);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [folder, setFolder] = useState<MailFolder>('inbox');

  useEffect(() => {
    local.get<string | null>('lastMailbox', null).then(setSelectedId);
  }, []);

  const selectMailbox = useCallback((id: Id<'mailboxes'>) => {
    setSelectedId(id);
    void local.set('lastMailbox', id);
  }, []);

  const list = useMemo(() => mailboxes.data ?? [], [mailboxes.data]);
  const mailbox = useMemo(() => list.find((m) => m._id === selectedId) ?? list[0] ?? null, [list, selectedId]);

  const unreadQueries = useMemo(
    () =>
      Object.fromEntries(
        list.map((m) => [m._id, { query: api.emails.countUnreadByMailbox, args: { mailboxId: m._id } }]),
      ),
    [list],
  );
  const unreadResults = useQueries(unreadQueries);
  const unreadSignature = JSON.stringify(
    Object.fromEntries(Object.entries(unreadResults).map(([id, v]) => [id, typeof v === 'number' ? v : 0])),
  );
  const unreadByMailbox = useMemo(() => JSON.parse(unreadSignature) as Record<string, number>, [unreadSignature]);
  const totalUnread = Object.values(unreadByMailbox).reduce((a, b) => a + b, 0);

  const domainFor = useCallback(
    (m: Mailbox) => (domains.data ?? []).find((d) => d._id === m.domainId),
    [domains.data],
  );

  const value = useMemo<WorkspaceApi>(
    () => ({ mailboxes, domains, mailbox, selectMailbox, folder, setFolder, unreadByMailbox, totalUnread, domainFor }),
    [mailboxes, domains, mailbox, selectMailbox, folder, unreadByMailbox, totalUnread, domainFor],
  );

  return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export function useWorkspace(): WorkspaceApi {
  const ctx = use(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}
