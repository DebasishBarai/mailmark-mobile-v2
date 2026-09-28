import { LEGACY_FONT_SIZES } from '@/lib/email/format';

/**
 * The page that hosts the rich text editor: a contentEditable body inside a
 * web view (native) or a sandboxed iframe (web). The host sends commands in
 * and receives changes out as JSON messages; see RichEditorCommand and
 * RichEditorMessage. The editing behaviour matches the website's composer:
 * Gmail-style shortcuts, fonts and sizes written as <span style>, and pastes
 * cleaned of scripts, classes and inline base64 images.
 *
 * Like the reader, the editor is always a white page, since that is where
 * the message will be read.
 */

export type RichAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'bulletList'
  | 'numberList'
  | 'clear'
  | 'link'
  | 'font'
  | 'size'
  | 'color';

export type RichActiveState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  bulletList: boolean;
  numberList: boolean;
};

export const NO_ACTIVE: RichActiveState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  bulletList: false,
  numberList: false,
};

export type RichEditorCommand =
  | { t: 'set'; html: string }
  | { t: 'exec'; action: RichAction; value?: string }
  | { t: 'insert'; text: string }
  | { t: 'focus' }
  | { t: 'sync' };

export type RichEditorMessage =
  | { t: 'change'; html: string }
  | { t: 'state'; state: RichActiveState }
  | { t: 'height'; h: number }
  | { t: 'focus' }
  | { t: 'blur' }
  // A shortcut the page cannot finish by itself (Ctrl+K needs a URL).
  | { t: 'request'; action: 'link' };

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Written as plain ES5 so it runs in older Android system web views.
const EDITOR_SCRIPT = `
(function () {
  var ed = document.getElementById('editor');
  var saved = null;
  var pendingSize = null;
  var LEGACY = ${JSON.stringify(LEGACY_FONT_SIZES)};

  function post(msg) {
    var json = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(json);
    else if (window.parent !== window) window.parent.postMessage({ __mmEditor: json }, '*');
  }

  function isEmpty() {
    if (ed.querySelector('img,hr,li,table')) return false;
    return !(ed.textContent || '').replace(/\\u00a0/g, '').trim();
  }

  function emit() {
    ed.classList.toggle('empty', isEmpty());
    post({ t: 'change', html: isEmpty() ? '' : ed.innerHTML });
    height();
  }

  var lastHeight = 0;
  function height() {
    var h = Math.ceil(ed.scrollHeight);
    if (h !== lastHeight) {
      lastHeight = h;
      post({ t: 'height', h: h });
    }
  }

  function state() {
    function q(c) {
      try { return document.queryCommandState(c); } catch (e) { return false; }
    }
    post({ t: 'state', state: {
      bold: q('bold'), italic: q('italic'), underline: q('underline'), strike: q('strikeThrough'),
      bulletList: q('insertUnorderedList'), numberList: q('insertOrderedList')
    } });
  }

  function inside(node) {
    return node && (node === ed || ed.contains(node));
  }

  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    var r = sel.getRangeAt(0);
    if (!inside(r.commonAncestorContainer)) return;
    saved = r.cloneRange();
    state();
  });

  // Focus the editor and put back the last selection, unless a live one exists.
  function restore() {
    var sel = window.getSelection();
    if (document.activeElement === ed && sel && sel.rangeCount && inside(sel.getRangeAt(0).commonAncestorContainer)) return;
    ed.focus();
    if (!sel) return;
    sel.removeAllRanges();
    if (saved && inside(saved.commonAncestorContainer)) {
      sel.addRange(saved);
    } else {
      var r = document.createRange();
      r.selectNodeContents(ed);
      r.collapse(false);
      sel.addRange(r);
    }
  }

  // execCommand writes fonts, sizes and colours as <font>; replace those with
  // <span style>, which every mail client understands.
  function normalizeFonts(sizePx) {
    var fonts = ed.querySelectorAll('font');
    if (!fonts.length) return;
    var sel = window.getSelection();
    var r = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    var keep = r ? { sc: r.startContainer, so: r.startOffset, ec: r.endContainer, eo: r.endOffset } : null;
    var created = [];
    for (var i = 0; i < fonts.length; i++) {
      var font = fonts[i];
      var span = document.createElement('span');
      var existing = font.getAttribute('style');
      if (existing) span.setAttribute('style', existing);
      var set = [];
      var face = font.getAttribute('face');
      var size = font.getAttribute('size');
      var color = font.getAttribute('color');
      if (face) { span.style.fontFamily = face; set.push('font-family'); }
      if (size) { span.style.fontSize = size === '7' && sizePx ? sizePx : (LEGACY[size] || ''); set.push('font-size'); }
      if (color) { span.style.color = color; set.push('color'); }
      while (font.firstChild) span.appendChild(font.firstChild);
      var styled = span.querySelectorAll('[style]');
      for (var j = 0; j < styled.length; j++) {
        for (var k = 0; k < set.length; k++) styled[j].style.removeProperty(set[k]);
        if (!styled[j].getAttribute('style')) styled[j].removeAttribute('style');
      }
      font.parentNode.replaceChild(span, font);
      created.push(span);
    }
    if (!sel) return;
    try {
      if (keep && ed.contains(keep.sc) && ed.contains(keep.ec)) {
        var back = document.createRange();
        back.setStart(keep.sc, keep.so);
        back.setEnd(keep.ec, keep.eo);
        sel.removeAllRanges();
        sel.addRange(back);
        return;
      }
    } catch (e) {}
    var nr = document.createRange();
    nr.setStart(created[0], 0);
    var last = created[created.length - 1];
    nr.setEnd(last, last.childNodes.length);
    sel.removeAllRanges();
    sel.addRange(nr);
  }

  function sanitize(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var drop = doc.body.querySelectorAll('script,style,iframe,frame,object,embed,link,meta,base,form,input,button,textarea,select,noscript,template');
    for (var i = 0; i < drop.length; i++) drop[i].parentNode.removeChild(drop[i]);
    var imgs = doc.body.querySelectorAll('img');
    for (var m = 0; m < imgs.length; m++) {
      if (/^\\s*data:/i.test(imgs[m].getAttribute('src') || '')) imgs[m].parentNode.removeChild(imgs[m]);
    }
    var all = doc.body.querySelectorAll('*');
    for (var j = 0; j < all.length; j++) {
      var attrs = Array.prototype.slice.call(all[j].attributes);
      for (var k = 0; k < attrs.length; k++) {
        var name = attrs[k].name.toLowerCase();
        if (name.indexOf('on') === 0 || name === 'class' || name === 'id' || name === 'contenteditable') {
          all[j].removeAttribute(attrs[k].name);
        } else if ((name === 'href' || name === 'src') && /^\\s*(javascript|vbscript|data:text\\/html)/i.test(attrs[k].value)) {
          all[j].removeAttribute(attrs[k].name);
        }
      }
    }
    return doc.body.innerHTML;
  }

  function exec(action, value) {
    restore();
    document.execCommand('styleWithCSS', false, false);
    switch (action) {
      case 'bold': document.execCommand('bold'); break;
      case 'italic': document.execCommand('italic'); break;
      case 'underline': document.execCommand('underline'); break;
      case 'strike': document.execCommand('strikeThrough'); break;
      case 'bulletList': document.execCommand('insertUnorderedList'); break;
      case 'numberList': document.execCommand('insertOrderedList'); break;
      case 'clear': document.execCommand('removeFormat'); break;
      case 'link':
        if (!value) break;
        var sel = window.getSelection();
        if (sel && !sel.isCollapsed) {
          document.execCommand('createLink', false, value);
        } else {
          var a = document.createElement('a');
          a.href = value;
          a.textContent = value;
          document.execCommand('insertHTML', false, a.outerHTML);
        }
        break;
      case 'font':
        document.execCommand('fontName', false, value);
        normalizeFonts(null);
        break;
      case 'size':
        pendingSize = value;
        document.execCommand('fontSize', false, '7');
        normalizeFonts(value);
        break;
      case 'color':
        document.execCommand('foreColor', false, value);
        normalizeFonts(null);
        break;
    }
    var s = window.getSelection();
    if (s && s.rangeCount) saved = s.getRangeAt(0).cloneRange();
    emit();
    state();
  }

  function handle(cmd) {
    if (!cmd) return;
    if (cmd.t === 'set') {
      ed.innerHTML = cmd.html;
      ed.classList.toggle('empty', isEmpty());
      saved = null;
      height();
    } else if (cmd.t === 'exec') {
      exec(cmd.action, cmd.value);
    } else if (cmd.t === 'insert') {
      restore();
      document.execCommand('insertText', false, cmd.text);
      emit();
    } else if (cmd.t === 'focus') {
      restore();
    } else if (cmd.t === 'sync') {
      lastHeight = 0;
      height();
      state();
    }
  }
  window.__mmHandle = handle;
  window.addEventListener('message', function (e) {
    if (e.data && e.data.__mmCmd) handle(e.data.__mmCmd);
  });

  ed.addEventListener('input', function () {
    // Typing after choosing a size with nothing selected makes a <font size="7">.
    if (ed.querySelector('font')) normalizeFonts(pendingSize);
    emit();
  });
  ed.addEventListener('focus', function () { post({ t: 'focus' }); });
  ed.addEventListener('blur', function () { post({ t: 'blur' }); });

  ed.addEventListener('keydown', function (e) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    var key = (e.key || '').toLowerCase();
    var action = null;
    if (!e.shiftKey) {
      if (key === 'b') action = 'bold';
      else if (key === 'i') action = 'italic';
      else if (key === 'u') action = 'underline';
      else if (key === '\\\\') action = 'clear';
      else if (key === 'k') { e.preventDefault(); post({ t: 'request', action: 'link' }); return; }
    } else {
      if (key === 'x') action = 'strike';
      else if (e.code === 'Digit7') action = 'numberList';
      else if (e.code === 'Digit8') action = 'bulletList';
    }
    if (!action) return;
    e.preventDefault();
    exec(action);
  });

  ed.addEventListener('paste', function (e) {
    var cd = e.clipboardData;
    if (!cd) return;
    var html = cd.getData('text/html');
    var text = cd.getData('text/plain');
    if (!html && !text) {
      // A bare file or screenshot belongs in attachments, not inline.
      if (cd.files && cd.files.length) e.preventDefault();
      return;
    }
    e.preventDefault();
    if (html) document.execCommand('insertHTML', false, sanitize(html));
    else document.execCommand('insertText', false, text);
    normalizeFonts(null);
    emit();
  });
  ed.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) e.preventDefault();
  });

  if (window.ResizeObserver) new ResizeObserver(height).observe(ed);
  ed.classList.toggle('empty', isEmpty());
  height();
  setTimeout(height, 300);
})();
true;
`;

/**
 * The editor document. `initialHtml` must already be sanitized; later
 * content arrives through the "set" command, so the page never reloads.
 */
export function richEditorDocument(initialHtml: string, placeholder: string): string {
  const csp = "default-src 'none'; style-src 'unsafe-inline' *; font-src * data:; img-src * data: cid: blob:; script-src 'unsafe-inline'";
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  /* Full height, so tapping anywhere below the text still lands in the editor. */
  html, body { margin: 0; padding: 0; height: 100%; background: #ffffff; }
  #editor { min-height: 100%; box-sizing: border-box; padding: 12px; outline: none; color: #1a1a1a;
            font: 16px/1.5 Arial, Helvetica, sans-serif; word-wrap: break-word; overflow-wrap: anywhere;
            -webkit-text-size-adjust: 100%; -webkit-user-select: text; user-select: text; }
  #editor.empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; position: absolute; }
  #editor p { margin: 0 0 8px; }
  #editor ul, #editor ol { padding-left: 24px; margin: 4px 0; }
  #editor blockquote { margin: 0 0 0 .8ex; border-left: 2px solid #ccc; padding-left: 1ex; color: #555; }
  #editor a { color: #1a5fb4; }
  #editor img { max-width: 100%; height: auto; }
  #editor pre, #editor code { white-space: pre-wrap; font-family: 'Courier New', monospace; }
</style>
</head>
<body>
<div id="editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message body" data-placeholder="${escapeAttr(placeholder)}">${initialHtml}</div>
<script>${EDITOR_SCRIPT}</script>
</body>
</html>`;
}
