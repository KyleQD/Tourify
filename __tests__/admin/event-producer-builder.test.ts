import { describe, expect, it } from "vitest"

import {
  buildEventProducerPayload,
  hydrateEventProducerForm,
  initialEventProducerForm,
} from "@/lib/admin/event-producer-builder"
import {
  EVENT_PRODUCER_READINESS_SECTIONS,
  EVENT_PRODUCER_SECTION_IDS,
} from "@/lib/admin/event-producer-navigation"
import {
  adminEventInputBaseSchema,
  mergeAdminEventSettingsForUpdate,
} from "@/lib/admin/tour-event-operations.service"
import { getEventReadiness } from "@/lib/admin/operations-readiness"

describe("event producer builder payload", () => {
  it("builds a draft standalone event payload with setup metadata", () => {
    const payload = buildEventProducerPayload({
      ...initialEventProducerForm,
      title: "Club Night",
      date: "2026-08-12",
      time: "20:00",
      venueName: "The Room",
      venueAccountId: "44444444-4444-4444-8444-444444444444",
      ticketPrice: "$25",
      selectedArtists: [{ id: "artist-1", label: "The Signals" }],
    })

    expect(payload.status).toBe("draft")
    expect(payload.title).toBe("Club Night")
    expect(payload.venue_name).toBe("The Room")
    expect(payload.venue_id).toBe("44444444-4444-4444-8444-444444444444")
    expect(payload.setup_context.venue_account_id).toBe("44444444-4444-4444-8444-444444444444")
    expect(payload.ticket_price).toBe(25)
    expect(payload.tour_ids).toEqual([])
    expect(payload.tour_assignments).toEqual([])
    expect(payload.creation_source).toBe("admin_event_producer_builder")
    expect(payload.setup_context.artists).toEqual([{ id: "artist-1", label: "The Signals" }])
  })

  it.each([0, 50, 100])("serializes %i guest-list spots without legacy create fields", (guestListSpots) => {
    const payload = buildEventProducerPayload({
      ...initialEventProducerForm,
      title: "Guest List Show",
      date: "2026-08-12",
      guestListSpots: String(guestListSpots),
    })

    expect(payload.guest_list_spots).toBe(guestListSpots)
    expect(payload).not.toHaveProperty("guest_list_budget")
    expect(payload).not.toHaveProperty("expected_expenses")
    expect(payload).not.toHaveProperty("travel")
    expect(payload).not.toHaveProperty("lodging")
    expect(payload).not.toHaveProperty("equipment")
    expect(payload).not.toHaveProperty("site_map")
    expect(payload).not.toHaveProperty("supply_list")
    expect(payload).not.toHaveProperty("documents")
    expect(payload).not.toHaveProperty("setup_checklist")
    expect(payload.setup_context).not.toHaveProperty("handoff_sections")
  })

  it("hydrates guest-list spots from settings without reinterpreting a legacy budget", () => {
    expect(hydrateEventProducerForm({ settings: { guest_list_spots: 24, guest_list_budget: 500 } }).guestListSpots).toBe("24")
    expect(hydrateEventProducerForm({ settings: { guest_list_budget: 500 } }).guestListSpots).toBe("0")
  })

  it("preserves legacy expense, budget, and logistics settings during a partial update", () => {
    const settings = mergeAdminEventSettingsForUpdate({
      guest_list_budget: 500,
      expected_expenses: 1200,
      travel: "Legacy travel details",
      lodging: "Legacy lodging details",
      equipment: "Legacy equipment details",
      site_map: "Legacy site map",
      supply_list: "Legacy supply list",
      documents: ["legacy-rider.pdf"],
    }, {
      guest_list_spots: 24,
      expected_revenue: 4000,
    })

    expect(settings).toMatchObject({
      guest_list_spots: 24,
      expected_revenue: 4000,
      guest_list_budget: 500,
      expected_expenses: 1200,
      travel: "Legacy travel details",
      lodging: "Legacy lodging details",
      equipment: "Legacy equipment details",
      site_map: "Legacy site map",
      supply_list: "Legacy supply list",
      documents: ["legacy-rider.pdf"],
    })
  })

  it("builds a published multi-tour event payload with one primary assignment", () => {
    const payload = buildEventProducerPayload({
      ...initialEventProducerForm,
      title: "Festival Stop",
      date: "2026-09-05",
      time: "19:30",
      selectedTourIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      primaryTourId: "22222222-2222-4222-8222-222222222222",
      ordinal: "3",
      legName: "Midwest",
      market: "Chicago",
    }, { publish: true, readinessScore: 82 })

    expect(payload.status).toBe("confirmed")
    expect(payload.primary_tour_id).toBe("22222222-2222-4222-8222-222222222222")
    expect(payload.tour_assignments).toHaveLength(2)
    expect(payload.tour_assignments.filter((assignment) => assignment.is_primary)).toHaveLength(1)
    expect(payload.tour_assignments[1]).toMatchObject({
      ordinal: 3,
      leg_name: "Midwest",
      market: "Chicago",
      advance_status: "ready",
    })
  })

  it("hydrates and preserves tour assignment editing fields", () => {
    const form = hydrateEventProducerForm({
      id: "event-1",
      title: "Tour Stop",
      start_at: "2026-09-05T19:30:00.000Z",
      tours: [
        { id: "tour-1", ordinal: 2, is_primary: false },
        { id: "tour-2", ordinal: 4, is_primary: true, leg_name: "Midwest", market: "Chicago" },
      ],
    })

    expect(form.selectedTourIds).toEqual(["tour-1", "tour-2"])
    expect(form.primaryTourId).toBe("tour-2")
    expect(form.ordinal).toBe("4")
    expect(form.legName).toBe("Midwest")
    expect(form.market).toBe("Chicago")

    const payload = buildEventProducerPayload(form)
    expect(payload.primary_tour_id).toBe("tour-2")
    expect(payload.tour_assignments.find((assignment) => assignment.tour_id === "tour-2")).toMatchObject({
      ordinal: 4,
      is_primary: true,
      leg_name: "Midwest",
      market: "Chicago",
    })
  })
})

describe("event producer readiness", () => {
  it("blocks publish when core event details are missing", () => {
    const readiness = getEventReadiness({})

    expect(readiness.blockers.map((item) => item.id)).toEqual(["basics", "schedule", "venue"])
    expect(readiness.conflicts.some((item) => item.id === "team")).toBe(true)
  })

  it("scores optional producer modules without adding publish blockers", () => {
    const readiness = getEventReadiness({
      title: "Advance Ready",
      date: "2026-08-12",
      venue_name: "The Room",
      venue_account_id: "44444444-4444-4444-8444-444444444444",
      technical_rider: "Console and inputs confirmed",
      has_logistics: true,
      has_site_map: true,
      has_comms: true,
      team_count: 2,
      staff_count: 1,
      vendor_count: 1,
      day_sheet_notes: "Settlement after headline set.",
    })

    expect(readiness.blockers).toEqual([])
    expect(readiness.items.find((item) => item.id === "logistics")?.state).toBe("ready")
    expect(readiness.items.find((item) => item.id === "communications")?.state).toBe("in_progress")
    expect(readiness.items.find((item) => item.id === "day_sheet")?.state).toBe("ready")
  })
})

describe("event producer navigation", () => {
  it("keeps only creation topics in the always-visible editor navigation", () => {
    expect(EVENT_PRODUCER_SECTION_IDS).toEqual([
      "basics",
      "schedule",
      "venue",
      "advance",
      "team",
      "vendors",
      "ticketing",
      "finance",
      "daysheet",
      "review",
    ])
    expect(Object.values(EVENT_PRODUCER_READINESS_SECTIONS).every((section) =>
      EVENT_PRODUCER_SECTION_IDS.includes(section)
    )).toBe(true)
    expect(EVENT_PRODUCER_READINESS_SECTIONS).not.toHaveProperty("logistics")
    expect(EVENT_PRODUCER_READINESS_SECTIONS).not.toHaveProperty("communications")
  })
})

describe("event producer guest-list API contract", () => {
  const base = { title: "Guest List Show", start_at: "2026-08-12T20:00:00.000Z" }

  it.each([0, 50, 100])("accepts %i guest-list spots", (guestListSpots) => {
    expect(adminEventInputBaseSchema.safeParse({ ...base, guest_list_spots: guestListSpots }).success).toBe(true)
  })

  it.each([-1, 1.5, 101])("rejects invalid guest-list spots: %s", (guestListSpots) => {
    expect(adminEventInputBaseSchema.safeParse({ ...base, guest_list_spots: guestListSpots }).success).toBe(false)
  })
})
