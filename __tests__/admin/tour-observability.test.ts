import { beforeEach, describe, expect, it } from "vitest"

import {
  clearRecentTourTelemetry,
  getRecentTourTelemetry,
  recordLegacyTourRouteHit,
  recordTourClientFanout,
  recordTourSummaryTelemetry,
  withTourListTelemetry,
} from "@/lib/admin/tour-observability"

describe("TOUR-106 tour observability", () => {
  beforeEach(() => {
    clearRecentTourTelemetry()
  })

  it("records list latency and denied/failed outcomes", async () => {
    await withTourListTelemetry({
      endpoint: "/api/admin/tours",
      orgId: "org-1",
      userId: "user-1",
      getStatus: () => 200,
      run: async () => ({ status: 200 }),
    })

    await withTourListTelemetry({
      endpoint: "/api/admin/tours",
      orgId: "org-1",
      userId: "user-1",
      getStatus: () => 403,
      run: async () => ({ status: 403 }),
    })

    await withTourListTelemetry({
      endpoint: "/api/admin/tours",
      orgId: "org-1",
      userId: "user-1",
      getStatus: () => 500,
      run: async () => ({ status: 500 }),
    })

    const events = getRecentTourTelemetry()
    expect(events.some((event) => event.eventName === "tour.list")).toBe(true)
    expect(events.some((event) => event.eventName === "tour.access_denied")).toBe(true)
    expect(events.some((event) => event.eventName === "tour.request_failed")).toBe(true)
    expect(events.find((event) => event.eventName === "tour.list")?.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it("records summary, stale, legacy, and client fanout", async () => {
    await recordTourSummaryTelemetry({
      endpoint: "/api/admin/tours/[id]",
      orgId: "org-1",
      tourId: "tour-1",
      statusCode: 200,
      latencyMs: 12,
      isStale: true,
    })
    await recordLegacyTourRouteHit({
      endpoint: "/api/tours",
      statusCode: 200,
      latencyMs: 9,
    })
    await recordTourClientFanout({
      endpoint: "/admin/dashboard/tours/[id]",
      fanoutCount: 5,
      tourId: "tour-1",
    })

    const names = getRecentTourTelemetry().map((event) => event.eventName)
    expect(names).toContain("tour.summary")
    expect(names).toContain("tour.stale_read")
    expect(names).toContain("tour.legacy_route")
    expect(names).toContain("tour.client_fanout")
  })
})
