import { marked } from 'marked';

import { escapeHtml } from '@/lib/merge-fields';
import type { Email } from '@/lib/convex/types';

import { rawEmail } from './address';

export type ContentType = 'plain' | 'markdown' | 'html';

/**
 * Build the HTML body the backend sends, exactly as the website's
 * buildFullBody does: the body in its chosen format, the signature (always
 * Markdown) after a "-- " separator, then any quoted original.
 */
export function buildBody(options: {
  body: string;
  contentType: ContentType;
  signature?: string;
  quote?: string;
}): string {
  const { body, contentType, signature, quote } = options;
  let html: string;
  if (contentType === 'markdown') html = marked.parse(body, { async: false }) as string;
  else if (contentType === 'html') html = body;
  else html = escapeHtml(body).replace(/\n/g, '<br>');

  const signaturePart = signature?.trim() ? `<br><br>-- <br>${marked.parse(signature, { async: false }) as string}` : '';
  const quotePart = quote ? `<br><br>${quote}` : '';
  return html + signaturePart + quotePart;
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

export function replySubject(subject: string): string {
  return /^re:/i.test(subject.trim()) ? subject : `Re: ${subject}`;
}

export function forwardSubject(subject: string): string {
  return /^(fwd?|fw):/i.test(subject.trim()) ? subject : `Fwd: ${subject}`;
}

export function replyQuote(email: Email, bodyHtml: string): string {
  return `<blockquote style="margin:0 0 0 .8ex;border-left:2px solid #ccc;padding-left:1ex;"><p><strong>On ${new Date(
    email.date,
  ).toLocaleString()}, ${escapeHtml(email.from)} wrote:</strong></p>${bodyHtml}</blockquote>`;
}

export function forwardQuote(email: Email, bodyHtml: string): string {
  return `<p>---------- Forwarded message ----------</p><p>From: ${escapeHtml(email.from)}<br>Date: ${new Date(
    email.date,
  ).toLocaleString()}<br>Subject: ${escapeHtml(email.subject)}<br>To: ${escapeHtml(email.to.join(', '))}</p><br>${bodyHtml}`;
}

/**
 * Reply-all recipients, as the website computes them: the sender and every
 * To address, then the original Cc list, matched case-insensitively,
 * de-duplicated across both, and never including this mailbox itself.
 */
export function replyAllRecipients(email: Email, myAddress: string): { to: string[]; cc: string[] } {
  const seen = new Set<string>([myAddress.toLowerCase()]);
  const collect = (addresses: string[]) => {
    const out: string[] = [];
    for (const addr of addresses) {
      const raw = rawEmail(addr);
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(raw);
    }
    return out;
  };
  const to = collect([email.from, ...email.to]);
  const cc = collect(email.cc ?? []);
  return { to, cc };
}

/** Remove Mailmark's own open-tracking pixel so viewing sent mail does not count as an open. */
export function stripTrackingPixel(html: string): string {
  return html.replace(/<img[^>]*src="[^"]*\/track\/open\/[^"]*"[^>]*\/?>/gi, '');
}

/** Plain-text preview of an HTML body, for snippets and notifications. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
