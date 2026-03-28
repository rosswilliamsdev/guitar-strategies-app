import { defineConfig, devices } from "@playwright/test";

/**
 * CI-Optimized Playwright Configuration for GitHub Actions
 *
 * Key differences from playwright.config.ts:
 * - Chromium only (skip Firefox/WebKit for speed and stability)
 * - Excludes auth-student-login.spec.ts (known flaky due to WebKit/auth issues)
 * - Production build (npm run build && start) for stability
 * - GitHub reporter for inline CI annotations
 * - Retain traces on failure for debugging
 * - 2-minute webServer timeout for cold build + start
 *
 * Usage: npx playwright test --config=playwright.config.ci.ts
 */
export default defineConfig({
  testDir: "./tests",

  /* Run tests in files sequentially to avoid session conflicts */
  fullyParallel: false,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: true,

  /* Retry failed tests for CI stability */
  retries: 2,

  /* Parallel workers - safe for our storageState-based tests */
  workers: 2,

  /* GitHub-native reporter for CI annotations */
  reporter: "github",

  /* Global setup - authenticate once and save state */
  globalSetup: require.resolve("./playwright/global-setup"),

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('')` */
    baseURL: "http://localhost:3000",

    /* Retain trace on failure for debugging CI-only issues */
    trace: "retain-on-failure",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },

      /* Exclude known flaky tests */
      testIgnore: [
        "**/auth-student-login.spec.ts", // Flaky due to WebKit cookie issues and auth timeouts
      ],
    },
  ],

  /* Run production build before tests for stability */
  webServer: {
    command: "npm run build && cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static && node .next/standalone/server.js",
    url: "http://localhost:3000",
    timeout: 120000, // 2 minutes for build + startup
    reuseExistingServer: false, // Always fresh server in CI
  },
});
