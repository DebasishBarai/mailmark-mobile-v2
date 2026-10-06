import { CAMPAIGN_TEMPLATES } from './templates';

/**
 * The templates' [placeholders] still waiting to be filled in, such as
 * "[phone number]", in the order they appear. Ported from the website's
 * findUnfilledPlaceholders; sending is blocked while any remain.
 *
 * Only the templates' own placeholders count. Brackets the owner typed on
 * purpose, like "[Reminder] Gutter cleaning", are theirs to send.
 *
 * `body` may be rich-text HTML, Markdown or plain text: tags are ignored so a
 * placeholder the editor split across formatting is still found.
 */

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function textOf(body: string): string {
  return body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

const PLACEHOLDER = /\[[^[\]\n]{1,80}\]/g;

// Case and spacing don't matter: "[Phone  Number]" is still the template's.
const normalise = (p: string) => p.replace(/\s+/g, ' ').trim().toLowerCase();

/** Every placeholder the templates ship with, plus the one used when the mailbox has no business name. */
const TEMPLATE_PLACEHOLDERS = new Set(
  [...CAMPAIGN_TEMPLATES.flatMap((t) => `${t.subject}\n${t.text}`.match(PLACEHOLDER) ?? []), '[Your business name]'].map(normalise),
);

export function findUnfilledPlaceholders(subject: string, body: string): string[] {
  const found = (`${subject}\n${textOf(body)}`.match(PLACEHOLDER) ?? []).filter((p) => TEMPLATE_PLACEHOLDERS.has(normalise(p)));
  return [...new Set(found)];
}
