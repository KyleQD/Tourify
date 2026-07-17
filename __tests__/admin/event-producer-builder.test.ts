import { describe, expect, it } from "vitest"

import {
  buildEventProducerPayload,
  initialEventProducerForm,
} from "@/lib/admin/event-producer-builder"
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
})

describe("event producer readiness", () => {
  it("blocks publish when core event details are missing", () => {
    const readiness = getEventReadiness({})

    expect(readiness.blockers.map((item) => item.id)).toEqual(["basics", "schedule", "venue", "team"])
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
