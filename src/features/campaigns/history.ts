import type { Email, Sequence } from '@/lib/convex/types';

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

// Not 'accent': the brand accent is red, so an open would read as a problem.
export type RecipientTone = 'muted' | 'success' | 'info' | 'danger';

const BLOCK_TEXT: Record<string, string> = {
  suppressed_hard_bounce: 'an earlier email to this address bounced back',
  suppressed_complaint: 'they marked an earlier email as spam',
  suppressed_manual: 'it is on your do-not-email list',
  unsubscribed: 'they unsubscribed',
  invalid_address: 'this address does not exist',
  disposable_address: 'it is a temporary throwaway address',
  catch_all_blocked: 'we could not confirm this address exists',
  unknown_blocked: 'we could not confirm this address exists',
  malformed_address: 'it is not a complete email address',
  verifier_unavailable: 'we could not check the address at the time',
  verifier_not_configured: 'we could not check the address at the time',
  sending_paused: 'sending was paused',
  account_suspended: 'sending was paused on this account',
  awaiting_verification: 'we were still checking the address',
};

function bounceText(e: Pick<Email, 'bounceType' | 'bounceSubType'>): string {
  if (e.bounceType === 'Transient') {
    return e.bounceSubType === 'MailboxFull' ? 'their mailbox is full' : 'their email server turned it away for now';
  }
  if (e.bounceSubType === 'Suppressed' || e.bounceSubType === 'OnAccountSuppressionList') return 'an earlier email to this address bounced back';
  if (e.bounceType === 'Permanent') return 'this address does not exist';
  return 'their email server turned it away';
}

function day(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** What happened to one customer's message, in words for the owner. Same wording as the website. */
export function recipientStatus(e: Email): { label: string; tone: RecipientTone } {
  if (e.folder === 'outbox') return { label: e.scheduledAt ? `Scheduled for ${day(e.scheduledAt)}` : 'Scheduled', tone: 'muted' };
  switch (e.deliveryStatus) {
    case 'blocked':
      return { label: `Not sent: ${BLOCK_TEXT[e.blockReason ?? ''] ?? 'this address cannot get email from you'}`, tone: 'danger' };
    case 'bounced':
      return { label: `Didn't arrive: ${bounceText(e)}`, tone: 'danger' };
    case 'failed':
      return { label: "Didn't arrive: sending failed", tone: 'danger' };
    case 'complained':
      return { label: 'Marked it as spam', tone: 'danger' };
  }
  if (e.repliedAt) return { label: `Replied ${day(e.repliedAt)}`, tone: 'success' };
  if ((e.clickedLinks?.length ?? 0) > 0) return { label: 'Clicked a link', tone: 'success' };
  if (e.openedAt) return { label: `Opened ${day(e.openedAt)}`, tone: 'info' };
  if (e.deliveryStatus === 'delivered') return { label: 'Delivered, not opened yet', tone: 'muted' };
  return { label: 'On its way', tone: 'muted' };
}
