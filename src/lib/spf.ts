/**
 * The SPF value to publish when a domain already has an SPF record, ported
 * verbatim in behaviour from lib/spf.ts on the website so both clients show
 * the same value.
 *
 * A domain may only carry one SPF record. Publishing a second one, which is
 * what an owner does when told to "add" ours next to the one their Google
 * Workspace or Microsoft 365 setup already put there, makes SPF fail for both
 * senders. The fix is to edit the existing record and add our include to it.
 *
 * The include goes straight after the version tag so it is evaluated before
 * the record's own `all` mechanism or `redirect` modifier.
 *
 * Returns the existing value unchanged when it already includes `include`, and
 * null when `existing` is not an SPF record at all.
 */
export function mergeSpfInclude(existing: string, include = 'include:amazonses.com'): string | null {
  const terms = existing.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0 || terms[0].toLowerCase() !== 'v=spf1') return null;

  const wanted = include.toLowerCase();
  if (terms.some((t) => t.toLowerCase() === wanted)) return terms.join(' ');

  return [terms[0], include, ...terms.slice(1)].join(' ');
}
