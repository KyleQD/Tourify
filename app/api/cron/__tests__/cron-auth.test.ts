import { NextRequest } from "next/server"

const cronRoutes = [
  { path: "admin-publication-outbox", method: "GET" },
  { path: "contract-sign-reminders", method: "GET" },
  { path: "event-reminders", method: "GET" },
  { path: "events/sync", method: "POST" },
  { path: "social-analytics", method: "GET" },
  { path: "staffing-overview-refresh", method: "GET" },
  { path: "ticket-invite-expiry", method: "GET" },
  { path: "workflow-automations", method: "GET" },
] as const

describe("cron route authorization", () => {
  const previousCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = "local-cron-secret"
  })

  afterAll(() => {
    if (previousCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previousCronSecret
  })

  it.each(cronRoutes)("rejects an unsigned request to /api/cron/$path", async ({ path, method }) => {
    const route = await import(`../${path}/route`)
    const request = new NextRequest(`https://tourify.local/api/cron/${path}`, { method })
    const response = await route[method](request)

    expect(response.status).toBe(401)
  })
})
