import { describe, expect, it } from "vitest"

import {
  logisticsOverviewHref,
  parseLogisticsOverviewQuery,
} from "@/lib/admin/logistics-overview"
import {
  ADMIN_API_ROUTE_REGISTRY,
  adminCommandCapabilities,
} from "@/lib/admin/api-route-registry"

describe("admin logistics overview contract", () => {
  it("defaults to a bounded organization portfolio", () => {
    const query = parseLogisticsOverviewQuery(new URLSearchParams())

    expect(query.limit).toBe(50)
    expect(query.attentionOnly).toBe(false)
    expect(query.domain).toEqual([])
    expect(query.severity).toEqual([])
    expect(Date.parse(query.to || "")).toBeGreaterThan(Date.parse(query.from || ""))
  })

  it("parses scope and attention filters", () => {
    const tourId = "11111111-1111-4111-8111-111111111111"
    const eventId = "22222222-2222-4222-8222-222222222222"
    const query = parseLogisticsOverviewQuery(new URLSearchParams({
      tourId,
      eventId,
      domain: "tasks,site_maps",
      severity: "critical,high",
      attentionOnly: "true",
      limit: "25",
    }))

    expect(query).toMatchObject({
      tourId,
      eventId,
      domain: ["tasks", "site_maps"],
      severity: ["critical", "high"],
      attentionOnly: true,
      limit: 25,
    })
  })

  it("rejects invalid filters and inverted date ranges", () => {
    expect(() => parseLogisticsOverviewQuery(new URLSearchParams({ domain: "unknown" })))
      .toThrow("Unsupported values")
    expect(() => parseLogisticsOverviewQuery(new URLSearchParams({
      from: "2026-10-10T00:00:00.000Z",
      to: "2026-10-01T00:00:00.000Z",
    }))).toThrow("start date")
  })

  it("builds only recognized actionable deep-link parameters", () => {
    const href = logisticsOverviewHref({
      tab: "maps",
      tourId: "tour-1",
      eventId: "event-1",
      siteMapId: "map-1",
    })

    expect(href).toBe("/admin/dashboard/logistics?tab=maps&tourId=tour-1&eventId=event-1&siteMapId=map-1")
    expect(href).not.toContain("sourceType")
  })

  it("registers the endpoint under logistics.view", () => {
    const entry = ADMIN_API_ROUTE_REGISTRY.find((candidate) => candidate.route === "/api/admin/logistics/overview")

    expect(entry?.authClass).toBe("capability_gated")
    expect(entry?.methods).toEqual(["GET"])
    expect(adminCommandCapabilities(entry!, "GET")).toEqual(["logistics.view"])
  })
})

