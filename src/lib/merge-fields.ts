/**
 * Mail merge, ported verbatim in behaviour from lib/mergeFields.ts on the
 * website so a campaign personalises identically from either client:
 * {Field} is replaced by the recipient's value, {Field|fallback} uses the
 * fallback when the value is empty, and unknown fields are left as typed.
 */

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function resolveMergeFields(
  template: string,
  fields: Record<string, string>,
  options?: { escapeValues?: boolean },
): string {
  const out = (value: string) => (options?.escapeValues ? escapeHtml(value) : value);
  return template.replace(/\{([^{}|]+?)(?:\|([^{}]*?))?\}/g, (match, fieldName: string, fallback?: string) => {
    const value = fields[fieldName.trim()];
    if (value !== undefined && value !== '') return out(value);
    if (fallback !== undefined) return out(fallback);
    return match;
  });
}

export function extractMergeFields(template: string): string[] {
  const regex = /\{([^{}|]+?)(?:\|[^{}]*?)?\}/g;
  const fields = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) fields.add(match[1].trim());
  return [...fields];
}

/**
 * Follow-up steps are personalised by the backend's sequence processor, which
 * substitutes {{key}} (word characters only) and nothing else. Rewrite the
 * {Field} tokens people write everywhere else into that form so follow-ups
 * personalise too. Tokens it cannot express (spaces, fallbacks) are reported.
 */
export function toSequenceTemplate(template: string): { text: string; unsupported: string[] } {
  const unsupported: string[] = [];
  const text = template.replace(/\{\{\w+\}\}|\{([^{}|]+?)(?:\|([^{}]*?))?\}/g, (match, field: string | undefined, fallback?: string) => {
    if (field === undefined) return match; // already {{key}}
    const name = field.trim();
    if (!/^\w+$/.test(name) || fallback !== undefined) {
      unsupported.push(match);
      return /^\w+$/.test(name) ? `{{${name}}}` : match;
    }
    return `{{${name}}}`;
  });
  return { text, unsupported };
}
