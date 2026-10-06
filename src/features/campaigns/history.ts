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

/** How far back one mailbox folder has been read. */
export interface FolderProgress {
  /** _creationTime of the oldest message loaded so far, or null if none yet. */
  oldestLoaded: number | null;
  /** Every page has been loaded. */
  done: boolean;
}

export const folderKey = (mailboxId: string, folder: 'sent' | 'outbox') => `${mailboxId}:${folder}`;

// The id is stamped by the sender's clock and _creationTime by the server's,
// so folders are read a day further back than the stamp in case that clock
// was ahead.
const CLOCK_MARGIN_MS = 24 * 60 * 60 * 1000;

/**
 * The folders that still have to be read further back before the campaign's
 * counts are final. Folders are read newest first, so once a folder has been
 * read back past the moment the campaign started, nothing of it can be left
 * in there. Batches without a time in their id are final only once their
 * folders are fully read.
 */
export function foldersToRead(
  campaign: Pick<Campaign, 'batchId' | 'emails'>,
  progress: Record<string, FolderProgress>,
): string[] {
  const stamped = batchStartedAt(campaign.batchId);
  const started = stamped === null ? null : stamped - CLOCK_MARGIN_MS;
  const keys: string[] = [];
  const mailboxes = new Set(campaign.emails.map((e) => e.mailboxId as string));
  for (const mailboxId of mailboxes) {
    for (const folder of ['sent', 'outbox'] as const) {
      const key = folderKey(mailboxId, folder);
      const p = progress[key];
      if (p?.done) continue;
      if (p && started !== null && p.oldestLoaded !== null && p.oldestLoaded < started) continue;
      keys.push(key);
    }
  }
  return keys;
}

/**
 * The campaigns that can be listed in order so far. A campaign not found yet
 * is older than the point every unfinished folder has reached, so a campaign
 * that started before that point waits until the folders catch up, rather
 * than appearing above newer ones that are still unloaded.
 */
export function listableCampaigns<C extends Pick<Campaign, 'emails'>>(campaigns: C[], progress: Record<string, FolderProgress>): C[] {
  let horizon = -Infinity;
  for (const p of Object.values(progress)) {
    if (!p.done && p.oldestLoaded !== null) horizon = Math.max(horizon, p.oldestLoaded);
  }
  return campaigns.filter((c) => Math.min(...c.emails.map((e) => e._creationTime)) >= horizon);
}
