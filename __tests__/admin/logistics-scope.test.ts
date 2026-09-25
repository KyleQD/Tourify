import { describe, expect, it } from "vitest"

import {
  assertLogisticsScopeOrgConsistency,
  buildLogisticsScopeSearchParams,
  formatLogisticsScopeBadge,
  normalizeLogisticsTab,
  parseLogisticsScopeParams,
} from "@/lib/admin/logistics-scope"

describe("LOG-104 logistics tour-first scope", () => {
  it("parses organization → tour → event → leg from URL params", () => {
    const scope = parseLogisticsScopeParams(
      new URLSearchParams("orgId=o1&tourId=t1&eventId=e1&legId=NYC&tab=equipment"),
    )
    expect(scope).toEqual({
      orgId: "o1",
      tourId: "t1",
      eventId: "e1",
      legId: "NYC",
      tab: "equipment",
      stopId: null,
      panel: null,
      issueId: null,
      recordId: null,
      siteMapId: null,
    })
  })

  it("normalizes legacy tabs into the five primary destinations", () => {
    expect(normalizeLogisticsTab("transportation")).toEqual({ tab: "travel", panel: "ground", isAlias: true })
    expect(normalizeLogisticsTab("catering")).toEqual({ tab: "production", panel: "catering", isAlias: true })
    expect(normalizeLogisticsTab("communication")).toEqual({ tab: "communications", panel: null, isAlias: true })
    expect(normalizeLogisticsTab("site-maps")).toEqual({ tab: "maps", panel: null, isAlias: true })
    expect(normalizeLogisticsTab("maps")).toEqual({ tab: "maps", panel: null, isAlias: false })
  })

  it("preserves a standalone event when a tour is explicitly cleared", () => {
    const next = buildLogisticsScopeSearchParams({
      current: new URLSearchParams("tourId=t1&eventId=e1"),
      updates: { tourId: null, eventId: "standalone-event" },
    })
    expect(next.get("tourId")).toBeNull()
    expect(next.get("eventId")).toBe("standalone-event")
  })

  it("clears dependent stop/leg when tour is cleared", () => {
    const current = new URLSearchParams("orgId=o1&tourId=t1&eventId=e1&legId=NYC&tab=overview")
    const next = buildLogisticsScopeSearchParams({
      current,
      updates: { tourId: null },
    })
    expect(next.get("tourId")).toBeNull()
    expect(next.get("eventId")).toBeNull()
    expect(next.get("legId")).toBeNull()
    expect(next.get("orgId")).toBe("o1")
    expect(next.get("tab")).toBe("overview")
  })

  it("refuses silent org switches when URL org disagrees with acting org", () => {
    expect(
      assertLogisticsScopeOrgConsistency({ actingOrgId: "org-a", urlOrgId: "org-b" }).ok,
    ).toBe(false)
    expect(
      assertLogisticsScopeOrgConsistency({ actingOrgId: "org-a", urlOrgId: "org-a" }).ok,
    ).toBe(true)
    expect(
      assertLogisticsScopeOrgConsistency({ actingOrgId: "org-a", urlOrgId: null }).ok,
    ).toBe(true)
  })

  it("formats scope badge without inventing a tour", () => {
    expect(formatLogisticsScopeBadge({})).toBe("No scope selected")
    expect(
      formatLogisticsScopeBadge({
        orgLabel: "Acme",
        tourName: "Summer Run",
        eventName: null,
      }),
    ).toBe("Acme · Summer Run · All stops")
  })
})
