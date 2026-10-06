import { plainToHtml } from '@/lib/email/format';

/**
 * Ready-made campaigns for small service businesses, the same three as the
 * website's New campaign page (lib/campaign/templates.ts), word for word.
 *
 * Written as plain text and turned into rich-text HTML, so a template looks
 * exactly as if the owner had typed it. {{firstName|there}} reads "there"
 * when no name is known. Anything in [square brackets] is for the owner to
 * fill in, and the Review step will not send while any remain (see
 * placeholders.ts).
 */
export type CampaignTemplate = {
  id: string;
  name: string;
  description: string;
  subject: string;
  /** Plain text; `%BUSINESS%` is replaced by the sender's business name. */
  text: string;
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'review-request',
    name: 'Review request after a job',
    description: 'Ask a happy customer for a Google review.',
    subject: 'How did we do, {{firstName|there}}?',
    text: [
      'Hi {{firstName|there}},',
      '',
      'Thanks for choosing %BUSINESS% for your recent job. If you were happy with the work, would you take 30 seconds to leave us a review? It really helps a small local business like ours.',
      '',
      '[Paste your Google review link here]',
      '',
      "If anything wasn't right, just reply to this email and we'll make it right.",
      '',
      'Thanks,',
      '%BUSINESS%',
    ].join('\n'),
  },
  {
    id: 'seasonal-reminder',
    name: 'Seasonal reminder',
    description: "Remind past customers it's time for seasonal work.",
    subject: 'Time for your [winter] check-up, {{firstName|there}}',
    text: [
      'Hi {{firstName|there}},',
      '',
      'Cold weather is on the way. A quick check now can save you from frozen pipes and costly repairs later.',
      '',
      "We're booking [winterization visits] for [November]. Reply to this email or call us at [phone number] to grab a spot.",
      '',
      'Thanks,',
      '%BUSINESS%',
    ].join('\n'),
  },
  {
    id: 'back-for-spring',
    name: "We're back for spring",
    description: "Let customers know you're booking again.",
    subject: "We're back for spring, {{firstName|there}}!",
    text: [
      'Hi {{firstName|there}},',
      '',
      "Spring is here and we're booking jobs again. If you need [lawn care, gutter cleaning or a roof check], now is a great time to get on the schedule before things fill up.",
      '',
      'Reply to this email or call [phone number] to book.',
      '',
      'Thanks,',
      '%BUSINESS%',
    ].join('\n'),
  },
];

/** The template's subject and rich-text body, with the business name filled in. */
export function renderTemplate(template: CampaignTemplate, businessName: string): { subject: string; body: string } {
  const name = businessName.trim() || '[Your business name]';
  return {
    subject: template.subject.split('%BUSINESS%').join(name),
    body: plainToHtml(template.text.split('%BUSINESS%').join(name)),
  };
}
