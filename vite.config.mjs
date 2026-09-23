import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  build: { rollupOptions: { input: 'examples/theme-engine/index.html' } },
  plugins: [{ name: 'shared-theme-bootstrap', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'js/theme.js', source: readFileSync('js/theme.js', 'utf8') });
  } }]
});
