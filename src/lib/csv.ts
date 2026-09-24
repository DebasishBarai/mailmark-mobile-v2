/**
 * CSV parsing for recipient import, ported from lib/csvParser.ts on the
 * website (quoted fields, escaped quotes, CRLF) so the same file produces
 * the same recipients and merge columns on both clients.
 */

export type ParsedCSV = { headers: string[]; rows: Record<string, string>[] };

export function parseCSV(text: string): ParsedCSV {
  const lines = splitLines(text.replace(/^﻿/, ''));
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseRow(lines[0]).map((h) => h.trim());
  const rows = lines
    .slice(1)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const values = parseRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] ?? '').trim();
      });
      return row;
    });
  return { headers, rows };
}

export function detectEmailColumn(headers: string[], rows: Record<string, string>[]): string | null {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const named = ['email', 'e-mail', 'emailaddress', 'email_address', 'email address', 'mail'];
  for (const h of headers) if (named.includes(h.toLowerCase())) return h;
  let best = '';
  let bestCount = 0;
  for (const h of headers) {
    const n = rows.filter((r) => emailRegex.test(r[h] ?? '')).length;
    if (n > bestCount) {
      bestCount = n;
      best = h;
    }
  }
  return bestCount > 0 ? best : null;
}

function splitLines(text: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += ch;
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function parseRow(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}
