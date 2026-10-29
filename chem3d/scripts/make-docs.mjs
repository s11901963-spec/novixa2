// Copies the single-file build to <repo>/docs so GitHub Pages ("Deploy from a branch", folder /docs)
// or any static file host can serve the whole app as one page.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = resolve(root, '..', 'docs');
mkdirSync(docs, { recursive: true });

// Some viewers that open an HTML file straight from GitHub (htmlpreview.github.io) re-insert inline
// scripts as classic scripts, so the inline module becomes a classic script that waits for the page.
// The bundle only uses import.meta in Vite's preload helper, which has nothing to preload here.
let html = readFileSync(resolve(root, 'dist-single', 'index.html'), 'utf8');
const open = '<script type="module" crossorigin>';
const at = html.indexOf(open);
if (at >= 0) {
  const close = html.indexOf('</script>', at);
  const code = html
    .slice(at + open.length, close)
    .replaceAll('import.meta.resolve', '(void 0)')
    .replaceAll('import.meta.url', 'document.baseURI');
  const classic = `(function(){'use strict';function start(){\n${code}\n}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();})();`;
  new Script(classic, { filename: 'docs/index.html' }); // throws if module-only syntax is left
  html = `${html.slice(0, at)}<script>${classic}${html.slice(close)}`;
}
writeFileSync(resolve(docs, 'index.html'), html);
// No Jekyll processing: the page is already built.
writeFileSync(resolve(docs, '.nojekyll'), '');
console.log(`wrote ${resolve(docs, 'index.html')}`);
