import type { Email } from '@/lib/convex/types';
import type { ContentType } from '@/lib/email/compose';
import { local } from '@/lib/storage';

import type { MergeRecipient } from './new/draft';

/**
 * "Send again to people who didn't open", ported from the website's
 * lib/campaign/sendAgain.ts and checked against its tests.
 *
 * Each customer's copy is stored already personalised ("Hi John"), with
 * tracked links and the unsubscribe footer added, so a sent copy cannot be
 * the message. The message as written comes, in order, from this device,
 * which keeps it when the New campaign flow sends, or from the campaign's
 * follow-up sequence, whose first step is the message with its merge fields
 * and signature. Otherwise the owner writes it again.
 */

const PROBLEMS = new Set(['bounced', 'failed', 'blocked', 'complained']);

/**
 * Who it goes to: sent, not opened, clicked or replied, and nothing wrong with
 * the address. Bounces, unsubscribes, refusals and spam reports are left out.
 */
export function notOpenedEmails(emails: Email[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    if (e.folder === 'outbox' || PROBLEMS.has(e.deliveryStatus ?? '')) continue;
    if (e.openedAt || e.repliedAt || (e.clickedLinks?.length ?? 0) > 0) continue;
    const address = e.to[0];
    if (!address || seen.has(address.toLowerCase())) continue;
    seen.add(address.toLowerCase());
    out.push(address);
  }
  return out;
}

/** The signature every sender adds after the message. */
const SIGNATURE_SEPARATOR = '<br><br>-- <br>';

/** Splits a message as written into the message and whether a signature followed it. */
export function splitSignature(html: string): { body: string; includeSignature: boolean } {
  const at = html.lastIndexOf(SIGNATURE_SEPARATOR);
  return at >= 0 ? { body: html.slice(0, at), includeSignature: true } : { body: html, includeSignature: false };
}

/**
 * Recipients for the new campaign. Known fields (names, CSV columns) come
 * along so {{firstName}} still works; the follow-up processor's own mmk_ keys
 * are left out.
 */
export function sendAgainRecipients(emails: string[], fieldsByEmail: Record<string, Record<string, unknown>> = {}): MergeRecipient[] {
  return emails.map((email) => {
    const known = fieldsByEmail[email.toLowerCase()] ?? {};
    const fields: Record<string, string> = {};
    for (const [k, v] of Object.entries(known)) {
      if (k.startsWith('mmk_') || typeof v !== 'string') continue;
      fields[k] = v;
    }
    fields.email = email;
    return { email, fields };
  });
}

/** The field names the recipients carry, offered as merge fields. */
export function recipientColumns(recipients: MergeRecipient[]): string[] {
  const seen = new Set<string>();
  for (const r of recipients) for (const k of Object.keys(r.fields)) if (k !== 'email') seen.add(k);
  return [...seen];
}

export type RememberedMessage = {
  subject: string;
  body: string;
  contentType: ContentType;
  includeSignature: boolean;
  /** Each customer's fields by lower-case address, when small enough to keep. */
  fields?: Record<string, Record<string, string>>;
  savedAt: number;
};

const STORAGE_KEY = 'campaignMessages.v1';
const KEEP = 20;
const MAX_FIELDS_CHARS = 1_000_000;

/** Keeps a campaign's message as written, for "Send again". Never throws. */
export async function rememberCampaignMessage(
  batchId: string,
  message: { subject: string; body: string; contentType: ContentType; includeSignature: boolean; recipients: MergeRecipient[] },
  now: number,
): Promise<void> {
  try {
    const fields: Record<string, Record<string, string>> = {};
    for (const r of message.recipients) {
      const extra = Object.fromEntries(Object.entries(r.fields).filter(([k]) => k !== 'email'));
      if (Object.keys(extra).length > 0) fields[r.email.toLowerCase()] = extra;
    }
    const keepFields = JSON.stringify(fields).length <= MAX_FIELDS_CHARS;
    const all = await local.get<Record<string, RememberedMessage>>(STORAGE_KEY, {});
    all[batchId] = {
      subject: message.subject,
      body: message.body,
      contentType: message.contentType,
      includeSignature: message.includeSignature,
      ...(keepFields ? { fields } : {}),
      savedAt: now,
    };
    const newest = Object.entries(all)
      .sort(([, a], [, b]) => b.savedAt - a.savedAt)
      .slice(0, KEEP);
    await local.set(STORAGE_KEY, Object.fromEntries(newest));
  } catch {
    // Storage full or unavailable: Send again falls back to the other sources.
  }
}

export async function recallCampaignMessage(batchId: string): Promise<RememberedMessage | null> {
  const all = await local.get<Record<string, RememberedMessage>>(STORAGE_KEY, {});
  const found = all && typeof all === 'object' ? all[batchId] : undefined;
  return found && typeof found.body === 'string' && typeof found.subject === 'string' ? found : null;
}
