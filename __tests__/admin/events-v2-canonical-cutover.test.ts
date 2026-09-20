import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("DB-006 events_v2 canonical cutover", () => {
  const canonicalCallers = [
    "app/api/tours/planner/route.ts",
    "lib/services/dashboard.service.ts",
    "app/api/analytics/route.ts",
    "app/api/calendar/me/route.ts",
    "app/api/community/stats/route.ts",
    "app/api/cron/event-reminders/route.ts",
  ]

  it.each(canonicalCallers)("keeps %s on events_v2 without a legacy probe", (path) => {
    const caller = source(path)

    expect(caller).toMatch(/events_v2/)
    expect(caller).not.toMatch(/\.from\(\s*[\"']events[\"']\s*\)/)
  })

  it("keeps the tour planner on linked canonical event relations", () => {
    const planner = source("app/api/tours/planner/route.ts")

    expect(planner).toContain("events_v2 (")
    expect(planner).toContain("const eventsForPlanner = linkedEvents")
  })
})
