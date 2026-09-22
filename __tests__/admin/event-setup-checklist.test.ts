import { describe, expect, it } from "vitest"

import { buildEventSetupChecklist } from "@/lib/admin/event-setup-checklist"

describe("EVENT-103 event setup checklist", () => {
  it("returns staffing/ticketing/advance/logistics/finance without inventing data", () => {
    const checklist = buildEventSetupChecklist({
      eventId: "event-1",
      event: {
        id: "event-1",
        start_at: "2026-08-01T20:00:00.000Z",
        venue_id: "55555555-5555-4555-8555-555555555555",
        settings: {
          ticket_price: 40,
          venue_label: "Hall",
          setup_intent: {
            staffing_intent: { proposed_staff_ids: ["staff-1"] },
            ticketing_intent: { general_admission_price: 40 },
          },
        },
      },
    })

    expect(checklist.items).toHaveLength(5)
    expect(checklist.items.every((item) => item.inventsData === false)).toBe(true)
    expect(checklist.items.find((item) => item.domain === "staffing")?.status).toBe("in_progress")
    expect(checklist.items.find((item) => item.domain === "ticketing")?.status).toBe("in_progress")
    expect(checklist.items.find((item) => item.domain === "advance")?.status).toBe("not_started")
    expect(checklist.pendingDomains).toEqual(
      expect.arrayContaining(["staffing", "ticketing", "advance", "logistics", "finance"]),
    )
  })

  it("marks domains ready only when reviewed provision counts exist", () => {
    const checklist = buildEventSetupChecklist({
      eventId: "event-1",
      event: {
        id: "event-1",
        start_at: "2026-08-01T20:00:00.000Z",
        venue_id: "55555555-5555-4555-8555-555555555555",
        settings: { venue_label: "Hall" },
      },
      counts: { staffShifts: 2, ticketTypes: 1, advancingDocuments: 1 },
    })

    expect(checklist.items.find((item) => item.domain === "staffing")?.status).toBe("ready")
    expect(checklist.items.find((item) => item.domain === "ticketing")?.status).toBe("ready")
    expect(checklist.items.find((item) => item.domain === "advance")?.status).toBe("in_progress")
  })
})

describe("EVENT-202 setup completeness view", () => {
  it("attaches owner and direct action to every required domain", () => {
    const checklist = buildEventSetupChecklist({
      eventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      event: {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        start_at: "2026-08-01T20:00:00.000Z",
        venue_id: "55555555-5555-4555-8555-555555555555",
        settings: {
          venue_label: "Hall",
          setup: {
            ownership: {
              ops_owner_user_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              department_owner: "Tour production",
            },
          },
        },
      },
    })

    for (const item of checklist.items) {
      expect(item.owner.role).toBeTruthy()
      expect(item.owner.label).toBe("Tour production")
      expect(item.owner.userId).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc")
      expect(item.directAction.href).toContain("/admin/dashboard/events/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")
      expect(item.directAction.label).toBeTruthy()
    }
  })

  it("blocks domains when hard dependencies are unmet", () => {
    const checklist = buildEventSetupChecklist({
      eventId: "event-1",
      event: { id: "event-1", settings: {} },
    })

    expect(checklist.items.find((item) => item.domain === "staffing")?.status).toBe("blocked")
    expect(checklist.items.find((item) => item.domain === "ticketing")?.status).toBe("blocked")
    expect(checklist.items.find((item) => item.domain === "advance")?.status).toBe("blocked")
    expect(checklist.items.find((item) => item.domain === "logistics")?.status).toBe("blocked")
    expect(checklist.items.find((item) => item.domain === "finance")?.status).toBe("not_started")
  })

  it("shows unknown when dependency evaluation fails", () => {
    const checklist = buildEventSetupChecklist({
      eventId: "event-1",
      event: {
        id: "event-1",
        start_at: "2026-08-01T20:00:00.000Z",
        settings: {},
      },
      dependencyErrors: { venue: "venue lookup timeout" },
    })

    expect(checklist.items.find((item) => item.domain === "advance")?.status).toBe("unknown")
    expect(checklist.items.find((item) => item.domain === "logistics")?.status).toBe("unknown")
    expect(checklist.items.find((item) => item.domain === "staffing")?.status).not.toBe("unknown")
  })

  it("shows unknown when a domain count query fails", () => {
    const checklist = buildEventSetupChecklist({
      eventId: "event-1",
      event: {
        id: "event-1",
        start_at: "2026-08-01T20:00:00.000Z",
        venue_id: "55555555-5555-4555-8555-555555555555",
        settings: { venue_label: "Hall" },
      },
      countErrors: { staffing: "permission denied for table staff_shifts" },
    })

    expect(checklist.items.find((item) => item.domain === "staffing")?.status).toBe("unknown")
    expect(checklist.items.find((item) => item.domain === "ticketing")?.status).toBe("not_started")
  })
})
