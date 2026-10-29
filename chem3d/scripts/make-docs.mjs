// Copies the single-file build to <repo>/docs so GitHub Pages ("Deploy from a branch", folder /docs)
// or any static file host can serve the whole app as one page.
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = resolve(root, '..', 'docs');
mkdirSync(docs, { recursive: true });
copyFileSync(resolve(root, 'dist-single', 'index.html'), resolve(docs, 'index.html'));
// No Jekyll processing: the page is already built.
writeFileSync(resolve(docs, '.nojekyll'), '');
console.log(`wrote ${resolve(docs, 'index.html')}`);
