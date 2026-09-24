/**
 * Wrap a message body in a document for the reader's web view.
 *
 * Mail is authored for a white page, so it is always shown on one, whatever
 * the app theme. Scripts are forbidden by CSP (the reader measures height
 * from the native side, which CSP does not govern). With `blockRemoteImages`
 * only inline and embedded images load, which also stops tracking pixels.
 */
export function emailDocument(html: string, options: { blockRemoteImages?: boolean } = {}): string {
  const imgSrc = options.blockRemoteImages ? "img-src data: cid: blob:" : 'img-src * data: cid: blob:';
  const csp = `default-src 'none'; style-src 'unsafe-inline' *; font-src * data:; ${imgSrc}; media-src *; script-src 'none'`;
  const isHtml = /<\s*(html|body|div|p|table|br|span|a|img)\b/i.test(html);
  const content = isHtml ? html : `<pre style="white-space:pre-wrap;font-family:inherit">${html}</pre>`;
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; color: #1a1a1a; }
  body { font: 15px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         padding: 16px; word-wrap: break-word; overflow-wrap: anywhere; -webkit-text-size-adjust: 100%; }
  img { max-width: 100% !important; height: auto; }
  table { max-width: 100% !important; }
  pre, code { white-space: pre-wrap; }
  blockquote { margin: 0 0 0 .8ex; border-left: 2px solid #ccc; padding-left: 1ex; color: #555; }
  a { color: #1a5fb4; }
</style>
</head>
<body>${content}</body>
</html>`;
}

/** Injected into the native web view to report the rendered height. */
export const MEASURE_SCRIPT = `
(function () {
  function post() {
    var h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.ReactNativeWebView.postMessage(String(h));
  }
  post();
  window.addEventListener('load', post);
  if (window.ResizeObserver) new ResizeObserver(post).observe(document.body);
  var imgs = document.images;
  for (var i = 0; i < imgs.length; i++) imgs[i].addEventListener('load', post);
  setTimeout(post, 300);
  setTimeout(post, 1200);
})();
true;
`;
