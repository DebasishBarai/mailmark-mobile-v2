#!/usr/bin/env node
/**
 * Packs an `expo export --platform web` build into one self-contained HTML file.
 *
 * Every stylesheet, script and asset is inlined as a data: URI, so the result
 * runs from disk or from any static host with no server and no network. Handy
 * for sharing a clickable build with someone who cannot run Expo Go.
 *
 *   bun run preview
 *   node ./scripts/build-web-preview.mjs [--dist dir] [--out file] [--fragment]
 *
 * --fragment emits the <body> contents only, for embedding in a host page that
 * supplies its own document skeleton.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIME = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

/** Light and dark grounds, matching Colors.light/dark in src/constants/theme.ts. */
const GROUND = { light: '#ece7df', dark: '#0f172a' };

function parseArgs(argv) {
  const options = { dist: 'dist', out: null, fragment: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--fragment') options.fragment = true;
    else if (argv[i] === '--dist') options.dist = argv[++i];
    else if (argv[i] === '--out') options.out = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  options.out ??= options.fragment ? 'mailmark-preview.fragment.html' : 'mailmark-preview.html';
  return options;
}

const options = parseArgs(process.argv.slice(2));

if (!existsSync(join(options.dist, 'index.html'))) {
  console.error(
    `No build at ${options.dist}/index.html.\n` +
      `Run: bunx expo export --platform web --output-dir ${options.dist}`,
  );
  process.exit(1);
}

const cache = new Map();
let inlinedCount = 0;
let missingCount = 0;

function dataUri(webPath) {
  if (cache.has(webPath)) return cache.get(webPath);
  const file = join(options.dist, decodeURIComponent(webPath.replace(/^\//, '')));
  if (!existsSync(file)) return null;
  const ext = webPath.slice(webPath.lastIndexOf('.')).toLowerCase();
  const uri = `data:${MIME[ext] ?? 'application/octet-stream'};base64,${readFileSync(file).toString('base64')}`;
  cache.set(webPath, uri);
  return uri;
}

/** Swap every quoted /assets/... reference for an inline data: URI. */
function inlineAssets(source) {
  return source.replace(/(["'`])(\/assets\/[^"'`)\s]+)\1/g, (whole, quote, path) => {
    const uri = dataUri(path);
    if (!uri) {
      console.warn('  missing asset:', path);
      missingCount += 1;
      return whole;
    }
    inlinedCount += 1;
    return quote + uri + quote;
  });
}

const source = readFileSync(join(options.dist, 'index.html'), 'utf8');

// Preload and prefetch hints name the original file paths, which do not exist
// in a single-file build. The real loads come from the data: URIs below.
const head = inlineAssets(
  source
    .slice(source.indexOf('<head>') + '<head>'.length, source.indexOf('</head>'))
    .replace(/<link rel="(?:preload|prefetch)"[^>]*>/g, ''),
);
const body = source.slice(source.indexOf('<body>') + '<body>'.length, source.indexOf('</body>'));

// Expo's static render inlines <style id="expo-generated-fonts"> with @font-face
// rules, which is why the head is run through inlineAssets above and not just
// the linked stylesheets here.
let styles = [...head.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('');
for (const link of head.matchAll(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g)) {
  styles += `<style>${inlineAssets(readFileSync(join(options.dist, link[1].replace(/^\//, '')), 'utf8'))}</style>`;
}

// Only `</script` can terminate an inline classic script, and `<\/script` is a
// valid escape everywhere it legally appears. `<!--` is deliberately left alone:
// the bundle carries it as a regex literal, where escaping would rewrite code.
const scriptTag = source.match(/<script src="([^"]+)"[^>]*><\/script>/);
if (!scriptTag) throw new Error('no bundle <script src> found in index.html');
const bundle = inlineAssets(
  readFileSync(join(options.dist, scriptTag[1].replace(/^\//, '')), 'utf8'),
).replace(/<\/script/gi, '<\\/script');
if (/<\/script/i.test(bundle)) throw new Error('unescaped </script survived in bundle');

// The host page paints its own ground, so body needs an explicit background or
// it shows through before the app lays out.
const ground =
  `<style>body{background:${GROUND.light}}` +
  `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) body{background:${GROUND.dark}}}` +
  `:root[data-theme="dark"] body{background:${GROUND.dark}}` +
  `:root[data-theme="light"] body{background:${GROUND.light}}</style>`;

const hydrate = '<script>globalThis.__EXPO_ROUTER_HYDRATE__=true;</script>';

// Expo Router reads window.location on boot and a host may serve this page from
// a subpath, so normalise the path before the bundle runs.
const shim =
  "<script>(function(){try{if(location.pathname!=='/'){" +
  "history.replaceState(null,'','/'+location.search+location.hash);}}catch(e){}})();</script>";

// `$&`, `$'` and friends are substitution patterns in a string replacement and
// the bundle contains them as data, so this insertion goes through a function.
const root = body.replace(scriptTag[0], () => '');
const parts = `${styles}${ground}${hydrate}${shim}${root}<script>${bundle}</script>`;

const html = options.fragment
  ? `<title>Mailmark Mobile</title>${parts}`
  : '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>' +
    `<title>Mailmark Mobile</title>${styles}${ground}</head><body>` +
    `${hydrate}${shim}${root}<script>${bundle}</script></body></html>`;

// Three scripts: the hydrate flag, the boot shim and the bundle. Any other count
// means an inline script was terminated early and the rest parsed as markup.
const EXPECTED_SCRIPTS = 3;
const closers = html.split('</script>').length - 1;
if (closers !== EXPECTED_SCRIPTS) {
  throw new Error(`expected ${EXPECTED_SCRIPTS} </script>, found ${closers}`);
}

writeFileSync(options.out, html);
console.log(
  `${options.out} — ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB, ` +
    `${inlinedCount} assets inlined${missingCount ? `, ${missingCount} missing` : ''}`,
);
