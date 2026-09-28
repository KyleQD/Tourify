import { defineConfig, devices } from "@playwright/test"

// Pull-request E2E must fail fast and be attributable.
//
// QA-003/Wave 32: this job had no `globalTimeout`, so a hung spec silently
// consumed the remaining CI job budget and the run was reported as an ambiguous
// cancelled job with no failing test name. `globalTimeout` bounds the whole run
// so a hang fails as "E2E run exceeded global timeout" instead.
//
// The job also reported green when every test skipped, because Playwright exits 0
// on an all-skipped run. `fail-on-skipped-reporter` makes a skip a hard failure,
// which is what QA-003's "no accidental skips" criterion requires.
const GLOBAL_TIMEOUT_MS = 20 * 60_000
const TEST_TIMEOUT_MS = 2 * 60_000

export default defineConfig({
  testDir: "./tests/e2e",
  // The launch-certification suite lives under this testDir but loads its
  // protected QA_CERT fixture at module scope. Without this, `npm run test:e2e`
  // aborted during collection with "QA_CERT_FIXTURE_PATH is required" and
  // "Total: 0 tests in 0 files" in every environment that does not hold launch
  // secrets, so the PR suite could not run at all. It has its own config,
  // playwright.launch.config.ts, and its own fail-closed harness.
  testIgnore: ["**/launch-certification/**"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  globalTimeout: GLOBAL_TIMEOUT_MS,
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["./tests/e2e/helpers/fail-on-skipped-reporter.ts", { label: "PR E2E" }],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
      },
})
