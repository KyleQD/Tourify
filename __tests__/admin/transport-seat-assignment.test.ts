/**
 * TRANS-303 — Seat/berth assignment tests.
 */

import { describe, it, expect } from "vitest"
import {
  previewSeatAssignments,
  executeSeatAssignments,
  type SeatAssignmentInput,
} from "@/lib/admin/transport-seat-assignment"
import type { VehicleCapacity } from "@/lib/admin/transport-vehicle"

const NOW = "2026-08-01T10:00:00.000Z"
const ACTOR = "user-1"

const makeCap = (overrides: Partial<VehicleCapacity> = {}): VehicleCapacity => ({
  passenger_seats: 8,
  sleeping_berths: 4,
  cargo_cubic_meters: null,
  wheelchair_spaces: 1,
  is_accessible: true,
  ...overrides,
})

const baseInput = (overrides: Partial<SeatAssignmentInput> = {}): SeatAssignmentInput => ({
  movement_id: "mv1",
  capacity: makeCap(),
  existing_assignments: [],
  candidates: [
    { person_id: "p1", person_name: "Alice", needs_wheelchair_space: false, needs_berth: false },
    { person_id: "p2", person_name: "Bob", needs_wheelchair_space: false, needs_berth: false },
  ],
  is_overnight: false,
  actor: ACTOR,
  at: NOW,
  ...overrides,
})

describe("previewSeatAssignments — clean batch", () => {
  it("allows all candidates when capacity is sufficient", () => {
    const p = previewSeatAssignments(baseInput())
    expect(p.can_proceed).toBe(true)
    expect(p.blocked_count).toBe(0)
  })
})

describe("previewSeatAssignments — capacity exceeded", () => {
  it("flags capacity conflict when over limit", () => {
    const input = baseInput({ capacity: makeCap({ passenger_seats: 1 }) })
    const p = previewSeatAssignments(input)
    // p1 is ok (1/1), p2 is over
    const p2 = p.candidates.find((c) => c.person_id === "p2")!
    expect(p2.conflicts.some((c) => c.conflict_type === "capacity_exceeded")).toBe(true)
    expect(p2.can_assign).toBe(true) // overridable
  })
})

describe("previewSeatAssignments — berth required", () => {
  it("blocks when no berths available and overnight", () => {
    const input = baseInput({
      is_overnight: true,
      capacity: makeCap({ sleeping_berths: 0 }),
      candidates: [{ person_id: "p1", person_name: "Alice", needs_wheelchair_space: false, needs_berth: true }],
    })
    const p = previewSeatAssignments(input)
    expect(p.candidates[0].conflicts.some((c) => c.conflict_type === "berth_required")).toBe(true)
    expect(p.candidates[0].can_assign).toBe(false)
  })
})

describe("previewSeatAssignments — wheelchair", () => {
  it("blocks when no accessible space", () => {
    const input = baseInput({
      capacity: makeCap({ is_accessible: false, wheelchair_spaces: 0 }),
      candidates: [{ person_id: "p1", person_name: "Alice", needs_wheelchair_space: true, needs_berth: false }],
    })
    const p = previewSeatAssignments(input)
    expect(p.candidates[0].conflicts.some((c) => c.conflict_type === "wheelchair_space_required")).toBe(true)
    expect(p.candidates[0].can_assign).toBe(false)
  })
})

describe("previewSeatAssignments — duplicate", () => {
  it("blocks when person already assigned", () => {
    const input = baseInput({
      existing_assignments: [{
        assignment_id: "e1", movement_id: "mv1", person_id: "p1", person_name: "Alice",
        seat_label: "1A", is_berth: false, is_wheelchair_space: false, status: "assigned",
        created_by: ACTOR, created_at: NOW,
      }],
    })
    const p = previewSeatAssignments(input)
    const p1 = p.candidates.find((c) => c.person_id === "p1")!
    expect(p1.conflicts.some((c) => c.conflict_type === "duplicate_assignment")).toBe(true)
    expect(p1.can_assign).toBe(false)
  })
})

describe("executeSeatAssignments", () => {
  it("creates assignments for eligible candidates", () => {
    const r = executeSeatAssignments(baseInput())
    expect(r.created).toHaveLength(2)
    expect(r.skipped).toHaveLength(0)
  })

  it("skips candidates with blocking conflicts", () => {
    const input = baseInput({
      is_overnight: true,
      capacity: makeCap({ sleeping_berths: 0 }),
      candidates: [{ person_id: "p1", person_name: "Alice", needs_wheelchair_space: false, needs_berth: true }],
    })
    const r = executeSeatAssignments(input)
    expect(r.skipped).toHaveLength(1)
    expect(r.created).toHaveLength(0)
  })

  it("force-assigns with override for overridable conflicts", () => {
    const input = baseInput({
      capacity: makeCap({ passenger_seats: 1 }),
      override_ids: new Set(["p2"]),
    })
    const r = executeSeatAssignments(input)
    expect(r.overridden.some((a) => a.person_id === "p2")).toBe(true)
  })
})
