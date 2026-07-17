import { describe, expect, it } from "vitest"

import {
  buildAdminHiringHref,
  buildAdminLogisticsHref,
  buildAdminRosterHref,
  buildAdminSiteMapHref,
  buildAdminStaffHref,
} from "@/lib/admin/admin-ops-context"
import { normalizeEventOpsTab } from "@/lib/admin/event-ops-tabs"

const scopedParams = {
  eventId: "33333333-3333-4333-8333-333333333333",
  tourId: "22222222-2222-4222-8222-222222222222",
  entityType: "organization" as const,
  entityId: "11111111-1111-4111-8111-111111111111",
  venueId: "44444444-4444-4444-8444-444444444444",
  displayName: "Test Events & Tours LLC",
}

describe("event ops tabs", () => {
  it("normalizes legacy event tab aliases to current command-center tabs", () => {
    expect(normalizeEventOpsTab(null)).toBe("overview")
    expect(normalizeEventOpsTab("staff")).toBe("people")
    expect(normalizeEventOpsTab("participants")).toBe("people")
    expect(normalizeEventOpsTab("finances")).toBe("money")
    expect(normalizeEventOpsTab("site-map")).toBe("logistics")
    expect(normalizeEventOpsTab("comms")).toBe("communications")
    expect(normalizeEventOpsTab("unknown-tab")).toBe("overview")
  })
})

describe("admin ops context links", () => {
  it("preserves event, tour, and employer scope for workforce paths", () => {
    expect(buildAdminRosterHref(scopedParams)).toContain("/admin/dashboard/roster?")
    expect(buildAdminRosterHref(scopedParams)).toContain("eventId=33333333-3333-4333-8333-333333333333")
    expect(buildAdminRosterHref(scopedParams)).toContain("entity_type=organization")
    expect(buildAdminRosterHref(scopedParams)).toContain("venue_id=44444444-4444-4444-8444-444444444444")

    expect(buildAdminHiringHref({ ...scopedParams, tab: "jobs" })).toContain("tab=jobs")
    expect(buildAdminHiringHref({ ...scopedParams, tab: "jobs" })).toContain("entity_id=11111111-1111-4111-8111-111111111111")
  })

  it("preserves selected event and employer scope for logistics and site-map paths", () => {
    const logisticsHref = buildAdminLogisticsHref(scopedParams)
    expect(logisticsHref).toContain("/admin/dashboard/logistics?")
    expect(logisticsHref).toContain("eventId=33333333-3333-4333-8333-333333333333")
    expect(logisticsHref).toContain("tourId=22222222-2222-4222-8222-222222222222")
    expect(logisticsHref).toContain("entity_type=organization")
    expect(logisticsHref).toContain("display_name=Test+Events+%26+Tours+LLC")

    const siteMapHref = buildAdminSiteMapHref(scopedParams)
    expect(siteMapHref).toContain("tab=site-maps")
    expect(siteMapHref).toContain("eventId=33333333-3333-4333-8333-333333333333")
  })

  it("builds staff scheduling links with both modern and legacy event id params", () => {
    const staffHref = buildAdminStaffHref({ ...scopedParams, tab: "scheduling" })
    expect(staffHref).toContain("/admin/dashboard/staff?")
    expect(staffHref).toContain("tab=scheduling")
    expect(staffHref).toContain("eventId=33333333-3333-4333-8333-333333333333")
    expect(staffHref).toContain("event_id=33333333-3333-4333-8333-333333333333")
    expect(staffHref).toContain("entity_type=organization")
  })
})
