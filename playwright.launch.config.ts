import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: "./tests/e2e/launch-certification",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  globalSetup: "./tests/e2e/launch-certification/global-setup.ts",
  reporter: [
    ["list"],
    ["./tests/e2e/launch-certification/fail-on-skipped-reporter.ts"],
    ["html", { outputFolder: "playwright-report/launch-certification", open: "never" }],
    ["json", { outputFile: "test-results/launch-certification/results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "lifecycle-chromium",
      grep: /@lifecycle/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "surface-desktop-chromium",
      grep: /@surface/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "surface-mobile-chromium",
      grep: /@surface/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "surface-tablet-chromium",
      grep: /@surface/,
      use: { ...devices["iPad Mini"] },
    },
  ],
})
