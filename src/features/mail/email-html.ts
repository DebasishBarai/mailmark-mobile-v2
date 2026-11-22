/**
 * Wrap a message body in a document for the reader's web view.
 *
 * Mail is authored for a white page, so it is always shown on one, whatever
 * the app theme. The web view reports the app's dark mode to the page, so a
 * message's own dark-mode rules (light text, meant for a dark background)
 * are switched off, or they would paint white-on-white. The message's own
 * scripts are forbidden by CSP. With `measureNonce` the reader's measuring
 * script (MEASURE_SCRIPT) is the one script allowed to run: it is inlined so
 * it starts with the page instead of after every remote image has loaded,
 * which is when the native side's injected scripts run on Android. With
 * `blockRemoteImages` only inline and embedded images load, which also stops
 * tracking pixels.
 */
export function emailDocument(
  html: string,
  options: { blockRemoteImages?: boolean; measureNonce?: string } = {},
): string {
  const nonce = options.measureNonce && /^[A-Za-z0-9]+$/.test(options.measureNonce) ? options.measureNonce : null;
  const imgSrc = options.blockRemoteImages ? "img-src data: cid: blob:" : 'img-src * data: cid: blob:';
  const scriptSrc = nonce ? `script-src 'nonce-${nonce}'` : "script-src 'none'";
  const csp = `default-src 'none'; style-src 'unsafe-inline' *; font-src * data:; ${imgSrc}; media-src *; ${scriptSrc}`;
  const measure = nonce ? `\n<script nonce="${nonce}">${MEASURE_SCRIPT}</script>` : '';
  const isHtml = /<\s*(html|body|div|p|table|br|span|a|img)\b/i.test(html);
  const content = isHtml ? withoutDarkMode(html) : `<pre style="white-space:pre-wrap;font-family:inherit">${html}</pre>`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="color-scheme" content="light only">
<style>
  :root { color-scheme: light only; }
  html, body { margin: 0; padding: 0; background: #ffffff; color: #1a1a1a; }
  /* flow-root keeps floats and margins inside the body, so its box is the
     message's full height. */
  body { display: flow-root; font: 15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         padding: 16px; word-wrap: break-word; overflow-wrap: anywhere; -webkit-text-size-adjust: 100%; }
  img { max-width: 100% !important; height: auto; }
  table { max-width: 100% !important; }
  pre, code { white-space: pre-wrap; }
  blockquote { margin: 0 0 0 .8ex; border-left: 2px solid #ccc; padding-left: 1ex; color: #555; }
  a { color: #1a5fb4; }
</style>${measure}
</head>
<body>${content}</body>
</html>`;
}

/**
 * Make `prefers-color-scheme: dark` queries in the message's stylesheets and
 * `media` attributes never match. An unknown value is invalid, and an invalid
 * media query evaluates to false.
 */
function withoutDarkMode(html: string): string {
  const neutralize = (css: string) => css.replace(/prefers-color-scheme\s*:\s*dark/gi, 'prefers-color-scheme: none');
  return html
    .replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_, open, css, close) => open + neutralize(css) + close)
    .replace(/(\smedia\s*=\s*)("[^"]*"|'[^']*')/gi, (_, attr, value) => attr + neutralize(value));
}

/**
 * Sizes the reader to the message. Mail is often laid out for a fixed width
 * (a 600px newsletter, a 394px Instagram digest) wider than a phone, so a
 * message wider than the view is scaled down to fit, as mail apps do; then
 * the body's height, which can shrink as well as grow, is posted to the
 * native side. It runs inlined in the page (see `emailDocument`) and again
 * as the web view's injected script, which only re-measures if it already
 * ran.
 */
export const MEASURE_SCRIPT = `
(function () {
  if (window.__mailmarkMeasure) { window.__mailmarkMeasure(); return; }
  var last = 0;
  var queued = false;
  function fit() {
    var body = document.body;
    var root = document.documentElement;
    if (!body) return;
    body.style.zoom = '';
    var view = root.clientWidth;
    var content = Math.max(root.scrollWidth, body.scrollWidth);
    if (view > 0 && content > view + 1) {
      body.style.zoom = String(Math.max(0.25, Math.floor((view / content) * 1000) / 1000));
    }
  }
  function post() {
    queued = false;
    var body = document.body;
    var bridge = window.ReactNativeWebView;
    if (!body || !bridge) return;
    var h = Math.ceil(body.getBoundingClientRect().height);
    if (h > 0 && h !== last) {
      last = h;
      bridge.postMessage(String(h));
    }
  }
  function schedule() {
    if (queued) return;
    queued = true;
    (window.requestAnimationFrame || setTimeout)(post);
  }
  function update() {
    fit();
    schedule();
  }
  window.__mailmarkMeasure = function () {
    last = 0;
    update();
  };
  function start() {
    update();
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(document.body);
    // Images (and anything else) finishing late can change the layout.
    document.addEventListener('load', update, true);
    window.addEventListener('load', update);
    window.addEventListener('resize', update);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
    setTimeout(update, 300);
    setTimeout(update, 1200);
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
true;
`;
