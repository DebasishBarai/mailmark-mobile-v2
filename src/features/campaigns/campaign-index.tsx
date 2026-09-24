import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useWorkspace } from '@/features/workspace/workspace';
import { api } from '@/lib/convex/api';
import { useLivePaginated } from '@/lib/convex/hooks';
import type { Email, Id, Mailbox } from '@/lib/convex/types';

import { campaignStats, type CampaignStats } from './stats';

export type Campaign = {
  batchId: string;
  mailboxId: Id<'mailboxes'>;
  mailboxAddress: string;
  subject: string;
  /** First send time (or scheduled time, for campaigns still in the Outbox). */
  at: number;
  scheduled: boolean;
  emails: Email[];
  stats: CampaignStats;
};

type Source = { items: Email[]; canLoadMore: boolean; loading: boolean; error?: Error; loadMore: () => void };

type CampaignIndexApi = {
  campaigns: Campaign[];
  loading: boolean;
  error: Error | undefined;
  canLoadMore: boolean;
  loadMore: () => void;
  byId: (batchId: string) => Campaign | undefined;
};

const CampaignIndexContext = createContext<CampaignIndexApi | null>(null);

const PAGE = 100;

/**
 * Campaigns are not a table in Mailmark. A campaign is a batch send: one
 * message per recipient, all sharing a batchId, with follow-ups kept as a
 * sequence. The website shows them by grouping the Sent and Outbox folders
 * by batchId; this does the same across every mailbox, newest first, loading
 * further back on demand.
 */
export function CampaignIndexProvider({ children }: { children: ReactNode }) {
  const { mailboxes } = useWorkspace();
  const [sources, setSources] = useState<Record<string, Source>>({});

  const report = useCallback((key: string, source: Source) => {
    setSources((prev) => (prev[key] === source ? prev : { ...prev, [key]: source }));
  }, []);

  const list = useMemo(() => mailboxes.data ?? [], [mailboxes.data]);

  const value = useMemo<CampaignIndexApi>(() => {
    const byMailbox = new Map(list.map((m) => [m._id as string, m]));
    const groups = new Map<string, Email[]>();
    for (const [key, source] of Object.entries(sources)) {
      if (!byMailbox.has(key.split(':')[0])) continue;
      for (const e of source.items) {
        if (!e.batchId) continue;
        const g = groups.get(e.batchId);
        if (g) g.push(e);
        else groups.set(e.batchId, [e]);
      }
    }
    const campaigns: Campaign[] = [...groups.entries()].map(([batchId, emails]) => {
      const scheduled = emails.every((e) => e.folder === 'outbox');
      const at = Math.min(...emails.map((e) => (e.folder === 'outbox' && e.scheduledAt ? e.scheduledAt : e.date)));
      const mailbox = byMailbox.get(emails[0].mailboxId);
      return {
        batchId,
        mailboxId: emails[0].mailboxId,
        mailboxAddress: mailbox?.fullAddress ?? '',
        subject: emails[0].subject,
        at,
        scheduled,
        emails,
        stats: campaignStats(emails),
      };
    });
    campaigns.sort((a, b) => b.at - a.at);

    const all = Object.values(sources);
    const expected = list.length * 2;
    return {
      campaigns,
      loading: mailboxes.status === 'loading' || all.length < expected || all.some((s) => s.loading && s.items.length === 0),
      error: mailboxes.error ?? all.find((s) => s.error)?.error,
      canLoadMore: all.some((s) => s.canLoadMore),
      loadMore: () => all.forEach((s) => s.canLoadMore && s.loadMore()),
      byId: (id) => campaigns.find((c) => c.batchId === id),
    };
  }, [sources, list, mailboxes.status, mailboxes.error]);

  return (
    <CampaignIndexContext value={value}>
      {list.map((m) => (
        <FolderSource key={`${m._id}:sent`} mailbox={m} folder="sent" report={report} />
      ))}
      {list.map((m) => (
        <FolderSource key={`${m._id}:outbox`} mailbox={m} folder="outbox" report={report} />
      ))}
      {children}
    </CampaignIndexContext>
  );
}

function FolderSource({
  mailbox,
  folder,
  report,
}: {
  mailbox: Mailbox;
  folder: 'sent' | 'outbox';
  report: (key: string, source: Source) => void;
}) {
  const page = useLivePaginated(api.emails.listByFolderPaginated, { mailboxId: mailbox._id, folder }, PAGE);
  const { items, canLoadMore, status, error, loadMore } = page;
  const loading = status === 'loading' || page.isLoadingMore;

  useEffect(() => {
    report(`${mailbox._id}:${folder}`, { items, canLoadMore, loading, error, loadMore });
  }, [report, mailbox._id, folder, items, canLoadMore, loading, error, loadMore]);

  return null;
}

export function useCampaignIndex(): CampaignIndexApi {
  const ctx = use(CampaignIndexContext);
  if (!ctx) throw new Error('useCampaignIndex must be used inside CampaignIndexProvider');
  return ctx;
}
