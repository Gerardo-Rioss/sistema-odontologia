import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * - Runs against the Next.js dev server (localhost:3000).
 * - Chromium only (matches the dentist's desktop workflow).
 * - Serial execution to avoid DB race conditions in smoke tests.
 * - 2 retries for CI flakiness mitigation.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 2,
  forbidOnly: !!process.env.CI,
  workers: 1,

  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
  },
});
