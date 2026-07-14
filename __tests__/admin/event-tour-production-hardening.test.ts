import { describe, expect, it } from "vitest"
import { buildEventProducerPayload, initialEventProducerForm } from "@/lib/admin/event-producer-builder"
import { mapAdvancingStatusToTourAdvanceStatus, buildAdminRosterHref, buildAdminLogisticsHref } from "@/lib/admin/admin-ops-context"

describe("production hardening contracts", () => {
  it("producer payload includes relational seed fields for artists/crew/vendors/tickets", () => {
    const payload = buildEventProducerPayload(
      {
        ...initialEventProducerForm,
        title: "Hardening Event",
        date: "2026-09-01",
        time: "19:00",
        ticketPrice: "40",
        vipPrice: "90",
        selectedArtists: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "Headliner" }],
        selectedCrew: [{ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", label: "FOH" }],
        selectedVendors: [{ id: "vendor:backline", label: "Backline Co", meta: "Audio" }],
      },
      { publish: false, readinessScore: 55 }
    )

    expect(payload.artist_ids).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"])
    expect(payload.staff_ids).toEqual(["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"])
    expect(payload.ticket_price).toBe(40)
    expect(payload.vip_price).toBe(90)
    expect((payload as any).setup_context?.vendors?.length).toBeGreaterThan(0)
  })

  it("maps advancing statuses into tour advance_status values", () => {
    expect(mapAdvancingStatusToTourAdvanceStatus("sent")).toBe("in_progress")
    expect(mapAdvancingStatusToTourAdvanceStatus("approved")).toBe("ready")
    expect(mapAdvancingStatusToTourAdvanceStatus("blocked")).toBe("blocked")
  })

  it("builds ops-context hrefs for roster and logistics", () => {
    expect(buildAdminRosterHref({ eventId: "evt-1" })).toBe("/admin/dashboard/roster?eventId=evt-1")
    expect(buildAdminLogisticsHref({ tourId: "tour-1", tab: "site-maps" })).toContain("tourId=tour-1")
    expect(buildAdminLogisticsHref({ tourId: "tour-1", tab: "site-maps" })).toContain("tab=site-maps")
  })
})
