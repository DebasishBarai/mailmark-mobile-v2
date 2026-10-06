import type { Sequence } from '@/lib/convex/types';

import type { Campaign } from './campaign-index';

/**
 * Campaign helpers shared with the website's lib/campaign/history.ts, ported
 * and checked against its tests.
 */

/**
 * When a campaign was started, from its id. The app, the website's New
 * campaign page and its composer stamp the time into it before the first
 * message is stored, so none of the campaign's messages is older than this.
 * Null for ids made elsewhere, such as batches sent through the API.
 */
export function batchStartedAt(batchId: string): number | null {
  const m = /^campaign-(\d{13})-/.exec(batchId);
  return m ? Number(m[1]) : null;
}

// The follow-ups are created once every first email has gone out (or been
// scheduled), well within this.
const FOLLOW_UP_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * The follow-up sequence created with a campaign, if it has one. Every sender
 * names it "Follow-up: <subject>" and creates it right after sending from the
 * same mailbox, but the name holds the subject as typed, merge fields and all
 * ("Hi {{firstName}}"), while each message carries it filled in ("Hi John").
 * So the match is on mailbox and timing, preferring an exact name.
 */
export function matchFollowUp<S extends Pick<Sequence, '_creationTime' | 'mailboxId' | 'name'>>(
  campaign: Pick<Campaign, 'batchId' | 'mailboxId' | 'subject'>,
  sequences: S[],
): S | null {
  const started = batchStartedAt(campaign.batchId);
  if (started === null) return null;
  const candidates = sequences.filter(
    (s) =>
      s.mailboxId === campaign.mailboxId &&
      s.name.startsWith('Follow-up: ') &&
      s._creationTime >= started &&
      s._creationTime - started <= FOLLOW_UP_WINDOW_MS,
  );
  const exact = `Follow-up: ${campaign.subject.slice(0, 50)}`;
  candidates.sort((a, b) => Number(b.name === exact) - Number(a.name === exact) || a._creationTime - b._creationTime);
  return candidates[0] ?? null;
}
