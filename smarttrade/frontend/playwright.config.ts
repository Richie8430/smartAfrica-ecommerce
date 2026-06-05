import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  timeout:       30_000,
  retries:       process.env['CI'] ? 2 : 0,
  workers:       process.env['CI'] ? 1 : 2,
  reporter:      [['html', { open: 'never' }], ['list']],
  fullyParallel: false,  // Tests share DB state; keep sequential within suites

  use: {
    baseURL:             'http://localhost:5173',
    screenshot:          'only-on-failure',
    video:               'retain-on-failure',
    trace:               'retain-on-failure',
    headless:            true,
    actionTimeout:       10_000,
    navigationTimeout:   20_000,
  },

  projects: [
    {
      name:  'chromium',
      use:   { ...devices['Desktop Chrome'] },
    },
    {
      name:  'firefox',
      use:   { ...devices['Desktop Firefox'] },
      // Skip WebAuthn tests on Firefox (CDP virtual authenticator is Chromium-only)
      testIgnore: ['**/webauthn.spec.ts'],
    },
  ],

  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  // Assumes both servers are already running locally.
  // In CI, add webServer entries to start them first.
  webServer: [
    {
      command:             'npm run dev',
      url:                 'http://localhost:5173',
      reuseExistingServer: !process.env['CI'],
      timeout:             30_000,
    },
    {
      command:             'cd ../backend && npm run dev',
      url:                 'http://localhost:4000/api/v1/health',
      reuseExistingServer: !process.env['CI'],
      timeout:             30_000,
    },
  ],
});
