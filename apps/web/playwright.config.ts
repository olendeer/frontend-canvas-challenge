import { defineConfig } from '@playwright/test';

const WEB_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4001';

export default defineConfig({
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: WEB_URL, trace: 'retain-on-failure', viewport: { height: 900, width: 1280 } },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../..',
      reuseExistingServer: true,
      timeout: 120_000,
      url: `${API_URL}/api`,
    },
    {
      command: 'npm run dev',
      reuseExistingServer: true,
      timeout: 120_000,
      url: WEB_URL,
    },
  ],
  workers: 1,
});
