import { render } from 'dom-serializer';
import { isTag, isText, type AnyNode, type Element, type ParentNode } from 'domhandler';
import { parseDocument } from 'htmlparser2';
import { marked } from 'marked';

import { escapeHtml } from '@/lib/merge-fields';

/**
 * Formatting for the composer, ported from lib/composeFormat.ts on the
 * website so a message converts and formats identically from either client.
 * The website walks the browser DOM; the app has no DOM outside a web view,
 * so the same walk runs over an htmlparser2 tree here.
 */

// Formats the composer writes in. "rich" is a WYSIWYG editor whose value is
// HTML; the others are typed as source.
export type ComposeFormat = 'rich' | 'plain' | 'markdown' | 'html';

export const FORMAT_LABELS: Record<ComposeFormat, string> = {
  rich: 'Rich text',
  plain: 'Plain text',
  markdown: 'Markdown',
  html: 'HTML',
};

// ---------------------------------------------------------------------------
// Font choices shared by the rich editor and the source modes
// ---------------------------------------------------------------------------

export const FONT_FAMILIES: { label: string; value: string }[] = [
  { label: 'Sans Serif', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Serif', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Fixed Width', value: "'Courier New', Courier, monospace" },
  { label: 'Wide', value: "'Arial Black', Arial, sans-serif" },
  { label: 'Narrow', value: "'Arial Narrow', Arial, sans-serif" },
  { label: 'Garamond', value: "Garamond, 'Times New Roman', serif" },
  { label: 'Tahoma', value: 'Tahoma, Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: "'Trebuchet MS', Arial, sans-serif" },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
];

export const FONT_SIZES: { label: string; value: string }[] = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '14px' },
  { label: 'Large', value: '18px' },
  { label: 'Huge', value: '32px' },
];

export const TEXT_COLORS: { label: string; value: string }[] = [
  { label: 'Black', value: '#000000' },
  { label: 'Dark gray', value: '#444444' },
  { label: 'Gray', value: '#888888' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Yellow', value: '#ca8a04' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Teal', value: '#0891b2' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Pink', value: '#db2777' },
];

// Legacy <font size="1..7"> values, mapped to pixels.
export const LEGACY_FONT_SIZES: Record<string, string> = {
  '1': '10px', '2': '13px', '3': '16px', '4': '18px', '5': '24px', '6': '32px', '7': '48px',
};

// ---------------------------------------------------------------------------
// Source editing (Markdown and HTML modes)
// ---------------------------------------------------------------------------

// A single replacement to apply to the source text, plus the selection after.
export type TextEdit = {
  from: number;
  to: number;
  insert: string;
  selStart: number;
  selEnd: number;
};

export function applyEdit(value: string, edit: TextEdit): string {
  return value.slice(0, edit.from) + edit.insert + value.slice(edit.to);
}

function runLength(value: string, pos: number, ch: string, dir: -1 | 1): number {
  let n = 0;
  let i = dir === -1 ? pos - 1 : pos;
  while (i >= 0 && i < value.length && value[i] === ch) {
    n++;
    i += dir;
  }
  return n;
}

// `*` must not unwrap `**bold**`, but does unwrap the italic half of `***x***`.
function runMatches(marker: string, run: number): boolean {
  if (marker === '*') return run % 2 === 1;
  return run >= marker.length;
}

function isRepeatedChar(marker: string): boolean {
  return marker.length > 0 && [...marker].every((c) => c === marker[0]);
}

/**
 * Wrap the selection in `before`/`after`, or unwrap it when it is already
 * wrapped. Whitespace at the edges stays outside, since `** x **` is not bold.
 */
export function toggleWrap(value: string, start: number, end: number, before: string, after: string): TextEdit {
  let s = Math.min(start, end);
  let e = Math.max(start, end);
  while (s < e && /\s/.test(value[s])) s++;
  while (e > s && /\s/.test(value[e - 1])) e--;
  const selected = value.slice(s, e);
  const repeated = before === after && isRepeatedChar(before);

  const outside =
    value.slice(Math.max(0, s - before.length), s) === before &&
    value.slice(e, e + after.length) === after &&
    (!repeated ||
      (runMatches(before, runLength(value, s, before[0], -1)) && runMatches(after, runLength(value, e, after[0], 1))));
  if (outside) {
    const from = s - before.length;
    return { from, to: e + after.length, insert: selected, selStart: from, selEnd: from + selected.length };
  }

  const inside =
    selected.length >= before.length + after.length &&
    selected.startsWith(before) &&
    selected.endsWith(after) &&
    (!repeated ||
      (runMatches(before, runLength(selected, 0, before[0], 1)) &&
        runMatches(after, runLength(selected, selected.length, after[0], -1))));
  if (inside) {
    const inner = selected.slice(before.length, selected.length - after.length);
    return { from: s, to: e, insert: inner, selStart: s, selEnd: s + inner.length };
  }

  return {
    from: s,
    to: e,
    insert: before + selected + after,
    selStart: s + before.length,
    selEnd: s + before.length + selected.length,
  };
}

function lineBounds(value: string, start: number, end: number) {
  const from = value.lastIndexOf('\n', start - 1) + 1;
  let to = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end);
  if (to === -1) to = value.length;
  return { from, to };
}

export function toggleMarkdownList(value: string, start: number, end: number, ordered: boolean): TextEdit {
  const { from, to } = lineBounds(value, start, end);
  const lines = value.slice(from, to).split('\n');
  const pattern = ordered ? /^(\s*)\d+[.)]\s+/ : /^(\s*)[-*+]\s+/;
  const filled = lines.filter((l) => l.trim());
  const allListed = filled.length > 0 && filled.every((l) => pattern.test(l));
  let n = 0;
  const next = lines.map((line) => {
    if (allListed) return line.replace(pattern, '$1');
    if (!line.trim()) return line;
    const bare = line.replace(/^(\s*)(?:\d+[.)]|[-*+])\s+/, '$1');
    n++;
    return (ordered ? `${n}. ` : '- ') + bare;
  });
  const insert = next.join('\n');
  return { from, to, insert, selStart: from, selEnd: from + insert.length };
}

export function toggleHtmlList(value: string, start: number, end: number, ordered: boolean): TextEdit {
  const tag = ordered ? 'ol' : 'ul';
  const { from, to } = lineBounds(value, start, end);
  const block = value.slice(from, to);
  const match = block.match(new RegExp(`^\\s*<${tag}>([\\s\\S]*)</${tag}>\\s*$`, 'i'));
  let insert: string;
  if (match) {
    insert = [...match[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((m) => m[1]).join('\n');
  } else {
    const items = block
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => `  <li>${l.trim()}</li>`);
    insert = `<${tag}>\n${items.join('\n')}\n</${tag}>`;
  }
  return { from, to, insert, selStart: from, selEnd: from + insert.length };
}

export function insertLink(value: string, start: number, end: number, url: string, format: 'markdown' | 'html'): TextEdit {
  const text = value.slice(start, end) || url;
  const insert =
    format === 'markdown'
      ? `[${text}](${url.replace(/\s/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')})`
      : `<a href="${url.replace(/"/g, '&quot;')}">${text}</a>`;
  return { from: start, to: end, insert, selStart: start + insert.length, selEnd: start + insert.length };
}

export function clearFormatting(value: string, start: number, end: number, format: 'markdown' | 'html'): TextEdit {
  let text = value.slice(start, end);
  text = text.replace(/<\/?(?:b|strong|i|em|u|s|strike|del|span|font)\b[^>]*>/gi, '');
  // Escaped markers (\*) are literal characters, so they stay.
  if (format === 'markdown') text = text.replace(/(\\?)(\*\*|\*|~~)/g, (m, esc) => (esc ? m : ''));
  return { from: start, to: end, insert: text, selStart: start, selEnd: start + text.length };
}

/** Normalise a typed URL: keep mail/phone/merge-field links, add https:// otherwise. */
export function normalizeUrl(input: string): string | null {
  const url = input.trim();
  if (!url || url === 'https://') return null;
  return /^(https?:|mailto:|tel:|\{)/i.test(url) ? url : `https://${url}`;
}

// ---------------------------------------------------------------------------
// Plain text and Markdown escaping
// ---------------------------------------------------------------------------

export function plainToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

const isWordChar = (ch: string | undefined) => !!ch && /[A-Za-z0-9À-￿]/.test(ch);

// Escape characters Markdown would treat as syntax. Braces are left alone so
// merge fields such as {{FirstName}} keep working.
export function escapeMarkdownInline(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ('\\`*[]<>~'.includes(ch)) {
      out += '\\' + ch;
    } else if (ch === '&' && /^&#?[a-z0-9]+;/i.test(text.slice(i))) {
      out += '\\&';
    } else if (ch === '_' && !(isWordChar(text[i - 1]) && isWordChar(text[i + 1]))) {
      // Underscores inside a word (first_name) never start emphasis.
      out += '\\_';
    } else {
      out += ch;
    }
  }
  return out;
}

export function escapeMarkdownLineStart(line: string): string {
  if (/^[=-]+\s*$/.test(line)) return '\\' + line;
  return line
    .replace(/^(#{1,6})(?=\s|$)/, '\\$1')
    .replace(/^([-+])(?=\s|$)/, '\\$1')
    .replace(/^(\d+)([.)])(?=\s|$)/, '$1\\$2');
}

// ---------------------------------------------------------------------------
// HTML conversion over an htmlparser2 tree
// ---------------------------------------------------------------------------

function parse(html: string): ParentNode {
  return parseDocument(html);
}

function serialize(nodes: AnyNode | AnyNode[]): string {
  // "utf8" only encodes the characters HTML needs, so accented text stays readable.
  return render(nodes, { encodeEntities: 'utf8' });
}

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'center', 'dd', 'div', 'dl', 'dt',
  'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul',
]);
const SKIP_TAGS = new Set(['script', 'style', 'head', 'title', 'meta', 'link', 'template', 'noscript']);

const isBlock = (n: AnyNode | null | undefined): boolean => !!n && isTag(n) && BLOCK_TAGS.has(n.name);

function textOf(node: AnyNode): string {
  if (isText(node)) return node.data;
  if (isTag(node) || node.type === 'root') {
    return (node as ParentNode).children.map(textOf).join('');
  }
  return '';
}

function hasBlockDescendant(el: Element): boolean {
  return el.children.some((c) => isTag(c) && (BLOCK_TAGS.has(c.name) || hasBlockDescendant(c)));
}

function findAll(el: ParentNode, name: string): Element[] {
  const out: Element[] = [];
  for (const c of el.children) {
    if (!isTag(c)) continue;
    if (c.name === name) out.push(c);
    out.push(...findAll(c, name));
  }
  return out;
}

// Stands in for a <br> inside inline content until the walker splits lines.
const BR = '\u0000';

function parseStyle(style: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const decl of (style ?? '').split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const val = decl.slice(idx + 1).trim();
    if (key && val) map.set(key, val);
  }
  return map;
}

// Styles carried into Markdown as an inline <span>; the rest of what a paste
// brings (line-height, margins, Google Docs ids) is dropped.
const KEPT_STYLES = ['font-family', 'font-size', 'color', 'background-color'];

// Move whitespace outside emphasis markers, and apply formatting that spans a
// line break to each line separately.
function wrapMarkers(inner: string, open: string, close = open): string {
  return inner
    .split(BR)
    .map((seg) => {
      if (!seg.trim()) return seg;
      const lead = seg.match(/^\s*/)![0];
      const trail = seg.match(/\s*$/)![0];
      return lead + open + seg.trim() + close + trail;
    })
    .join(BR);
}

type Line = { kind: 'text'; text: string } | { kind: 'block'; text: string } | { kind: 'blank'; hard: boolean };

// Walks an HTML tree and produces Markdown or plain text, line by line. The
// rich editor writes one <div> per line and <div><br></div> for an empty
// line, so each line stays a line and each empty line a paragraph break.
class HtmlWalker {
  private lines: Line[] = [];
  private buf = '';
  private md: boolean;

  constructor(md: boolean) {
    this.md = md;
  }

  run(root: ParentNode): string {
    this.walkChildren(root);
    this.flush();
    return this.render();
  }

  private flush() {
    const text = this.buf.trim();
    this.buf = '';
    if (!text) return;
    this.lines.push({ kind: 'text', text: this.md ? escapeMarkdownLineStart(text) : text });
  }

  private append(inline: string) {
    const [first, ...rest] = inline.split(BR);
    this.buf += first;
    for (const part of rest) {
      this.lineBreak();
      this.buf += part;
    }
  }

  private lineBreak() {
    if (this.buf.trim()) this.flush();
    else this.blank(true);
  }

  private blank(hard = false) {
    this.lines.push({ kind: 'blank', hard });
  }

  private block(text: string) {
    this.flush();
    this.blank();
    this.lines.push({ kind: 'block', text });
    this.blank();
  }

  private render(): string {
    const parts: string[] = [];
    let para: string[] = [];
    let hardBlanks = 0;
    let softBlank = false;
    const push = (text: string) => {
      if (parts.length) {
        // Markdown collapses runs of blank lines; plain text keeps them.
        const blanks = this.md ? 1 : Math.max(softBlank ? 1 : 0, hardBlanks);
        parts.push('\n' + '\n'.repeat(blanks));
      }
      parts.push(text);
      hardBlanks = 0;
      softBlank = false;
    };
    const endPara = () => {
      if (para.length) push(para.join(this.md ? '  \n' : '\n'));
      para = [];
    };
    for (const line of this.lines) {
      if (line.kind === 'text') {
        // Blank lines seen so far are consumed when this paragraph is pushed.
        para.push(line.text);
      } else if (line.kind === 'blank') {
        endPara();
        if (line.hard) hardBlanks++;
        else softBlank = true;
      } else {
        endPara();
        push(line.text);
      }
    }
    endPara();
    return parts.join('');
  }

  private walkChildren(node: ParentNode) {
    for (const child of node.children) this.walk(child);
  }

  private sub(node: ParentNode): string {
    return new HtmlWalker(this.md).run(node);
  }

  private walk(node: AnyNode) {
    if (isText(node)) {
      this.append(this.inline(node));
      return;
    }
    if (!isTag(node) || SKIP_TAGS.has(node.name)) return;
    const el = node;
    const tag = el.name;

    if (tag === 'br') {
      this.lineBreak();
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      const text = this.inline(el).split(BR).join(' ').trim();
      if (text) this.block(this.md ? `${'#'.repeat(Number(tag[1]))} ${text}` : text);
      return;
    }
    if (tag === 'p') {
      this.flush();
      this.blank();
      this.walkChildren(el);
      this.flush();
      this.blank();
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const text = this.list(el);
      if (text) this.block(text);
      return;
    }
    if (tag === 'blockquote') {
      const inner = this.sub(el);
      if (inner) this.block(inner.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n'));
      return;
    }
    if (tag === 'pre') {
      const code = textOf(el).replace(/\n$/, '');
      if (!this.md) {
        this.block(code);
        return;
      }
      const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((m) => m.length));
      const fence = '`'.repeat(longest + 1);
      this.block(`${fence}\n${code}\n${fence}`);
      return;
    }
    if (tag === 'hr') {
      this.block(this.md ? '---' : '----------');
      return;
    }
    if (tag === 'table') {
      if (this.md) {
        this.block(serialize(el));
      } else {
        const rows = findAll(el, 'tr').map((tr) =>
          tr.children
            .filter(isTag)
            .map((c) => textOf(c).trim())
            .join(' | '),
        );
        this.block(rows.join('\n'));
      }
      return;
    }
    if (BLOCK_TAGS.has(tag)) {
      this.flush();
      this.walkChildren(el);
      this.flush();
      return;
    }
    // An inline element wrapping whole lines cannot keep its formatting line
    // by line, so walk into it and keep the text.
    if (hasBlockDescendant(el)) {
      this.walkChildren(el);
      return;
    }
    this.append(this.inline(el));
  }

  private list(el: Element): string {
    const ordered = el.name === 'ol';
    let n = Number(el.attribs.start ?? '1');
    if (!Number.isFinite(n)) n = 1;
    const items: string[] = [];
    for (const child of el.children) {
      if (isTag(child) && (child.name === 'ul' || child.name === 'ol')) {
        const nested = this.list(child);
        if (nested && items.length) {
          items[items.length - 1] += '\n' + nested.split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
        }
        continue;
      }
      if (!isTag(child)) continue;
      // Keep items tight: a blank line inside an item would space out the list.
      const content = this.sub(child).replace(/\n{2,}/g, '\n');
      if (!content && child.name !== 'li') continue;
      const marker = ordered ? `${n++}.` : '-';
      const pad = ' '.repeat(marker.length + 1);
      const [first, ...rest] = content.split('\n');
      items.push([`${marker} ${first}`, ...rest.map((l) => (l ? pad + l : l))].join('\n'));
    }
    return items.join('\n');
  }

  private inline(node: AnyNode): string {
    if (isText(node)) {
      const text = node.data
        .replace(/[\t\n\r ]+/g, ' ')
        // Editors insert a lone &nbsp; beside formatting; it is an ordinary
        // space. Runs of them are deliberate and kept.
        .replace(/(^|[^  ]) (?=[^  ]|$)/g, '$1 ');
      return this.md ? escapeMarkdownInline(text) : text;
    }
    if (!isTag(node) || SKIP_TAGS.has(node.name)) return '';
    const el = node;
    const tag = el.name;
    const inner = () => el.children.map((c) => this.inline(c)).join('');

    if (tag === 'br') return BR;
    if (tag === 'img') {
      const alt = el.attribs.alt ?? '';
      const src = el.attribs.src ?? '';
      return this.md ? `![${escapeMarkdownInline(alt)}](${src})` : alt;
    }
    if (!this.md) {
      if (tag === 'a') {
        const text = inner();
        const href = el.attribs.href ?? '';
        return href && text.trim() && text.trim() !== href && !href.startsWith('mailto:') ? `${text} (${href})` : text || href;
      }
      return inner();
    }

    switch (tag) {
      case 'b':
      case 'strong':
        return wrapMarkers(inner(), '**');
      case 'i':
      case 'em':
      case 'cite':
      case 'var':
        return wrapMarkers(inner(), '*');
      case 'u':
      case 'ins':
        return wrapMarkers(inner(), '<u>', '</u>');
      case 's':
      case 'strike':
      case 'del':
        return wrapMarkers(inner(), '~~');
      case 'code':
      case 'kbd':
      case 'tt': {
        const code = textOf(el).replace(/\s+/g, ' ');
        const longest = Math.max(0, ...(code.match(/`+/g) ?? []).map((m) => m.length));
        const fence = '`'.repeat(longest + 1);
        const pad = code.startsWith('`') || code.endsWith('`') ? ' ' : '';
        return code ? `${fence}${pad}${code}${pad}${fence}` : '';
      }
      case 'a': {
        const href = el.attribs.href;
        const text = inner();
        if (!href) return text;
        const url = href.replace(/\s/g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
        return wrapMarkers(text || escapeMarkdownInline(href), '[', `](${url})`);
      }
      case 'sub':
      case 'sup':
      case 'mark':
      case 'small':
      case 'big':
        return wrapMarkers(inner(), `<${tag}>`, `</${tag}>`);
      case 'span':
      case 'font':
        return this.styledSpan(el, inner());
      default:
        return inner();
    }
  }

  // A <span style> or legacy <font>: what Markdown can express becomes
  // Markdown; fonts, sizes and colours stay as an inline <span>.
  private styledSpan(el: Element, inner: string): string {
    const style = parseStyle(el.attribs.style);
    if (el.name === 'font') {
      if (el.attribs.face) style.set('font-family', el.attribs.face);
      if (el.attribs.size && LEGACY_FONT_SIZES[el.attribs.size]) style.set('font-size', LEGACY_FONT_SIZES[el.attribs.size]);
      if (el.attribs.color) style.set('color', el.attribs.color);
    }
    const weight = style.get('font-weight') ?? '';
    const decoration = (style.get('text-decoration') ?? '') + ' ' + (style.get('text-decoration-line') ?? '');
    let out = inner;
    if (decoration.includes('line-through')) out = wrapMarkers(out, '~~');
    if (decoration.includes('underline')) out = wrapMarkers(out, '<u>', '</u>');
    if (/italic|oblique/.test(style.get('font-style') ?? '')) out = wrapMarkers(out, '*');
    if (/bold/.test(weight) || Number(weight) >= 600) out = wrapMarkers(out, '**');
    const kept = KEPT_STYLES.filter((k) => style.has(k)).map((k) => `${k}: ${style.get(k)!.replace(/"/g, "'")}`);
    return kept.length ? wrapMarkers(out, `<span style="${kept.join('; ')}">`, '</span>') : out;
  }
}

export function htmlToMarkdown(html: string): string {
  return new HtmlWalker(true).run(parse(html));
}

export function htmlToPlainText(html: string): string {
  return new HtmlWalker(false).run(parse(html));
}

const REMOVED_TAGS = new Set([
  'script', 'style', 'iframe', 'frame', 'object', 'embed', 'link', 'meta', 'base', 'form',
  'input', 'button', 'textarea', 'select', 'noscript', 'template', 'head', 'title',
]);
const UNWRAPPED_TAGS = new Set(['html', 'body']);

/**
 * Remove anything that should never run inside the composer: scripts,
 * embedded frames, event handlers and javascript: URLs. Classes and ids are
 * dropped too; they mean nothing in a sent email. With `dropDataImages`,
 * inline base64 images go as well, so a pasted screenshot cannot bloat the body.
 */
export function sanitizeHtml(html: string, options?: { dropDataImages?: boolean }): string {
  const clean = (nodes: AnyNode[]): AnyNode[] => {
    const out: AnyNode[] = [];
    for (const node of nodes) {
      if (!isTag(node)) {
        if (isText(node)) out.push(node);
        continue; // comments, doctypes, processing instructions
      }
      if (REMOVED_TAGS.has(node.name)) continue;
      if (UNWRAPPED_TAGS.has(node.name)) {
        out.push(...clean(node.children));
        continue;
      }
      if (options?.dropDataImages && node.name === 'img' && /^\s*data:/i.test(node.attribs.src ?? '')) continue;
      for (const name of Object.keys(node.attribs)) {
        const lower = name.toLowerCase();
        const value = node.attribs[name];
        if (lower.startsWith('on') || lower === 'class' || lower === 'id' || lower === 'contenteditable') {
          delete node.attribs[name];
        } else if (
          ['href', 'src', 'action', 'formaction'].includes(lower) &&
          /^\s*(javascript|vbscript|data:text\/html)/i.test(value)
        ) {
          delete node.attribs[name];
        }
      }
      node.children = clean(node.children);
      out.push(node);
    }
    return out;
  };
  return serialize(clean(parse(html).children));
}

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

function openTag(el: Element): string {
  const attrs = Object.entries(el.attribs)
    .map(([k, v]) => ` ${k}="${v.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`)
    .join('');
  return `<${el.name}${attrs}>`;
}

/**
 * Put each block element on its own line so HTML mode is readable. Only
 * whitespace beside block boundaries changes, which never renders.
 */
export function prettyHtml(html: string): string {
  const format = (nodes: AnyNode[], topLevel: boolean): string => {
    const kept = nodes.filter((child, i) => {
      if (!isText(child) || child.data.trim()) return true;
      const prev = nodes[i - 1];
      const next = nodes[i + 1];
      return !(!prev || !next || isBlock(prev) || isBlock(next));
    });
    let sawBlock = false;
    let out = '';
    for (const child of kept) {
      if (isBlock(child)) {
        sawBlock = true;
        const el = child as Element;
        out += '\n';
        if (el.name === 'pre' || VOID_TAGS.has(el.name)) {
          out += serialize(el);
        } else {
          out += openTag(el) + format(el.children, false) + `</${el.name}>`;
        }
      } else {
        out += serialize(child);
      }
    }
    if (sawBlock && !topLevel) out += '\n';
    return out;
  };
  return format(parse(html).children, true).trim();
}

/** The HTML a body in `format` renders to, before signature and quote. */
export function bodyToHtml(format: ComposeFormat, body: string): string {
  if (format === 'markdown') return marked.parse(body, { async: false }) as string;
  if (format === 'plain') return plainToHtml(body);
  return body;
}

/**
 * Rewrite a body when the composer switches format, so it renders the same
 * afterwards: bold stays bold, whether that is <b>, ** or a toolbar tap.
 * Plain text cannot hold formatting, so switching to it keeps only the text.
 */
export function convertBody(from: ComposeFormat, to: ComposeFormat, body: string): string {
  if (from === to || !body.trim()) return body;
  const html = bodyToHtml(from, body);
  switch (to) {
    case 'rich':
      return sanitizeHtml(html);
    case 'html':
      return prettyHtml(html);
    case 'markdown':
      return htmlToMarkdown(html);
    case 'plain':
      return htmlToPlainText(html);
  }
}

/**
 * The last format switch, remembered so switching straight back without
 * editing restores the original text exactly instead of converting it twice
 * (HTML to rich text and back drops <style> blocks and classes).
 */
export type FormatSwitch = { from: ComposeFormat; to: ComposeFormat; original: string; converted: string };

export function restoredBody(last: FormatSwitch | null, from: ComposeFormat, to: ComposeFormat, body: string): string | null {
  if (last && last.from === to && last.to === from && last.converted === body) return last.original;
  return null;
}

/** Switch format, restoring or converting as above. Never throws. */
export function switchFormat(
  last: FormatSwitch | null,
  from: ComposeFormat,
  to: ComposeFormat,
  body: string,
): { body: string; last: FormatSwitch | null } {
  const restored = restoredBody(last, from, to, body);
  if (restored !== null) return { body: restored, last: null };
  let converted: string;
  try {
    converted = convertBody(from, to, body);
  } catch {
    converted = body;
  }
  return { body: converted, last: { from, to, original: body, converted } };
}

/** True when rich HTML has nothing a reader would see. */
export function isRichEmpty(html: string): boolean {
  if (!html) return true;
  if (/<(img|hr|li|table)\b/i.test(html)) return false;
  return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;| /g, '').trim();
}
