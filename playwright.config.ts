import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './checks',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    viewport: { width: 390, height: 844 },
    trace: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
