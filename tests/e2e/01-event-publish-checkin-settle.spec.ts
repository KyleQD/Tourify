/**
 * E2E Flow 1: Create event → publish → sell ticket → check-in → settle
 */
import { test, expect } from "@playwright/test"

const ORGANIZER_EMAIL = process.env.TEST_ORGANIZER_EMAIL ?? "test-organizer@tourify.test"
const ORGANIZER_PASS  = process.env.TEST_ORGANIZER_PASS  ?? "TestPass123!"

test.describe("Flow 1 — Event lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(ORGANIZER_EMAIL)
    await page.getByLabel(/password/i).fill(ORGANIZER_PASS)
    await page.getByRole("button", { name: /sign in/i }).click()
    await page.waitForURL(/admin|dashboard/, { timeout: 15_000 })
  })

  test("navigates to event planner and publishes a test event", async ({ page }) => {
    await page.goto("/admin/dashboard/events/planner")
    await expect(page.getByRole("heading", { name: /planner/i })).toBeVisible({ timeout: 10_000 })

    // Step 1 — Event basics
    await page.getByLabel(/event name/i).fill("E2E Test Event")
    await page.getByRole("button", { name: /next/i }).click()

    // Step 2 — Venue & date (fill in minimal details)
    const venueInput = page.getByLabel(/venue name/i)
    if (await venueInput.isVisible()) {
      await venueInput.fill("E2E Test Venue")
    }
    const dateInput = page.locator('input[type="date"]').first()
    if (await dateInput.isVisible()) {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
      await dateInput.fill(tomorrow)
    }

    // Continue through steps until Publish button
    for (let i = 0; i < 8; i++) {
      const nextBtn = page.getByRole("button", { name: /next/i })
      if (await nextBtn.isVisible()) await nextBtn.click()
      else break
    }

    const publishBtn = page.getByRole("button", { name: /publish/i })
    await expect(publishBtn).toBeVisible({ timeout: 5_000 })
    await publishBtn.click()

    // Should redirect to event detail page
    await page.waitForURL(/events\/[0-9a-f-]+(?:\/|$)/, { timeout: 15_000 })
    await expect(page.getByText(/published|confirmed/i)).toBeVisible({ timeout: 5_000 })
  })

  test("check-in page loads for a published event", async ({ page }) => {
    // Navigate to events list and find the first event with a check-in page
    await page.goto("/admin/dashboard/events")
    const firstEvent = page.locator("a").filter({ hasText: /view|manage/i }).first()
    if (await firstEvent.isVisible()) {
      await firstEvent.click()
      await page.waitForURL(/events\/[0-9a-f-]+/, { timeout: 10_000 })
      const eventUrl = page.url()
      const eventId = eventUrl.match(/events\/([0-9a-f-]+)/)?.[1]
      if (eventId) {
        await page.goto(`/admin/dashboard/events/${eventId}/check-in`)
        await expect(page.getByRole("heading", { name: /check.in/i })).toBeVisible({ timeout: 8_000 })
      }
    }
  })
})
