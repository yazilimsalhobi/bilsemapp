const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/browser', workers: 1,
  use: { channel: 'msedge', headless: true, viewport: { width: 390, height: 844 } },
  webServer: [
    { command: 'node tests/dev-server.cjs', url: 'http://127.0.0.1:8765', reuseExistingServer: true },
    { command: 'npm run dev:theme -- --port 5173', url: 'http://127.0.0.1:5173/examples/theme-engine/', reuseExistingServer: true }
  ]
});
