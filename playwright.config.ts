import { defineConfig, devices } from '@playwright/test';

// End-to-end tests against the real API, web app and database, with the mock LLM.
// Run: pnpm build && pnpm e2e (the database must be migrated and seeded).
const api = 'http://127.0.0.1:3101';
const web = 'http://127.0.0.1:3100';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : 'line',
  use: {
    baseURL: web,
    trace: 'off',
    locale: 'fr-FR',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node --import tsx src/main.ts',
      cwd: 'apps/api',
      url: `${api}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        API_PORT: '3101',
        WEB_URL: web,
        // E-mail confirmation is covered by the API tests; here it would need a mailbox.
        REQUIRE_EMAIL_VERIFICATION: 'false',
        LLM_EXAMINER_PROVIDER: 'mock',
        LLM_TUTOR_PROVIDER: 'mock',
        LLM_CONTENT_GENERATION_PROVIDER: 'mock',
      },
    },
    {
      command: 'node_modules/.bin/next start --hostname 127.0.0.1 --port 3100',
      cwd: 'apps/web',
      url: web,
      reuseExistingServer: !process.env.CI,
      env: { API_URL: api, WEB_URL: web, WEB_INSECURE_COOKIES: 'true' },
    },
  ],
});
