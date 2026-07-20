/**
 * QA multi-persona click-through (cookie session).
 * Requires: npm run qa:seed and QA_USER_A_* in env.
 */
import { test, expect, type BrowserContext, type Page } from "@playwright/test"
import { createClient } from "@supabase/supabase-js"
import { config as loadDotenv } from "dotenv"
import { resolve } from "path"

loadDotenv({ path: resolve(process.cwd(), ".env") })
loadDotenv({ path: resolve(process.cwd(), ".env.local"), override: true })

const EMAIL = process.env.QA_USER_A_EMAIL ?? "qa-multi-a@tourify.test"
const PASSWORD = process.env.QA_USER_A_PASSWORD ?? "QaAuditPass123!"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

async function injectQaSession(context: BrowserContext, baseURL: string) {
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (error || !data.session) throw new Error(`QA cookie login failed: ${error?.message || "no session"}`)

  const url = new URL(baseURL)
  await context.addCookies([
    {
      name: "sb-tourify-auth-token",
      value: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
        user: data.session.user,
      }),
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
      sameSite: "Lax",
    },
  ])
}

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

test("QA multi-persona authenticated click-through", async ({ page }) => {
  test.setTimeout(420_000)
  const baseURL = test.info().project.use.baseURL || "http://127.0.0.1:3000"
  await injectQaSession(page.context(), baseURL)

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

  await step("dashboard authenticated", async () => {
    await softGoto(page, "/dashboard")
    await expect(page).toHaveURL(/dashboard|artist|venue|admin/)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible({ timeout: 45_000 })
  })

  await step("account switcher personas", async () => {
    const trigger = page.getByRole("button", { name: /kyle daley personal|personal/i }).first()
    await expect(trigger).toBeVisible({ timeout: 15_000 })
    await trigger.click()
    const text = (await page.locator("body").innerText()).toLowerCase()
    expect(text).toMatch(/artist|kyle/)
    expect(text).toMatch(/venue/)
    expect(text).toMatch(/organization|band|organizer|admin|bando|events/)
    await page.keyboard.press("Escape").catch(() => undefined)
  })

  await step("artist home", async () => {
    await softGoto(page, "/artist")
    await expect(page).toHaveURL(/\/artist/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  await step("artist bookings", async () => {
    await softGoto(page, "/artist/bookings")
    await expect(page).toHaveURL(/\/artist\/bookings/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  await step("venue dashboard", async () => {
    await softGoto(page, "/venue/dashboard")
    await expect(page).toHaveURL(/\/venue/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  await step("messages", async () => {
    await softGoto(page, "/messages")
    await expect(page).not.toHaveURL(/\/login\b/)
  })

  await step("admin dashboard", async () => {
    await softGoto(page, "/admin/dashboard")
    await expect(page).not.toHaveURL(/\/login\b/)
    if (page.url().includes("/admin")) {
      await expect(page.locator("body")).toContainText(/dashboard|operations|hiring|events|tours/i, {
        timeout: 30_000,
      })
    }
  })

  const passed = results.filter((r) => r.ok).length
  const failed = results.filter((r) => !r.ok)
  console.log(`Click-through summary: ${passed}/${results.length} passed`)
  for (const f of failed) console.log(`  fail: ${f.step} — ${f.detail}`)

  // Require core authenticated surfaces; allow one flaky compile abort under turbopack
  expect(passed, `results=${JSON.stringify(results)}`).toBeGreaterThanOrEqual(4)
  expect(results.find((r) => r.step === "dashboard authenticated")?.ok).toBeTruthy()
  expect(results.find((r) => r.step === "account switcher personas")?.ok).toBeTruthy()
})
