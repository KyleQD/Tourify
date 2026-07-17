import { chromium } from "playwright"
import fs from "node:fs/promises"
import path from "node:path"

const baseUrl = process.env.TOURIFY_AUDIT_BASE_URL || "https://tourify.live"
const auditDir =
  process.env.TOURIFY_AUDIT_DIR ||
  path.resolve(process.cwd(), "audit-artifacts/live-audit-2026-07-13")
const storageState = path.join(auditDir, "auth-state.json")

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  ignoreHTTPSErrors: true,
  storageState,
})
const page = await context.newPage()
const events = []
let currentStep = "bootstrap"

function addEvent(event) {
  events.push({ step: currentStep, time: new Date().toISOString(), ...event })
}

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    addEvent({ type: "console", level: message.type(), text: message.text(), pageUrl: page.url() })
  }
})
page.on("requestfailed", (request) => {
  addEvent({ type: "requestfailed", method: request.method(), url: request.url(), failure: request.failure()?.errorText })
})
page.on("response", (response) => {
  if (response.status() >= 400) addEvent({ type: "http", status: response.status(), url: response.url() })
})
page.on("pageerror", (error) => addEvent({ type: "pageerror", text: error.message, pageUrl: page.url() }))

function slug(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
}

async function shot(name) {
  const file = path.join(auditDir, `${slug(name)}.png`)
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 8000 })
    return file
  } catch {
    return null
  }
}

async function text() {
  try {
    return await page.locator("body").innerText({ timeout: 7000 })
  } catch {
    return ""
  }
}

async function goto(route, waitMs = 1800) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 })
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(waitMs)
}

async function firstVisible(locator) {
  const count = await locator.count().catch(() => 0)
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible().catch(() => false)) return item
  }
  return null
}

const results = []

async function step(name, fn) {
  const before = events.length
  currentStep = name
  const result = { name, status: "pass", url: "", actual: "", screenshot: null, events: [] }
  try {
    await Promise.race([
      fn(result),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Step timed out after 45000ms")), 45000)),
    ])
  } catch (error) {
    result.status = "fail"
    result.actual = error instanceof Error ? error.message : String(error)
  }
  result.url = page.url()
  result.events = events
    .slice(before)
    .filter((event) => event.type === "pageerror" || event.type === "requestfailed" || (event.type === "http" && event.status >= 500))
    .slice(0, 8)
  if (result.status === "fail" || result.events.length) result.screenshot = await shot(`account_context_${name}_${result.status}`)
  results.push(result)
  await fs.writeFile(path.join(auditDir, "account-context-checkpoint.json"), JSON.stringify({ results, events }, null, 2))
}

async function openSwitcher() {
  await goto("/dashboard")
  const switcher = await firstVisible(
    page.getByRole("button").filter({ hasText: /Personal|Artist|Venue|Organization|Service Provider/i }),
  )
  if (!switcher) throw new Error("Account switcher button was not visible")
  await switcher.click()
  await page.waitForTimeout(600)
}

async function switchToAccount(typeLabel, expectedPath) {
  await openSwitcher()
  const item = await firstVisible(page.getByRole("menuitem").filter({ hasText: new RegExp(typeLabel, "i") }))
  if (!item) throw new Error(`No ${typeLabel} account found in switcher`)
  await item.click()
  await page.waitForURL(new RegExp(expectedPath.replaceAll("/", "\\/")), { timeout: 20000 }).catch(() => {})
  await page.waitForLoadState("networkidle", { timeout: 7000 }).catch(() => {})
  await page.waitForTimeout(2000)
}

async function assertRoute(route, pattern, result) {
  await goto(route)
  const body = await text()
  result.actual += `\n${route} -> ${page.url()} :: ${body.slice(0, 220).replace(/\s+/g, " ")}`
  if (page.url().endsWith("/dashboard") && route !== "/dashboard") {
    throw new Error(`${route} redirected to /dashboard after account switch`)
  }
  if (pattern && !pattern.test(body)) {
    throw new Error(`${route} did not show expected text`)
  }
}

await step("switch to organization", async (result) => {
  await switchToAccount("Organization", "/admin/dashboard")
  const body = await text()
  result.actual = `${page.url()} :: ${body.slice(0, 500)}`
  if (!page.url().includes("/admin/dashboard")) throw new Error("Organization account did not land on /admin/dashboard")
})

await step("organization route smoke", async (result) => {
  for (const [route, pattern] of [
    ["/admin/dashboard/staff", /Staff|Scheduling|Applications/i],
    ["/admin/dashboard/ticketing", /Ticketing|Tickets/i],
    ["/admin/dashboard/logistics", /Logistics|Site|Vendors/i],
    ["/admin/dashboard/store", /Store|Listings/i],
    ["/admin/dashboard/communications", /Communications|Messages/i],
    ["/admin/dashboard/analytics", /Analytics|Reports/i],
    ["/admin/dashboard/rbac", /Roles|Permissions|Access/i],
    ["/admin/dashboard/settings", /Settings|Admin/i],
  ]) {
    await assertRoute(route, pattern, result)
  }
})

await step("switch to venue", async (result) => {
  await switchToAccount("Venue", "/venue/dashboard")
  const body = await text()
  result.actual = `${page.url()} :: ${body.slice(0, 500)}`
  if (!page.url().includes("/venue/dashboard")) throw new Error("Venue account did not land on /venue/dashboard")
})

await step("venue route smoke", async (result) => {
  for (const [route, pattern] of [
    ["/venue/dashboard/teams", /Team|Staff|Roles/i],
    ["/venue/dashboard/tickets", /Tickets|Ticketing/i],
    ["/venue/dashboard/site-maps", /Site Maps|Maps|Logistics/i],
    ["/venue/dashboard/integrations", /Integrations|Connect/i],
  ]) {
    await assertRoute(route, pattern, result)
  }
})

await step("switch to artist", async (result) => {
  await switchToAccount("Artist", "/artist")
  const body = await text()
  result.actual = `${page.url()} :: ${body.slice(0, 500)}`
  if (!page.url().includes("/artist")) throw new Error("Artist account did not land on /artist")
})

await step("artist problem route smoke", async (result) => {
  for (const [route, pattern] of [
    ["/artist/bookings", /Bookings|Requests/i],
    ["/artist/settings", /Settings|Artist/i],
  ]) {
    await assertRoute(route, pattern, result)
  }
})

const report = { generatedAt: new Date().toISOString(), baseUrl, auditDir, results, events }
await fs.writeFile(path.join(auditDir, "account-context-audit.json"), JSON.stringify(report, null, 2))
await browser.close()
console.log(JSON.stringify({ auditDir, results: results.map((result) => ({ name: result.name, status: result.status, url: result.url, actual: result.actual.slice(0, 300) })) }, null, 2))
