import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { ACCOUNT, CAMPAIGNS, DOMAINS, MAILBOXES, THREADS } from '@/data/mock';
import type {
  Account,
  Campaign,
  Domain,
  Mailbox,
  MailFolder,
  Thread,
} from '@/data/types';

export type ComposeDraft = {
  mailboxId: string;
  to: string;
  subject: string;
  body: string;
};

type WorkspaceValue = {
  signedIn: boolean;
  account: Account;
  domains: Domain[];
  mailboxes: Mailbox[];
  threads: Thread[];
  campaigns: Campaign[];
  signIn: (email?: string) => void;
  signOut: () => void;
  markRead: (threadId: string) => void;
  toggleStar: (threadId: string) => void;
  moveToTrash: (threadId: string) => void;
  sendMail: (draft: ComposeDraft) => void;
  addDomain: (product: string, domain: string) => string;
  verifyDomain: (domainId: string) => void;
  createCampaign: (input: { name: string; subject: string; mailboxId: string; recipients: number }) => string;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [account, setAccount] = useState<Account>(ACCOUNT);
  const [domains, setDomains] = useState<Domain[]>(DOMAINS);
  const [mailboxes, setMailboxes] = useState<Mailbox[]>(MAILBOXES);
  const [threads, setThreads] = useState<Thread[]>(THREADS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(CAMPAIGNS);

  const signIn = useCallback((email?: string) => {
    if (email) setAccount((previous) => ({ ...previous, email }));
    setSignedIn(true);
  }, []);

  const signOut = useCallback(() => setSignedIn(false), []);

  const markRead = useCallback((threadId: string) => {
    setThreads((previous) => {
      const target = previous.find((thread) => thread.id === threadId);
      if (!target || !target.unread) return previous;

      setMailboxes((boxes) =>
        boxes.map((box) =>
          box.id === target.mailboxId ? { ...box, unread: Math.max(0, box.unread - 1) } : box,
        ),
      );
      return previous.map((thread) =>
        thread.id === threadId ? { ...thread, unread: false } : thread,
      );
    });
  }, []);

  const toggleStar = useCallback((threadId: string) => {
    setThreads((previous) =>
      previous.map((thread) =>
        thread.id === threadId ? { ...thread, starred: !thread.starred } : thread,
      ),
    );
  }, []);

  const moveToTrash = useCallback((threadId: string) => {
    setThreads((previous) =>
      previous.map((thread) =>
        thread.id === threadId ? { ...thread, folder: 'trash' as MailFolder, unread: false } : thread,
      ),
    );
  }, []);

  const sendMail = useCallback(
    (draft: ComposeDraft) => {
      const mailbox = mailboxes.find((box) => box.id === draft.mailboxId) ?? mailboxes[0];
      const sentAt = new Date().toISOString();
      const id = `th-${Math.random().toString(36).slice(2, 9)}`;

      setThreads((previous) => [
        {
          id,
          mailboxId: mailbox.id,
          folder: 'sent',
          subject: draft.subject || '(no subject)',
          correspondent: draft.to || 'No recipients',
          correspondentAddress: draft.to,
          preview: draft.body.slice(0, 120),
          receivedAt: sentAt,
          unread: false,
          starred: false,
          hasAttachment: false,
          messages: [
            {
              id: `${id}-m1`,
              from: mailbox.displayName,
              fromAddress: mailbox.address,
              body: draft.body,
              sentAt,
              outbound: true,
            },
          ],
        },
        ...previous,
      ]);
      setAccount((previous) => ({ ...previous, sendsThisMonth: previous.sendsThisMonth + 1 }));
    },
    [mailboxes],
  );

  const addDomain = useCallback((product: string, domain: string) => {
    const id = `dom-${Math.random().toString(36).slice(2, 9)}`;

    setDomains((previous) => [
      ...previous,
      {
        id,
        product,
        domain,
        addedAt: new Date().toISOString(),
        warmingDay: 1,
        reputation: 50,
        apiKeyPreview: `mm_live_${Math.random().toString(36).slice(2, 6)}…${Math.random()
          .toString(36)
          .slice(2, 6)}`,
        records: [
          { type: 'MX', host: '@', value: '10 mx.mailmark.dev', status: 'pending' },
          { type: 'SPF', host: '@', value: 'v=spf1 include:spf.mailmark.dev ~all', status: 'pending' },
          { type: 'DKIM', host: 'mm._domainkey', value: 'v=DKIM1; k=rsa; p=MIIBIjANBg…', status: 'pending' },
          {
            type: 'DMARC',
            host: '_dmarc',
            value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
            status: 'pending',
          },
        ],
      },
    ]);
    return id;
  }, []);

  const verifyDomain = useCallback((domainId: string) => {
    setDomains((previous) =>
      previous.map((item) =>
        item.id === domainId
          ? {
              ...item,
              records: item.records.map((record) => ({ ...record, status: 'verified' as const })),
            }
          : item,
      ),
    );
  }, []);

  const createCampaign = useCallback(
    (input: { name: string; subject: string; mailboxId: string; recipients: number }) => {
      const id = `cmp-${Math.random().toString(36).slice(2, 9)}`;

      setCampaigns((previous) => [
        {
          id,
          name: input.name,
          subject: input.subject,
          mailboxId: input.mailboxId,
          status: 'scheduled',
          date: new Date().toISOString(),
          recipients: input.recipients,
          sent: 0,
          opened: 0,
          clicked: 0,
          replied: 0,
          bounced: 0,
          unsubscribed: 0,
          stages: [{ stage: 1, label: 'Announcement', delayDays: 0, sent: false }],
        },
        ...previous,
      ]);
      return id;
    },
    [],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      signedIn,
      account,
      domains,
      mailboxes,
      threads,
      campaigns,
      signIn,
      signOut,
      markRead,
      toggleStar,
      moveToTrash,
      sendMail,
      addDomain,
      verifyDomain,
      createCampaign,
    }),
    [
      signedIn,
      account,
      domains,
      mailboxes,
      threads,
      campaigns,
      signIn,
      signOut,
      markRead,
      toggleStar,
      moveToTrash,
      sendMail,
      addDomain,
      verifyDomain,
      createCampaign,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside a WorkspaceProvider');
  return value;
}

export function useMailbox(mailboxId: string | undefined) {
  const { mailboxes } = useWorkspace();
  return mailboxes.find((box) => box.id === mailboxId);
}

export function useDomainFor(mailboxId: string | undefined) {
  const { mailboxes, domains } = useWorkspace();
  const mailbox = mailboxes.find((box) => box.id === mailboxId);
  return domains.find((domain) => domain.id === mailbox?.domainId);
}
