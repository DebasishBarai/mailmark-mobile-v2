import { createContext, use, useMemo, useState, type ReactNode } from 'react';

import type { ContentType } from '@/lib/email/compose';

export type MergeRecipient = { email: string; fields: Record<string, string> };
export type FollowUpStep = { delayDays: number; subject: string; body: string };

export type CampaignDraft = {
  mailboxId: string | null;
  recipients: MergeRecipient[];
  columns: string[];
  sourceLabel: string | null;
  subject: string;
  body: string;
  contentType: ContentType;
  includeSignature: boolean;
  followUps: FollowUpStep[];
};

type DraftApi = {
  draft: CampaignDraft;
  update: (patch: Partial<CampaignDraft>) => void;
  reset: () => void;
};

const EMPTY: CampaignDraft = {
  mailboxId: null,
  recipients: [],
  columns: [],
  sourceLabel: null,
  subject: '',
  body: '',
  contentType: 'plain',
  includeSignature: true,
  followUps: [],
};

const DraftContext = createContext<DraftApi | null>(null);

/** State shared by the steps of the New campaign flow while it is open. */
export function CampaignDraftProvider({ children, mailboxId }: { children: ReactNode; mailboxId?: string }) {
  const [draft, setDraft] = useState<CampaignDraft>({ ...EMPTY, mailboxId: mailboxId ?? null });
  const value = useMemo<DraftApi>(
    () => ({
      draft,
      update: (patch) => setDraft((d) => ({ ...d, ...patch })),
      reset: () => setDraft({ ...EMPTY }),
    }),
    [draft],
  );
  return <DraftContext value={value}>{children}</DraftContext>;
}

export function useCampaignDraft(): DraftApi {
  const ctx = use(DraftContext);
  if (!ctx) throw new Error('useCampaignDraft must be used inside CampaignDraftProvider');
  return ctx;
}

/** Merge newly imported recipients into the list, de-duplicated by address. */
export function mergeRecipients(existing: MergeRecipient[], incoming: MergeRecipient[]): MergeRecipient[] {
  const seen = new Set(existing.map((r) => r.email.toLowerCase()));
  const out = [...existing];
  for (const r of incoming) {
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}
