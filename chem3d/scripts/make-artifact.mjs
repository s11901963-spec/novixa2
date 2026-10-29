// Turns the single-file build (dist-single/index.html) into a page fragment for hosts that
// supply their own <html>/<head>/<body> skeleton (e.g. a shared-page viewer):
// keeps <title>, meta description, inline <style>/<script>, and the #root element.
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2] ?? 'dist-single/index.html';
const dest = process.argv[3] ?? 'dist-single/chem3d-lab.html';
const html = readFileSync(src, 'utf8');
const head = /<head>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? '';
const body = /<body>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? '';
const title = /<title>[\s\S]*?<\/title>/i.exec(head)?.[0] ?? '<title>Chem3D Lab</title>';
const description = /<meta name="description"[^>]*>/i.exec(head)?.[0] ?? '';
const blocks = [...head.matchAll(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((m) => m[0]);
const out = [title, '<meta name="claude:viewport-fit-sides" content="cover">', description, ...blocks, body.trim()].join('\n');
writeFileSync(dest, out);
console.log(`wrote ${dest} (${(out.length / 1024).toFixed(0)} KiB)`);
