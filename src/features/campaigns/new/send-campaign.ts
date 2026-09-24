import type { ReactAction } from 'convex/react';

import type { api } from '@/lib/convex/api';
import { errorMessage } from '@/lib/convex/errors';
import type { Id, Mailbox, SequenceStep } from '@/lib/convex/types';
import { buildBody } from '@/lib/email/compose';
import { escapeHtml, resolveMergeFields, toSequenceTemplate } from '@/lib/merge-fields';

import type { CampaignDraft } from './draft';

export type SendProgress = { done: number; total: number; failed: { email: string; reason: string }[] };

type Actions = {
  sendEmail: ReactAction<typeof api.ses.sendEmail>;
  scheduleEmail: ReactAction<typeof api.ses.scheduleEmail>;
  createSequence: ReactAction<typeof api.sequences.createAndEnrollWithFirstSent>;
};

const CONCURRENCY = 3;

export function newBatchId() {
  return `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function followUpHtml(body: string): string {
  return /<\s*(p|div|br|table|a|span|h\d)\b/i.test(body) ? body : escapeHtml(body).replace(/\n/g, '<br>');
}

/**
 * Send a campaign exactly as the website's handleSendCampaign /
 * handleScheduleCampaign do: one message per recipient sharing a batchId,
 * personalised with {Field} merge values (HTML-escaped for plain text), then
 * a follow-up sequence enrolling everyone if follow-ups were written.
 *
 * Unlike the website loop, one refused recipient does not abandon the rest:
 * failures are collected and reported, since on a phone the person may not
 * be watching every second of a long send.
 */
export async function sendCampaign(
  draft: CampaignDraft,
  mailbox: Mailbox,
  actions: Actions,
  options: { scheduledAt?: number; batchId: string; onProgress: (p: SendProgress) => void; isCancelled: () => boolean },
): Promise<SendProgress> {
  const body = buildBody({
    body: draft.body,
    contentType: draft.contentType,
    signature: draft.includeSignature ? mailbox.signature : undefined,
  });
  const progress: SendProgress = { done: 0, total: draft.recipients.length, failed: [] };
  const queue = [...draft.recipients];

  const worker = async () => {
    while (queue.length > 0 && !options.isCancelled()) {
      const recipient = queue.shift()!;
      const subject = resolveMergeFields(draft.subject, recipient.fields);
      const html = resolveMergeFields(body, recipient.fields, { escapeValues: draft.contentType === 'plain' });
      try {
        if (options.scheduledAt) {
          await actions.scheduleEmail({
            mailboxId: mailbox._id,
            to: [recipient.email],
            subject,
            body: html,
            scheduledAt: options.scheduledAt,
            batchId: options.batchId,
          });
        } else {
          await actions.sendEmail({
            mailboxId: mailbox._id,
            to: [recipient.email],
            subject,
            body: html,
            folder: 'sent',
            batchId: options.batchId,
          });
        }
      } catch (err) {
        progress.failed.push({ email: recipient.email, reason: errorMessage(err, 'Not sent') });
      }
      progress.done += 1;
      options.onProgress({ ...progress, failed: [...progress.failed] });
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

  if (draft.followUps.length > 0 && !options.isCancelled()) {
    const failed = new Set(progress.failed.map((f) => f.email.toLowerCase()));
    const steps: SequenceStep[] = [{ type: 'send_email', subject: draft.subject, html: body }];
    for (const fu of draft.followUps) {
      steps.push({ type: 'delay', delayMs: fu.delayDays * 86_400_000 });
      steps.push({
        type: 'send_email',
        subject: toSequenceTemplate(fu.subject).text,
        html: toSequenceTemplate(followUpHtml(fu.body)).text,
      });
    }
    const contacts = draft.recipients
      .filter((r) => !failed.has(r.email.toLowerCase()))
      .map((r) => ({ email: r.email, mergeFields: r.fields }));
    if (contacts.length > 0) {
      await actions.createSequence({
        mailboxId: mailbox._id,
        domainId: mailbox.domainId as Id<'domains'>,
        name: `Follow-up: ${draft.subject.slice(0, 50)}`,
        steps,
        contacts,
      });
    }
  }

  return progress;
}

