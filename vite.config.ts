import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import type { Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Some bundled libraries contain a literal U+FFFD inside JS strings. Escape it so the
// single-file HTML is clean UTF-8 for hosts that reject replacement characters.
const escapeReplacementChar = (): Plugin => ({
  name: 'escape-replacement-char',
  enforce: 'post',
  writeBundle(options) {
    const file = path.join(options.dir ?? 'dist-single', 'index.html');
    if (fs.existsSync(file)) fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/\uFFFD/g, '\\uFFFD'));
  },
});

// `npm run build`        -> normal multi-file production build in dist/
// `npm run build:single` -> one self-contained dist-single/index.html (handy for sharing a demo)
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile(), escapeReplacementChar()] : [react()],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
