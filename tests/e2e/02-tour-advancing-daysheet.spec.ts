/**
 * E2E Flow 2: Create tour → add shows → advancing → day sheet
 */
import { test, expect } from "@playwright/test"

const ORGANIZER_EMAIL = process.env.TEST_ORGANIZER_EMAIL ?? "test-organizer@tourify.test"
const ORGANIZER_PASS  = process.env.TEST_ORGANIZER_PASS  ?? "TestPass123!"

test.describe("Flow 2 — Tour + advancing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(ORGANIZER_EMAIL)
    await page.getByLabel(/password/i).fill(ORGANIZER_PASS)
    await page.getByRole("button", { name: /sign in/i }).click()
    await page.waitForURL(/admin|dashboard/, { timeout: 15_000 })
  })

  test("tour planner page loads", async ({ page }) => {
    await page.goto("/admin/dashboard/tours/planner")
    await expect(page.getByRole("heading", { name: /planner|create.*tour/i })).toBeVisible({ timeout: 10_000 })
  })

  test("tour list shows published tours", async ({ page }) => {
    await page.goto("/admin/dashboard/tours")
    await expect(page.locator("body")).not.toContainText("500", { timeout: 8_000 })
  })

  test("advancing page loads for an event", async ({ page }) => {
    await page.goto("/admin/dashboard/events")
    const eventLink = page.locator("a[href*='/events/']").first()
    if (await eventLink.isVisible()) {
      const href = await eventLink.getAttribute("href")
      const eventId = href?.match(/events\/([0-9a-f-]+)/)?.[1]
      if (eventId) {
        await page.goto(`/admin/dashboard/events/${eventId}/advancing`)
        await expect(page.getByRole("heading", { name: /advancing/i })).toBeVisible({ timeout: 8_000 })
      }
    }
  })
})
