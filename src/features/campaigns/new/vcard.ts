import { isValidEmail } from '@/lib/email/address';

import { mergeRecipients, type MergeRecipient } from './draft';
import { withFirstName } from './first-name';

/**
 * Phone contacts exported as a .vcf file (iPhone: Contacts, select, Export;
 * Android: Contacts, Settings, Export), read into recipients with their
 * names. Ported from parseVCards in the website's lib/campaign/vcard.ts and
 * checked against its tests.
 *
 * Handles vCard 2.1, 3.0 and 4.0: folded lines, grouped properties
 * ("item1.EMAIL"), escaped characters, and the quoted-printable names older
 * Android phones write. A contact with several addresses is added once, by
 * its preferred address or else its first; a contact with none is counted
 * and skipped.
 */

export type VCardResult = {
  recipients: MergeRecipient[];
  /** Contacts in the file. */
  contacts: number;
  /** Contacts skipped because they have no email address. */
  withoutEmail: number;
};

export function isVCard(text: string): boolean {
  return /^\s*BEGIN:VCARD\s*$/im.test(text);
}

type Property = {
  name: string;
  params: string[];
  value: string;
};

// Joins the lines a vCard folds: 3.0 and 4.0 continue a line with a leading
// space or tab, and 2.1 quoted-printable values end a line with "=".
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    const last = lines.length - 1;
    if (last >= 0 && /^[ \t]/.test(line)) {
      lines[last] += line.slice(1);
    } else if (last >= 0 && /QUOTED-PRINTABLE/i.test(lines[last].split(':')[0]) && lines[last].endsWith('=')) {
      lines[last] = lines[last].slice(0, -1) + line;
    } else {
      lines.push(line);
    }
  }
  return lines;
}

function parseLine(line: string): Property | null {
  const colon = line.indexOf(':');
  if (colon <= 0) return null;
  const [head, ...params] = line.slice(0, colon).split(';');
  // "item1.EMAIL" is a grouped EMAIL.
  const name = head.split('.').pop()!.trim().toUpperCase();
  return { name, params: params.map((p) => p.trim().toUpperCase()), value: line.slice(colon + 1) };
}

// The website decodes the bytes with TextDecoder; this reads them as UTF-8
// through decodeURIComponent instead, which every JavaScript engine has, and
// falls back to one character per byte when they are not UTF-8 (an old
// phone's ISO-8859-1 export).
function decodeQuotedPrintable(value: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    const hex = value.slice(i + 1, i + 3);
    if (value[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(parseInt(hex, 16));
      i += 2;
    } else {
      bytes.push(value.charCodeAt(i) & 0xff);
    }
  }
  try {
    return decodeURIComponent(bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''));
  } catch {
    return String.fromCharCode(...bytes);
  }
}

// The value with any quoted-printable encoding undone, still escaped.
function rawValue(p: Property): string {
  return p.params.some((x) => x === 'QUOTED-PRINTABLE' || x === 'ENCODING=QUOTED-PRINTABLE') ? decodeQuotedPrintable(p.value) : p.value;
}

function unescapeText(value: string): string {
  return value.replace(/\\([\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? ' ' : c));
}

function textValue(p: Property): string {
  return unescapeText(rawValue(p));
}

// "N" is "Last;First;Middle;Prefix;Suffix", with unescaped ";" separating.
function nameFromN(value: string): string {
  const parts: string[] = [''];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && i + 1 < value.length) {
      parts[parts.length - 1] += value[i] + value[i + 1];
      i++;
    } else if (value[i] === ';') {
      parts.push('');
    } else {
      parts[parts.length - 1] += value[i];
    }
  }
  for (let i = 0; i < parts.length; i++) parts[i] = unescapeText(parts[i]).trim();
  return [parts[1], parts[0]].filter(Boolean).join(' ');
}

function isPreferred(p: Property): boolean {
  return p.params.some((x) => x === 'PREF' || /^PREF=1$/.test(x) || (/^TYPE=/.test(x) && /\bPREF\b/.test(x)));
}

export function parseVCards(text: string): VCardResult {
  const out: MergeRecipient[] = [];
  let contacts = 0;
  let withoutEmail = 0;
  let card: Property[] | null = null;

  for (const line of unfold(text)) {
    if (/^BEGIN:VCARD\s*$/i.test(line.trim())) {
      card = [];
      continue;
    }
    if (/^END:VCARD\s*$/i.test(line.trim())) {
      if (card) {
        contacts++;
        const emails = card.filter((p) => p.name === 'EMAIL').map((p) => ({ p, email: textValue(p).trim().replace(/^mailto:/i, '') }));
        const usable = emails.filter((e) => isValidEmail(e.email));
        const chosen = usable.find((e) => isPreferred(e.p)) ?? usable[0];
        if (!chosen) {
          withoutEmail++;
        } else {
          const fn = card.find((p) => p.name === 'FN');
          const n = card.find((p) => p.name === 'N');
          const raw = (fn ? textValue(fn) : '') || (n ? nameFromN(rawValue(n)) : '');
          const name = raw.replace(/\s+/g, ' ').trim().slice(0, 100);
          // Something with no letters (a phone number saved as the name) is not a name.
          const fields: Record<string, string> = name && /\p{L}/u.test(name) ? { email: chosen.email, name } : { email: chosen.email };
          out.push({ email: chosen.email, fields: withFirstName(fields) });
        }
      }
      card = null;
      continue;
    }
    if (!card) continue;
    const p = parseLine(line);
    if (p) card.push(p);
  }

  return { recipients: mergeRecipients([], out), contacts, withoutEmail };
}
