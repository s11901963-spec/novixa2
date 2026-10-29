/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';

/** Single-file builds inline every font; keep only the woff2 sources so the page stays small. */
function woff2Only(): Plugin {
  return {
    name: 'chem3d-woff2-only',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css') || !/(katex|@fontsource)/.test(id)) return null;
      return code.replace(/,\s*url\([^)]*\.(?:woff|ttf)\)\s*format\(["'](?:woff|truetype)["']\)/g, '');
    },
  };
}

// `npm run build` produces a normal static site in dist/.
// `npm run build:single` produces one self-contained HTML file in dist-single/
// (useful for sharing a demo without a server).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'singlefile' ? [woff2Only(), viteSingleFile()] : [])],
  build: {
    outDir: mode === 'singlefile' ? 'dist-single' : 'dist',
    // three.js + KaTeX make one large chunk; the lab is the landing page, so splitting it would not speed up first load.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
