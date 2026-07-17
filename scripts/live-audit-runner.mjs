import { chromium } from "playwright"
import fs from "node:fs/promises"
import path from "node:path"

const baseUrl = process.env.TOURIFY_AUDIT_BASE_URL || "https://tourify.live"
const email = process.env.TOURIFY_AUDIT_EMAIL
const password = process.env.TOURIFY_AUDIT_PASSWORD
const auditPrefix = process.env.TOURIFY_AUDIT_PREFIX || "Codex Audit 2026-07-13"
const auditDir =
  process.env.TOURIFY_AUDIT_DIR ||
  path.resolve(process.cwd(), "audit-artifacts/live-audit-2026-07-13")

if (!email || !password) {
  throw new Error("TOURIFY_AUDIT_EMAIL and TOURIFY_AUDIT_PASSWORD are required")
}

await fs.mkdir(auditDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  ignoreHTTPSErrors: true,
})

const page = await context.newPage()
const allEvents = []
const results = []
const cleanupItems = []
let currentStep = "bootstrap"

function addEvent(event) {
  allEvents.push({
    step: currentStep,
    time: new Date().toISOString(),
    ...event,
  })
}

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    addEvent({
      type: "console",
      level: message.type(),
      text: message.text(),
      pageUrl: page.url(),
    })
  }
})

page.on("pageerror", (error) => {
  addEvent({
    type: "pageerror",
    text: error.message,
    stack: error.stack,
    pageUrl: page.url(),
  })
})

page.on("requestfailed", (request) => {
  addEvent({
    type: "requestfailed",
    method: request.method(),
    url: request.url(),
    failure: request.failure()?.errorText,
  })
})

page.on("response", (response) => {
  const status = response.status()
  if (status >= 400) {
    addEvent({
      type: "http",
      status,
      url: response.url(),
    })
  }
})

function slug(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "")
}

async function screenshot(name, fullPage = true) {
  const file = path.join(auditDir, `${slug(name)}.png`)
  await page.screenshot({ path: file, fullPage, timeout: 8000 })
  return file
}

async function bodyText(timeout = 8000) {
  try {
    return await page.locator("body").innerText({ timeout })
  } catch {
    return ""
  }
}

function summarizeEvents(events) {
  return events
    .filter(
      (event) =>
        event.type === "pageerror" ||
        event.type === "requestfailed" ||
        (event.type === "http" && event.status >= 500) ||
        (event.type === "console" && event.level === "error"),
    )
    .slice(0, 12)
}

function hasFatalText(text) {
  return /\b(500|Application error|Internal Server Error|Error Loading Dashboard|Unhandled Runtime Error|This page could not be found|404)\b/i.test(
    text,
  )
}

async function runStep(area, name, action, expected, fn, options = {}) {
  const before = allEvents.length
  const started = Date.now()
  currentStep = `${area} :: ${name}`
  const result = {
    area,
    name,
    action,
    expected,
    actual: "",
    url: page.url(),
    status: "pass",
    severity: null,
    screenshot: null,
    events: [],
    durationMs: 0,
  }

  try {
    await Promise.race([
      fn(result),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Step timed out after ${options.timeoutMs || 45000}ms`)),
          options.timeoutMs || 45000,
        ),
      ),
    ])
  } catch (error) {
    result.status = "fail"
    result.severity = options.severity || "major"
    result.actual = error instanceof Error ? error.message : String(error)
  }

  result.url = page.url()
  result.events = summarizeEvents(allEvents.slice(before))
  if (result.status === "fail" || result.events.length > 0 || options.alwaysScreenshot) {
    try {
      result.screenshot = await screenshot(`${area}_${name}_${result.status}`)
    } catch (error) {
      addEvent({
        type: "audit-note",
        text: `Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`,
        pageUrl: page.url(),
      })
      result.screenshot = null
    }
  }
  result.durationMs = Date.now() - started
  results.push(result)
  await fs.writeFile(
    path.join(auditDir, "audit-checkpoint.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        auditPrefix,
        auditDir,
        results,
        allEvents,
        cleanupItems,
      },
      null,
      2,
    ),
  )
  return result
}

async function gotoPath(route, waitMs = 1800) {
  const url = route.startsWith("http") ? route : `${baseUrl}${route}`
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(waitMs)
}

async function assertPageLoads(result, route, containsPattern, waitMs = 1800) {
  await gotoPath(route, waitMs)
  const text = await bodyText()
  result.actual = text.slice(0, 900)
  if (page.url().includes("/login") && !route.includes("/login")) {
    result.severity = "blocker"
    throw new Error(`Redirected to login from ${route}`)
  }
  if (hasFatalText(text)) {
    result.severity = "major"
    throw new Error(`Fatal/error text detected on ${route}`)
  }
  if (containsPattern && !containsPattern.test(text)) {
    result.severity = "minor"
    throw new Error(`Expected page content was not visible on ${route}`)
  }
}

async function firstVisible(locator) {
  const count = await locator.count().catch(() => 0)
  for (let index = 0; index < count; index += 1) {
    const item = locator.nth(index)
    if (await item.isVisible().catch(() => false)) return item
  }
  return null
}

await runStep(
  "Auth/session",
  "public landing loads",
  "Open production root",
  "Marketing page loads without fatal errors",
  async (result) => assertPageLoads(result, "/", /Tourify|open beta|Sign up/i, 2500),
)

await runStep(
  "Auth/session",
  "login page loads sign in tab",
  "Open /login?tab=signin",
  "Sign-in form is visible",
  async (result) => {
    await gotoPath("/login?tab=signin", 2500)
    await page.getByRole("tab", { name: /sign in/i }).click({ timeout: 10000 }).catch(() => {})
    await page.locator("#portal-signin-email").waitFor({ state: "visible", timeout: 15000 })
    result.actual = "Sign-in form fields are visible"
  },
)

await runStep(
  "Auth/session",
  "email password login",
  "Submit provided email/password",
  "User lands on authenticated dashboard/home",
  async (result) => {
    await page.locator("#portal-signin-email").fill(email)
    await page.locator("#portal-signin-password").fill(password)
    await page.getByRole("button", { name: /^sign in/i }).click()
    await page.waitForURL(/\/dashboard|\/admin|\/artist|\/venue/, { timeout: 45000 })
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
    await page.waitForTimeout(5000)
    const text = await bodyText()
    result.actual = `Landed on ${page.url()}\n${text.slice(0, 900)}`
    if (/Create your Tourify account|Sign In/i.test(text) || page.url().includes("/login")) {
      result.severity = "blocker"
      throw new Error("Login did not produce an authenticated dashboard")
    }
  },
  { severity: "blocker", alwaysScreenshot: true },
)

await runStep(
  "Auth/session",
  "refresh keeps session",
  "Refresh authenticated page",
  "Session remains authenticated after refresh",
  async (result) => {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 })
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {})
    await page.waitForTimeout(3500)
    const text = await bodyText()
    result.actual = `After refresh ${page.url()}\n${text.slice(0, 700)}`
    if (/Create your Tourify account|Sign In/i.test(text) || page.url().includes("/login")) {
      result.severity = "blocker"
      throw new Error("Authenticated session was lost after refresh")
    }
  },
)

await context.storageState({ path: path.join(auditDir, "auth-state.json") })

const routeChecks = [
  ["General dashboard", "/dashboard", /Welcome|Dashboard|Profile|Overview|Activity/i],
  ["General dashboard", "/profile", /Profile|Edit|Followers|Posts/i],
  ["General dashboard", "/settings", /Settings|Profile|Account|Notifications/i],
  ["Shared user areas", "/messages", /Messages|Inbox|Conversation/i],
  ["Shared user areas", "/notifications", /Notifications/i],
  ["Shared user areas", "/discover", /Discover|Artists|Venues|Events/i],
  ["Shared user areas", "/news", /News|Industry|Music/i],
  ["Shared user areas", "/jobs", /Jobs|Opportunities|Applications/i],
  ["Shared user areas", "/events", /Events|Discover|Create/i],
  ["Shared user areas", "/feed", /Feed|Posts|Share/i],
  ["Shared user areas", "/marketplace", /Marketplace|Listings|Store|Products/i],
  ["Artist area", "/artist", /Artist|Dashboard|Profile|Music/i],
  ["Artist area", "/artist/profile", /Profile|Artist/i],
  ["Artist area", "/artist/feed", /Feed|Posts/i],
  ["Artist area", "/artist/music", /Music|Tracks|Upload/i],
  ["Artist area", "/artist/events", /Events|Shows|Calendar/i],
  ["Artist area", "/artist/bookings", /Bookings|Requests/i],
  ["Artist area", "/artist/jobs", /Jobs|Opportunities/i],
  ["Artist area", "/artist/epk", /EPK|Press|Kit/i],
  ["Artist area", "/artist/store", /Store|Merch|Products/i],
  ["Artist area", "/artist/settings", /Settings|Artist/i],
  ["Venue area", "/venue/dashboard", /Venue|Dashboard|Events/i],
  ["Venue area", "/venue/dashboard/events", /Events|Calendar/i],
  ["Venue area", "/venue/dashboard/calendar", /Calendar|Events/i],
  ["Venue area", "/venue/dashboard/jobs", /Jobs|Hiring|Applications/i],
  ["Venue area", "/venue/dashboard/teams", /Team|Staff|Roles/i],
  ["Venue area", "/venue/dashboard/tickets", /Tickets|Ticketing/i],
  ["Venue area", "/venue/dashboard/site-maps", /Site Maps|Maps|Logistics/i],
  ["Venue area", "/venue/dashboard/gallery", /Gallery|Photos|Media/i],
  ["Venue area", "/venue/dashboard/epk", /EPK|Profile|Media/i],
  ["Venue area", "/venue/dashboard/settings", /Settings|Venue/i],
  ["Venue area", "/venue/dashboard/integrations", /Integrations|Connect/i],
  ["Admin/organization area", "/admin/dashboard", /Admin|Dashboard|Overview/i],
  ["Admin/organization area", "/admin/dashboard/events", /Events|Create|Calendar/i],
  ["Admin/organization area", "/admin/dashboard/tours", /Tours|Planner/i],
  ["Admin/organization area", "/admin/dashboard/staff", /Staff|Scheduling|Applications/i],
  ["Admin/organization area", "/admin/dashboard/applications", /Applications|Candidates/i],
  ["Admin/organization area", "/admin/dashboard/ticketing", /Ticketing|Tickets/i],
  ["Admin/organization area", "/admin/dashboard/logistics", /Logistics|Site|Vendors/i],
  ["Admin/organization area", "/admin/dashboard/marketplace", /Marketplace|Store|Orders/i],
  ["Admin/organization area", "/admin/dashboard/store", /Store|Listings/i],
  ["Admin/organization area", "/admin/dashboard/communications", /Communications|Messages/i],
  ["Admin/organization area", "/admin/dashboard/analytics", /Analytics|Reports/i],
  ["Admin/organization area", "/admin/dashboard/rbac", /Roles|Permissions|Access/i],
  ["Admin/organization area", "/admin/dashboard/settings", /Settings|Admin/i],
]

for (const [area, route, pattern] of routeChecks) {
  await runStep(area, route, `Open ${route}`, "Page loads authenticated content without fatal UI/runtime errors", async (result) => {
    await assertPageLoads(result, route, pattern)
  })
}

await runStep(
  "Account switching",
  "available accounts and landing routes",
  "Open account switcher and inspect available account types",
  "Account switcher is usable and account types are visible",
  async (result) => {
    await gotoPath("/dashboard", 2500)
    const switcher = await firstVisible(
      page
        .getByRole("button")
        .filter({ hasText: /Personal|Artist|Venue|Organization|Service Provider|Staff/i }),
    )
    if (!switcher) {
      result.severity = "major"
      throw new Error("Could not find account switcher button")
    }
    await switcher.click()
    await page.waitForTimeout(1000)
    const menuText = await bodyText()
    result.actual = menuText.slice(0, 1000)
    for (const label of ["Personal", "Artist", "Venue", "Organization"]) {
      if (new RegExp(label, "i").test(menuText)) continue
      addEvent({ type: "audit-note", text: `Account type not visible in switcher: ${label}`, pageUrl: page.url() })
    }
  },
  { alwaysScreenshot: true },
)

await runStep(
  "General dashboard",
  "quick post validation",
  "Attempt empty quick-post submission without publishing real content",
  "Composer should block empty post or show validation",
  async (result) => {
    await gotoPath("/dashboard", 2500)
    const postButton = await firstVisible(page.getByRole("button", { name: /post|share/i }))
    if (!postButton) {
      result.severity = "minor"
      throw new Error("Could not find dashboard quick-post submit button")
    }
    await postButton.click()
    await page.waitForTimeout(1500)
    const text = await bodyText()
    result.actual = text.slice(0, 800)
    if (/created|posted|published/i.test(text) && !/empty|required|content/i.test(text)) {
      cleanupItems.push("Review dashboard feed for any accidental empty post created by quick-post validation check.")
      result.severity = "major"
      throw new Error("Empty quick-post action appeared to create/publish content")
    }
  },
)

await runStep(
  "Public/marketing",
  "mobile landing viewport",
  "Open marketing page in mobile viewport",
  "Mobile landing renders key CTAs without fatal errors",
  async (result) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await gotoPath("/", 2500)
    const text = await bodyText()
    result.actual = text.slice(0, 900)
    if (!/Sign up|Try the Beta|Tourify/i.test(text)) {
      result.severity = "minor"
      throw new Error("Mobile landing did not show expected Tourify CTA content")
    }
  },
  { alwaysScreenshot: true },
)

await runStep(
  "Auth/session",
  "sign out",
  "Use user menu sign-out if visible",
  "User can sign out or protected route redirects to login in a new context",
  async (result) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await gotoPath("/dashboard", 2500)
    const avatarButton = await firstVisible(page.getByRole("button").filter({ has: page.locator("[data-radix-avatar-image], span") }))
    if (avatarButton) {
      await avatarButton.click().catch(() => {})
      await page.waitForTimeout(500)
      const signOut = await firstVisible(page.getByText(/Sign Out/i))
      if (signOut) {
        await signOut.click()
        await page.waitForTimeout(3000)
      }
    }
    result.actual = `Current URL after sign-out attempt: ${page.url()}`
  },
)

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  auditPrefix,
  auditDir,
  results,
  allEvents,
  cleanupItems,
}

await fs.writeFile(path.join(auditDir, "audit-results.json"), JSON.stringify(report, null, 2))

function severityFor(result) {
  if (result.status === "fail") return result.severity || "major"
  if (result.events.some((event) => event.type === "pageerror" || event.type === "requestfailed" || (event.type === "http" && event.status >= 500))) {
    return "minor"
  }
  return null
}

const grouped = new Map()
for (const result of results) {
  const severity = severityFor(result)
  if (!severity) continue
  if (!grouped.has(result.area)) grouped.set(result.area, [])
  grouped.get(result.area).push({ ...result, severity })
}

let markdown = `# Tourify Live Audit - 2026-07-13\\n\\n`
markdown += `Base URL: ${baseUrl}\\n\\n`
markdown += `Audit prefix: ${auditPrefix}\\n\\n`
markdown += `## Summary\\n\\n`
markdown += `- Steps run: ${results.length}\\n`
markdown += `- Failed steps: ${results.filter((result) => result.status === "fail").length}\\n`
markdown += `- Steps with captured errors: ${results.filter((result) => result.events.length > 0).length}\\n`
markdown += `- Screenshot directory: ${auditDir}\\n\\n`
markdown += `## Issues By Product Area\\n\\n`
if (grouped.size === 0) {
  markdown += `No failures or serious browser/runtime errors captured.\\n\\n`
} else {
  for (const [area, items] of grouped.entries()) {
    markdown += `### ${area}\\n\\n`
    for (const item of items) {
      markdown += `- **${item.severity}**: ${item.name}\\n`
      markdown += `  - URL: ${item.url}\\n`
      markdown += `  - Action: ${item.action}\\n`
      markdown += `  - Expected: ${item.expected}\\n`
      markdown += `  - Actual: ${String(item.actual || "").replace(/\\s+/g, " ").slice(0, 500)}\\n`
      if (item.screenshot) markdown += `  - Screenshot: ${item.screenshot}\\n`
      if (item.events.length) {
        markdown += `  - Evidence:\\n`
        for (const event of item.events.slice(0, 5)) {
          markdown += `    - ${event.type}${event.status ? ` ${event.status}` : ""}: ${String(event.text || event.url || event.failure || "").replace(/\\s+/g, " ").slice(0, 300)}\\n`
        }
      }
    }
    markdown += `\\n`
  }
}
markdown += `## Cleanup\\n\\n`
if (cleanupItems.length) {
  for (const item of cleanupItems) markdown += `- ${item}\\n`
} else {
  markdown += `- No created audit records were detected by the runner.\\n`
}

await fs.writeFile(path.join(auditDir, "audit-report.md"), markdown)
await browser.close()

console.log(
  JSON.stringify(
    {
      auditDir,
      report: path.join(auditDir, "audit-report.md"),
      json: path.join(auditDir, "audit-results.json"),
      steps: results.length,
      failed: results.filter((result) => result.status === "fail").length,
      withErrors: results.filter((result) => result.events.length > 0).length,
      cleanupItems,
    },
    null,
    2,
  ),
)
