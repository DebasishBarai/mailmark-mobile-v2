/** Address helpers shared by the list, the reader and compose. */

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const EMAIL_SCAN_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** "Ada <ada@x.com>" -> "ada@x.com"; a bare address is returned as is. */
export function rawEmail(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return (match ? match[1] : value).trim();
}

/** The name inside a "Name <address>" header, if it has one. */
export function headerName(value: string): string | null {
  const match = value.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) return null;
  const name = match[1].trim().replace(/^["']|["']$/g, '');
  return name || null;
}

export type NameMaps = {
  /** The user's own mailboxes, by lowercase address. Always wins. */
  own?: Map<string, string>;
  /** Names learned into the address book, by lowercase address. */
  contacts?: Map<string, string>;
};

/**
 * Same precedence as getDisplayName on the website: the user's own mailbox
 * names first (other people's headers cannot rename you), then the header's
 * own name, then the address book, then the local part.
 */
export function displayName(value: string, maps: NameMaps = {}): string {
  const address = rawEmail(value).toLowerCase();
  const own = maps.own?.get(address);
  if (own) return own;
  const fromHeader = headerName(value);
  if (fromHeader) return fromHeader;
  const contact = maps.contacts?.get(address);
  if (contact) return contact;
  const at = address.indexOf('@');
  return at > 0 ? address.slice(0, at) : address;
}

/** Every address in a blob of text (CSV, pasted list), de-duplicated. */
export function scanEmails(text: string): string[] {
  return [...new Set(text.match(EMAIL_SCAN_RE) ?? [])];
}

/** Split typed input on commas, semicolons, spaces and newlines. */
export function splitAddresses(input: string): string[] {
  return input
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Subject with reply/forward prefixes removed, for grouping a conversation. */
export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(\s*(re|fw|fwd|aw|sv|wg)\s*(\[\d+\])?\s*:\s*)+/i, '')
    .trim()
    .toLowerCase();
}
