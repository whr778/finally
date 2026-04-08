import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for FinAlly system tests.
 *
 * Requires the application to be running at BASE_URL (default: http://localhost:8000).
 * Set LLM_MOCK=true in the environment to use deterministic mock chat responses.
 *
 * Run: npm test (from this directory) — expects the app to be running separately.
 * Or use docker-compose.test.yml in this directory for a full system run.
 */
export default defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
