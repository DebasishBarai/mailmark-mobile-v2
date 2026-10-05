/**
 * Mail merge, ported verbatim in behaviour from lib/mergeFields.ts on the
 * website so a campaign personalises identically from either client.
 *
 * Merge fields are written {{Field}}, or {{Field|fallback}} for text to use
 * when a recipient has no value: the same double-brace form the API and the
 * sequence processor use. The older single-brace {Field} / {Field|fallback}
 * is still read, so drafts written before keep working, but nothing writes
 * it any more. Unknown fields without a fallback are left as typed.
 */

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Double braces are tried first so {{Field}} is never read as {Field} inside a
// stray pair of braces.
const MERGE_TOKEN = /\{\{([^{}|]+?)(?:\|([^{}]*?))?\}\}|\{([^{}|]+?)(?:\|([^{}]*?))?\}/g;

/**
 * Calls `replace` for every merge field in `template` and puts back what it
 * returns. `field` is trimmed; `fallback` is undefined when none was written.
 */
export function replaceMergeTokens(
  template: string,
  replace: (field: string, fallback: string | undefined, token: string) => string,
): string {
  return template.replace(
    MERGE_TOKEN,
    (token, doubleField?: string, doubleFallback?: string, singleField?: string, singleFallback?: string) =>
      doubleField !== undefined ? replace(doubleField.trim(), doubleFallback, token) : replace((singleField ?? '').trim(), singleFallback, token),
  );
}

/** The tag to insert for a field: {{Field}}, or {{Field|fallback}}. */
export function mergeTag(field: string, fallback?: string): string {
  return fallback === undefined ? `{{${field}}}` : `{{${field}|${fallback}}}`;
}

export function resolveMergeFields(
  template: string,
  fields: Record<string, string>,
  options?: { escapeValues?: boolean },
): string {
  const out = (value: string) => (options?.escapeValues ? escapeHtml(value) : value);
  return replaceMergeTokens(template, (field, fallback, token) => {
    const value = fields[field];
    if (value !== undefined && value !== '') return out(value);
    if (fallback !== undefined) return out(fallback);
    return token;
  });
}

/**
 * Whether substituted values must be HTML-escaped: in plain text the body is
 * escaped, and rich text is HTML whose text is already escaped, so a value
 * containing "<" would otherwise become live markup. Matches the website.
 */
export function escapesMergeValues(contentType: string): boolean {
  return contentType === 'plain' || contentType === 'rich';
}

export function extractMergeFields(template: string): string[] {
  const fields = new Set<string>();
  replaceMergeTokens(template, (field, _fallback, token) => {
    fields.add(field);
    return token;
  });
  return [...fields];
}
