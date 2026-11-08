import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui', timeout: 30_000, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', browserName: 'chromium', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' } },
  webServer: { command: 'node scripts/serve.mjs', port: 4173, reuseExistingServer: !process.env.CI },
});
