import type { SequenceStep } from '@/lib/convex/types';
import { escapeHtml, replaceMergeTokens } from '@/lib/merge-fields';

import type { FollowUpStep, MergeRecipient } from './draft';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A follow-up body as HTML. The follow-up boxes are plain text, so line breaks
 * become <br> and the text is escaped; a body that already contains markup is
 * taken as HTML and left alone.
 */
export function followUpHtml(body: string): string {
  return /<\s*(p|div|br|table|a|span|h\d)\b/i.test(body) ? body : escapeHtml(body).replace(/\r?\n/g, '<br>');
}

/**
 * Builds a campaign's follow-up sequence so follow-ups personalise exactly as
 * the first email does. Ported verbatim in behaviour from
 * lib/campaign/followUps.ts on the website.
 *
 * Owners write {{firstName|there}} or {{Job Type}} here as everywhere else,
 * but the sequence processor only fills {{key}} for one-word keys, with no
 * fallbacks and no HTML escaping. So each distinct token becomes its own
 * {{mmk_N}} key and every contact carries that key already resolved: their
 * value, else the fallback, else nothing. Body values are HTML-escaped and
 * subject values are not, so they get separate keys.
 *
 * Delays count from enrollment, which happens when the campaign is sent or
 * scheduled, so for a scheduled campaign `startAt` pushes the first delay back
 * by the wait and follow-ups count from the real send.
 */
export function buildFollowUpSequence(input: {
  firstSubject: string;
  firstHtml: string;
  followUps: FollowUpStep[];
  recipients: MergeRecipient[];
  startAt?: number;
  now?: number;
}): { steps: SequenceStep[]; contacts: { email: string; mergeFields: Record<string, string> }[] } {
  const keys = new Map<string, { key: string; field: string; fallback?: string; html: boolean }>();
  const convert = (template: string, html: boolean) =>
    replaceMergeTokens(template, (field, fallback) => {
      const id = `${html ? 'b' : 's'}|${field}|${fallback ?? ''}|${fallback !== undefined}`;
      let entry = keys.get(id);
      if (!entry) {
        entry = { key: `mmk_${keys.size}`, field, fallback, html };
        keys.set(id, entry);
      }
      return `{{${entry.key}}}`;
    });

  const steps: SequenceStep[] = [{ type: 'send_email', subject: input.firstSubject, html: input.firstHtml }];
  const wait = input.startAt ? Math.max(0, input.startAt - (input.now ?? Date.now())) : 0;
  input.followUps.forEach((fu, i) => {
    steps.push({ type: 'delay', delayMs: fu.delayDays * DAY_MS + (i === 0 ? wait : 0) });
    steps.push({ type: 'send_email', subject: convert(fu.subject, false), html: convert(followUpHtml(fu.body), true) });
  });

  const contacts = input.recipients.map((r) => {
    const mergeFields: Record<string, string> = { ...r.fields };
    for (const { key, field, fallback, html } of keys.values()) {
      const value = r.fields[field];
      // A fallback in the body is already HTML; a recipient's value is not yet.
      if (value !== undefined && value !== '') mergeFields[key] = html ? escapeHtml(value) : value;
      else mergeFields[key] = fallback ?? '';
    }
    return { email: r.email, mergeFields };
  });

  return { steps, contacts };
}
