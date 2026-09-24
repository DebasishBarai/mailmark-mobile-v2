import { WebLinks } from '@/lib/config';
import { detectEmailColumn, parseCSV } from '@/lib/csv';
import { isValidEmail, scanEmails } from '@/lib/email/address';

import type { MergeRecipient } from './draft';

export type ImportResult =
  | { ok: true; recipients: MergeRecipient[]; columns: string[]; emailColumn: string | null; skipped: number }
  | { ok: false; error: string };

/**
 * Same interpretation of a CSV as the website's processImportedCSV: a file
 * with a header row and several columns becomes a mail merge (every column is
 * a merge field); anything else is scanned for addresses.
 */
export function interpretCsv(text: string): ImportResult {
  const parsed = parseCSV(text);
  if (parsed.headers.length > 1 && parsed.rows.length > 0) {
    const emailColumn = detectEmailColumn(parsed.headers, parsed.rows);
    if (!emailColumn) return { ok: false, error: 'No email column detected in the CSV.' };
    const valid = parsed.rows.filter((row) => isValidEmail(row[emailColumn] ?? ''));
    if (valid.length === 0) return { ok: false, error: 'No valid email addresses found.' };
    return {
      ok: true,
      recipients: valid.map((row) => ({ email: row[emailColumn].trim(), fields: { ...row } })),
      columns: parsed.headers,
      emailColumn,
      skipped: parsed.rows.length - valid.length,
    };
  }
  const emails = scanEmails(text);
  if (emails.length === 0) return { ok: false, error: 'No email addresses found.' };
  return { ok: true, recipients: emails.map((email) => ({ email, fields: { email } })), columns: [], emailColumn: null, skipped: 0 };
}

/**
 * Fetch a Google Sheet (or any public CSV URL) through the website's
 * /api/fetch-csv route, which turns a sheet link into its CSV export and
 * explains sharing problems, exactly as the web campaign importer does.
 */
export async function fetchSheet(url: string): Promise<string> {
  const res = await fetch(`${WebLinks.csvProxy}?url=${encodeURIComponent(url.trim())}`);
  if (!res.ok) {
    let message = 'Could not fetch the sheet. Make sure it is shared as "Anyone with the link".';
    try {
      const data = await res.json();
      message = data?.error?.message ?? data?.message ?? data?.error ?? message;
    } catch {
      // not JSON
    }
    throw new Error(typeof message === 'string' ? message : 'Could not fetch the sheet.');
  }
  return await res.text();
}
