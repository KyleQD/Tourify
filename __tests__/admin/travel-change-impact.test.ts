/**
 * TRAVEL-305 — Change impact engine tests.
 */

import { describe, it, expect } from "vitest"
import {
  computeSegmentChangeImpact,
  type SegmentChangeProposal,
  type ChangeImpactContext,
} from "@/lib/admin/travel-change-impact"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseProposal = (): SegmentChangeProposal => ({
  segment_id: "seg1",
  current_departure_utc: "2026-08-01T08:00:00Z",
  current_arrival_utc: "2026-08-01T10:00:00Z",
  current_origin: "ORD",
  current_destination: "DTW",
  current_status: "confirmed",
})

const baseCtx = (): ChangeImpactContext => ({
  passenger_assignments: [],
  connecting_segments: [],
  room_nights: [],
  calls_and_shifts: [],
  equipment_moves: [],
  cost_info: null,
  publications: [],
})

// ---------------------------------------------------------------------------
// No-impact baseline
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — no changes", () => {
  it("returns empty impact when nothing changes", () => {
    const report = computeSegmentChangeImpact(baseProposal(), baseCtx())
    expect(report.affected_passengers).toHaveLength(0)
    expect(report.connection_risks).toHaveLength(0)
    expect(report.affected_rooms).toHaveLength(0)
    expect(report.affected_equipment).toHaveLength(0)
    expect(report.summary.requires_acknowledgement).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Affected passengers
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — passengers", () => {
  it("flags all passengers when time changes", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      passenger_assignments: [
        { assignment_id: "pa1", person_id: "p1", person_name: "Alice" },
        { assignment_id: "pa2", person_id: "p2", person_name: "Bob" },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_arrival_utc: "2026-08-01T11:00:00Z" },
      ctx,
    )
    expect(report.affected_passengers).toHaveLength(2)
    expect(report.affected_passengers[0].reason).toContain("time")
  })

  it("cancellation reason for passengers", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      passenger_assignments: [{ assignment_id: "pa1", person_id: "p1", person_name: "Alice" }],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_status: "cancelled" },
      ctx,
    )
    expect(report.affected_passengers[0].reason).toContain("cancelled")
  })
})

// ---------------------------------------------------------------------------
// Connection risks
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — connection risks", () => {
  it("detects missed connection when new arrival is late", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      connecting_segments: [
        {
          segment_id: "seg2",
          label: "DTW → BOS",
          departure_utc: "2026-08-01T10:30:00Z", // departs 30min after new arrival
          min_connection_minutes: 60, // need 60min but only have 30min
        },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_arrival_utc: "2026-08-01T10:00:00Z" },
      ctx,
    )
    expect(report.connection_risks).toHaveLength(1)
    expect(report.connection_risks[0].missed).toBe(true)
    expect(report.summary.missed_connection_count).toBe(1)
    expect(report.summary.requires_acknowledgement).toBe(true)
  })

  it("no missed connection when time is sufficient", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      connecting_segments: [
        {
          segment_id: "seg2",
          label: "DTW → BOS",
          departure_utc: "2026-08-01T12:00:00Z", // departs 2h after new arrival
          min_connection_minutes: 60,
        },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_arrival_utc: "2026-08-01T10:00:00Z" },
      ctx,
    )
    expect(report.connection_risks[0].missed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Room nights
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — room nights", () => {
  it("flags rooms when time changes", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      room_nights: [
        { room_night_id: "rn1", property_name: "Grand Hotel", check_in_date: "2026-08-01", occupant_id: "p1", expected_arrival_before_utc: "2026-08-01T15:00:00Z" },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_arrival_utc: "2026-08-01T16:00:00Z" },
      ctx,
    )
    expect(report.affected_rooms).toHaveLength(1)
  })

  it("flags rooms when destination changes", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      room_nights: [
        { room_night_id: "rn1", property_name: "Airport Hotel", check_in_date: "2026-08-01", occupant_id: "p1", expected_arrival_before_utc: null },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_destination: "BOS" },
      ctx,
    )
    expect(report.affected_rooms).toHaveLength(1)
    expect(report.affected_rooms[0].reason).toContain("Destination")
  })
})

// ---------------------------------------------------------------------------
// Calls and shifts
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — calls and shifts", () => {
  it("detects call conflict when departure overlaps a call", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      calls_and_shifts: [
        { record_id: "call1", kind: "call", label: "Sound check", scheduled_utc: "2026-08-01T08:00:00Z", duration_minutes: 60 },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_departure_utc: "2026-08-01T08:30:00Z" },
      ctx,
    )
    expect(report.affected_calls_and_shifts).toHaveLength(1)
    expect(report.affected_calls_and_shifts[0].conflict_type).toBe("conflict")
  })
})

// ---------------------------------------------------------------------------
// Equipment moves
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — equipment moves", () => {
  it("flags all equipment when segment changes", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      equipment_moves: [
        { move_id: "em1", item_label: "Nord Stage 3" },
        { move_id: "em2", item_label: "PA System" },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_arrival_utc: "2026-08-01T11:00:00Z" },
      ctx,
    )
    expect(report.affected_equipment).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Cost impact
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — cost impact", () => {
  it("includes cost impact when present", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      cost_info: { has_change_fee: true, estimated_change_fee: 150, currency: "USD", rebooking_required: false },
    }
    const report = computeSegmentChangeImpact(baseProposal(), ctx)
    expect(report.cost_impact).not.toBeNull()
    expect(report.cost_impact!.has_change_fee).toBe(true)
    expect(report.summary.has_cost_impact).toBe(true)
    expect(report.summary.requires_acknowledgement).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Publications
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — publications", () => {
  it("flags publications when segment changes", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      publications: [
        { publication_id: "pub1", publication_label: "Tour Party Itinerary", audience_count: 12 },
      ],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_departure_utc: "2026-08-01T09:00:00Z" },
      ctx,
    )
    expect(report.affected_publications).toHaveLength(1)
    expect(report.summary.requires_acknowledgement).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

describe("computeSegmentChangeImpact — cancellation", () => {
  it("cancellation triggers requires_acknowledgement", () => {
    const ctx: ChangeImpactContext = {
      ...baseCtx(),
      passenger_assignments: [{ assignment_id: "pa1", person_id: "p1", person_name: "Alice" }],
    }
    const report = computeSegmentChangeImpact(
      { ...baseProposal(), new_status: "cancelled" },
      ctx,
    )
    expect(report.summary.requires_acknowledgement).toBe(true)
  })
})
