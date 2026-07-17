/**
 * E2E Flow 3: Hire staff → schedule shift → verify
 */
import { test, expect } from "@playwright/test"

const ORGANIZER_EMAIL = process.env.TEST_ORGANIZER_EMAIL ?? "test-organizer@tourify.test"
const ORGANIZER_PASS  = process.env.TEST_ORGANIZER_PASS  ?? "TestPass123!"

test.describe("Flow 3 — Staff hiring", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login?tab=signin")
    await page.locator("#portal-signin-email").fill(ORGANIZER_EMAIL)
    await page.locator("#portal-signin-password").fill(ORGANIZER_PASS)
    await page.getByRole("button", { name: /^sign in$/i }).click()
    await page.waitForURL(/admin|dashboard/, { timeout: 15_000 })
  })

  test("staff page loads without errors", async ({ page }) => {
    await page.goto("/admin/dashboard/staff")
    await expect(page.locator("body")).not.toContainText("500", { timeout: 8_000 })
    await expect(page.getByRole("heading", { name: /staff/i })).toBeVisible({ timeout: 8_000 })
  })

  test("staff scheduling tab loads without dashboard fatal error", async ({ page }) => {
    await page.goto("/admin/dashboard/staff?tab=scheduling")
    await expect(page.locator("body")).not.toContainText("Error Loading Dashboard", { timeout: 8_000 })
    await expect(page.locator("body")).toContainText(/Scheduling & Shifts|Venue required/, { timeout: 8_000 })
  })

  test("applications page loads", async ({ page }) => {
    await page.goto("/admin/applications")
    await expect(page.locator("body")).not.toContainText("500", { timeout: 8_000 })
  })

  test("RBAC page loads", async ({ page }) => {
    await page.goto("/admin/dashboard/rbac")
    await expect(page.locator("body")).not.toContainText("500", { timeout: 8_000 })
  })
})
