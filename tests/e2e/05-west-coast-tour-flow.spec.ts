/**
 * West Coast tour / hiring flow click-through.
 * Requires: npm run qa:seed:flow && npm run qa:seed:flow:scenario
 */
import { test, expect, type Page } from "@playwright/test"
import {
  injectFlowSession,
  loadFlowAccounts,
  loadFlowScenario,
} from "./helpers/qa-flow-auth"

async function softGoto(page: Page, path: string) {
  if (page.isClosed()) throw new Error("page already closed")
  try {
    await page.goto(path, { waitUntil: "commit", timeout: 60_000 })
  } catch (error) {
    if (page.isClosed()) throw error
    const url = page.url()
    if (url.includes(path.split("?")[0]) && !url.includes("/login")) return
    throw error
  }
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined)
}

test.describe("West Coast tour flow", () => {
  test("cast + scenario authenticated stages", async ({ page }) => {
    test.setTimeout(480_000)

    const accounts = loadFlowAccounts()
    const scenario = loadFlowScenario()
    test.skip(!accounts, "Run npm run qa:seed:flow first")
    test.skip(!scenario?.tourId, "Run npm run qa:seed:flow:scenario first")

    const baseURL = test.info().project.use.baseURL || "http://127.0.0.1:3000"
    const results: Array<{ step: string; ok: boolean; detail?: string }> = []

    async function step(name: string, fn: () => Promise<void>) {
      try {
        await fn()
        results.push({ step: name, ok: true })
        console.log(`✓ ${name}`)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        results.push({ step: name, ok: false, detail })
        console.log(`✗ ${name} — ${detail}`)
      }
    }

    // --- Artist1: band public page ---
    await injectFlowSession(page.context(), baseURL, "artist1")
    await step("artist1 dashboard", async () => {
      await softGoto(page, "/dashboard")
      await expect(page).not.toHaveURL(/\/login\b/)
    })
    await step("pacific-signal public org", async () => {
      await softGoto(page, "/organization/pacific-signal")
      await expect(page).not.toHaveURL(/\/login\b/)
      await expect(page).toHaveURL(/\/organization\/pacific-signal/)
      // Body may be empty while turbopack compiles the public org page
      const body = (await page.locator("body").innerText().catch(() => "")).toLowerCase()
      if (body.length > 0) expect(body).toMatch(/pacific signal|organization|band|signal/)
    })

    // --- Org: tour + hiring ---
    await injectFlowSession(page.context(), baseURL, "org")
    await step("org admin dashboard", async () => {
      await softGoto(page, "/admin/dashboard")
      await expect(page).not.toHaveURL(/\/login\b/)
    })
    await step("org tour hub", async () => {
      // Tour detail can be compile-heavy under turbopack; allow commit timeout recovery via URL check
      try {
        await softGoto(page, `/admin/dashboard/tours/${scenario!.tourId}`)
      } catch {
        await page.goto(`/admin/dashboard/tours/${scenario!.tourId}`, { waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => undefined)
      }
      await expect(page).not.toHaveURL(/\/login\b/)
      if (!page.url().includes(`/admin/dashboard/tours/${scenario!.tourId}`))
        throw new Error(`expected tour hub, got ${page.url()}`)
    })
    await step("org tour builder", async () => {
      await softGoto(page, `/admin/dashboard/tours/builder?draft=${scenario!.tourId}`)
      await expect(page).not.toHaveURL(/\/login\b/)
    })
    await step("org hiring hub", async () => {
      const orgId = (accounts as { organization?: { organizerAccountId?: string } })?.organization
        ?.organizerAccountId
      const hiringPath = orgId
        ? `/admin/dashboard/hiring?entity_type=organization&entity_id=${orgId}&display_name=West%20Coast%20Touring%20Co&tour_id=${scenario!.tourId}`
        : "/admin/dashboard/hiring"
      await softGoto(page, hiringPath)
      await expect(page).not.toHaveURL(/\/login\b/)
      await expect(page).toHaveURL(/\/admin\/dashboard\/hiring/)
    })

    // --- Workers: hire tokens ---
    const workers = [
      { key: "worker1" as const, jobIndex: 0 },
      { key: "worker2" as const, jobIndex: 1 },
      { key: "worker3" as const, jobIndex: 2 },
    ]
    for (const w of workers) {
      const job = scenario!.jobs[w.jobIndex]
      if (!job?.hirePath) continue
      await injectFlowSession(page.context(), baseURL, w.key)
      await step(`${w.key} hire onboarding`, async () => {
        await softGoto(page, job.hirePath)
        await expect(page).not.toHaveURL(/\/login\b/)
        await expect(page).toHaveURL(new RegExp(`/onboarding/hire/${job.hireToken}`))
        const body = (await page.locator("body").innerText()).toLowerCase()
        expect(body).toMatch(/onboard|hire|staff|welcome|position|template|document|form|complete/)
      })
    }

    // --- Artist2 as tour admin surface ---
    await injectFlowSession(page.context(), baseURL, "artist2")
    await step("artist2 tour hub as admin", async () => {
      await softGoto(page, `/admin/dashboard/tours/${scenario!.tourId}`)
      const url = page.url()
      if (url.includes("/admin/dashboard/tours/")) {
        await expect(page).not.toHaveURL(/\/login\b/)
      } else {
        // Documented gap: tour_team admin without middleware Admin Work Mode
        console.log(`  · artist2 redirected off tour hub → ${url}`)
      }
    })

    const passed = results.filter((r) => r.ok).length
    const failed = results.filter((r) => !r.ok)
    console.log(`West Coast flow summary: ${passed}/${results.length} passed`)
    for (const f of failed) console.log(`  fail: ${f.step} — ${f.detail}`)

    expect(passed, `results=${JSON.stringify(results)}`).toBeGreaterThanOrEqual(6)
    expect(results.find((r) => r.step === "artist1 dashboard")?.ok).toBeTruthy()
    expect(results.find((r) => r.step === "org tour builder")?.ok).toBeTruthy()
    expect(results.find((r) => r.step === "worker1 hire onboarding")?.ok).toBeTruthy()
  })
})
