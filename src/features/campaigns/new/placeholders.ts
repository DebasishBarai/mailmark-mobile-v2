/**
 * The [placeholders] still waiting to be filled in, such as "[phone number]"
 * in a template, in the order they appear. Ported from the website's
 * findUnfilledPlaceholders; sending is blocked while any remain.
 *
 * `body` may be rich-text HTML, Markdown or plain text: tags are ignored so a
 * placeholder the editor split across formatting is still found, and a
 * Markdown link's "[text](url)" is not a placeholder.
 */

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

function textOf(body: string): string {
  return body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m);
}

export function findUnfilledPlaceholders(subject: string, body: string): string[] {
  const found = `${subject}\n${textOf(body)}`.match(/\[[^[\]\n]{1,80}\](?!\()/g) ?? [];
  return [...new Set(found)];
}
