import { defineConfig, devices } from '@playwright/test';

/**
 * E2E tests record a video for each test. Run with:
 *   npm run test:e2e
 * Videos are saved to video-library/recordings/ (one per test).
 * Start the app first: npm run dev (or use a deployed URL via BASE_URL).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'video-library/playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'only-on-failure',
  },
  outputDir: 'video-library/test-results',
  projects: [
    {
      name: 'participant',
      testMatch: /participant.*\.spec\.ts/,
      use: {
        extraHTTPHeaders: { 'x-e2e': 'true' },
      },
    },
    { name: 'organiser', testMatch: /organiser.*\.spec\.ts/ },
    { name: 'admin', testMatch: /admin.*\.spec\.ts/ },
  ],
});
