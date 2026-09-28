import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  adminEventInputSchema,
  adminTourInputSchema,
  tourAssignmentInputSchema,
} from "@/lib/admin/tour-event-operations.service"
import { getEventReadiness, getTourReadiness } from "@/lib/admin/operations-readiness"

const tourA = "11111111-1111-4111-8111-111111111111"
const tourB = "22222222-2222-4222-8222-222222222222"
const eventA = "33333333-3333-4333-8333-333333333333"

describe("admin tour/event operation schemas", () => {
  it("accepts a standalone event with no tour assignment", () => {
    const result = adminEventInputSchema.parse({
      title: "Standalone showcase",
      event_date: "2026-08-14",
      event_time: "20:00",
      tour_ids: [],
    })

    expect(result.title).toBe("Standalone showcase")
    expect(result.tour_ids).toEqual([])
  })

  it("accepts a single-tour event through the backward-compatible tour_id field", () => {
    const result = adminEventInputSchema.parse({
      name: "Opening night",
      event_date: "2026-08-14",
      tour_id: tourA,
    })

    expect(result.tour_id).toBe(tourA)
  })

  it("accepts multiple tour assignments with route operations metadata", () => {
    const result = adminEventInputSchema.parse({
      title: "Festival crossover",
      start_at: "2026-08-14T20:00:00.000Z",
      tour_assignments: [
        {
          tour_id: tourA,
          ordinal: 1,
          is_primary: true,
          leg_name: "West Coast",
          market: "Los Angeles",
          advance_status: "in_progress",
          routing_notes: "Shared event with festival routing.",
        },
        {
          tour_id: tourB,
          ordinal: 4,
          advance_status: "ready",
        },
      ],
    })

    expect(result.tour_assignments).toHaveLength(2)
    expect(result.tour_assignments?.map((assignment) => assignment.tour_id)).toEqual([tourA, tourB])
  })

  it("accepts full event builder operations fields", () => {
    const result = adminEventInputSchema.parse({
      title: "Advanced event",
      event_date: "2026-08-14",
      event_type: "festival",
      public_visibility: "team",
      tags: ["festival", "west coast"],
      venue_name: "The Fonda",
      venue_room: "Main room",
      venue_contact_name: "Sam Promoter",
      stakeholders: "Manager, promoter, production lead",
      travel: "Bus from San Diego",
      lodging: "Hotel block confirmed",
      equipment: "Backline required",
      site_map: "Main stage site map",
      supply_list: "Water, towels, batteries",
      documents: "Rider and contract uploaded",
      comps: "12",
      guest_list_budget: "500",
      day_sheet_notes: "Parking opens at noon",
    })

    expect(result.event_type).toBe("festival")
    expect(result.tags).toEqual(["festival", "west coast"])
    expect(result.venue_contact_name).toBe("Sam Promoter")
  })

  it("rejects invalid route readiness states", () => {
    expect(() =>
      tourAssignmentInputSchema.parse({
        tour_id: tourA,
        advance_status: "waiting_on_promoter",
      })
    ).toThrow()
  })

  it("accepts tour drafts with existing event IDs", () => {
    const result = adminTourInputSchema.parse({
      name: "Summer run",
      status: "planning",
      event_ids: [eventA],
      settings: {
        builder_mode: "draft",
      },
    })

    expect(result.event_ids).toEqual([eventA])
  })

  it("derives event readiness and publish blockers", () => {
    const missing = getEventReadiness({ title: "", date: "", venue_name: "" })
    expect(missing.blockers.map((item) => item.id)).toEqual(expect.arrayContaining(["basics", "schedule", "venue"]))

    const ready = getEventReadiness({
      title: "Opening night",
      date: "2026-08-14",
      venue_name: "The Fonda",
      venue_account_id: "44444444-4444-4444-8444-444444444444",
      load_in_time: "14:00",
      sound_check_time: "16:00",
      technical_rider: "Console advanced",
      hospitality_rider: "Dinner advanced",
      security_notes: "Barricade confirmed",
      ticket_price: "35",
      team_count: 3,
      staff_count: 1,
    })
    expect(ready.score).toBeGreaterThan(missing.score)
    expect(ready.blockers).toHaveLength(0)

    const draftVenue = getEventReadiness({
      title: "Opening night",
      date: "2026-08-14",
      venue_name: "The Fonda",
      staff_count: 0,
    })
    expect(draftVenue.blockers.map((item) => item.id)).not.toContain("venue")
    expect(draftVenue.blockers.map((item) => item.id)).not.toContain("team")
  })

  it("derives tour readiness and route conflicts", () => {
    const summary = getTourReadiness({
      name: "Summer run",
      main_artist: "Headliner",
      start_date: "2026-08-10",
      end_date: "2026-08-20",
      events: [
        { id: "event-1", name: "Outside date", date: "2026-08-25", venue: "Venue" },
      ],
      route: [{ city: "Los Angeles", venue: "Venue", date: "2026-08-25" }],
      budget: "10000",
    })

    expect(summary.score).toBeGreaterThan(0)
    expect(summary.conflicts.some((conflict) => conflict.id.startsWith("event-outside-dates"))).toBe(true)
  })

  it("does not count an empty draft row as a tour stop", () => {
    const summary = getTourReadiness({
      name: "Draft run",
      main_artist: "Headliner",
      start_date: "2026-08-10",
      end_date: "2026-08-20",
      events: [{ name: "", venue: "", date: "" }],
    })

    expect(summary.blockers.some((item) => item.id === "events")).toBe(true)
    expect(summary.conflicts.some((conflict) => conflict.id === "no-stops")).toBe(true)
  })

  it("reports duplicate canonical route positions", () => {
    const summary = getTourReadiness({
      name: "Duplicate route",
      main_artist: "Headliner",
      start_date: "2026-08-10",
      end_date: "2026-08-20",
      events: [
        { id: "one", name: "One", venue: "Hall", date: "2026-08-11", ordinal: 0 },
        { id: "two", name: "Two", venue: "Hall", date: "2026-08-12", ordinal: 0 },
      ],
    })

    expect(summary.conflicts.some((conflict) => conflict.id === "duplicate-ordinal-0")).toBe(true)
  })
})
