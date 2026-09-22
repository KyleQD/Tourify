/**
 * LODGE-301 through LODGE-307 — Lodging tests.
 */

import { describe, it, expect } from "vitest"
import {
  transitionLodgingBlock,
  buildNightlyInventoryMatrix,
  validateRoomAssignment,
  validateLodgingOccupancy,
  getLodgingDeadlineStatus,
  estimateLodgingCost,
  projectLodgingForTraveler,
  type LodgingBlock,
  type RoomAssignment,
  type LodgingPaymentPolicy,
} from "@/lib/admin/lodging"

const NOW = "2026-08-01T10:00:00.000Z"
const ACTOR = "user-1"

const makeBlock = (overrides: Partial<LodgingBlock> = {}): LodgingBlock => ({
  block_id: "blk1",
  property_id: "prop1",
  property_name: "Grand Hotel",
  tour_id: "t1",
  org_id: "org1",
  check_in_date: "2026-08-01",
  check_out_date: "2026-08-03",
  room_types: [
    { type_label: "King", contracted_count: 4, rate_per_night: 150, currency: "USD" },
    { type_label: "Double", contracted_count: 6, rate_per_night: 120, currency: "USD" },
  ],
  status: "requested",
  created_by: ACTOR,
  created_at: NOW,
  updated_by: ACTOR,
  updated_at: NOW,
  ...overrides,
})

const makeAssignment = (overrides: Partial<RoomAssignment> = {}): RoomAssignment => ({
  assignment_id: "ra1",
  block_id: "blk1",
  room_label: "101",
  room_type: "King",
  night_date: "2026-08-01",
  occupants: [
    { person_id: "p1", person_name: "Alice" },
    { person_id: "p2", person_name: "Bob" },
  ],
  status: "confirmed",
  check_in_date: "2026-08-01",
  check_out_date: "2026-08-03",
  is_accessible: false,
  created_by: ACTOR,
  created_at: NOW,
  ...overrides,
})

const makePolicy = (overrides: Partial<LodgingPaymentPolicy> = {}): LodgingPaymentPolicy => ({
  block_id: "blk1",
  incidentals_policy: "master_account",
  deposit_policy: "none",
  tax_exempt: false,
  ...overrides,
})

// ---------------------------------------------------------------------------
// LODGE-301
// ---------------------------------------------------------------------------

describe("LODGE-301: block lifecycle", () => {
  it("requested → confirmed with confirmation_number", () => {
    const block = makeBlock()
    const r = transitionLodgingBlock(block, "confirmed", ACTOR, NOW, { confirmation_number: "CNF-123" })
    expect(r.status).toBe("ok")
    expect(r.block!.status).toBe("confirmed")
    expect(r.block!.confirmation_number).toBe("CNF-123")
  })

  it("requires confirmation_number for confirm", () => {
    const block = makeBlock()
    const r = transitionLodgingBlock(block, "confirmed", ACTOR, NOW)
    expect(r.status).toBe("validation_error")
  })

  it("invalid transition: closed → requested", () => {
    const block = makeBlock({ status: "closed" })
    const r = transitionLodgingBlock(block, "requested", ACTOR, NOW)
    expect(r.status).toBe("invalid_transition")
  })

  it("confirmed → cancelled", () => {
    const block = makeBlock({ status: "confirmed", confirmation_number: "CNF" })
    const r = transitionLodgingBlock(block, "cancelled", ACTOR, NOW)
    expect(r.status).toBe("ok")
    expect(r.block!.status).toBe("cancelled")
  })
})

// ---------------------------------------------------------------------------
// LODGE-302
// ---------------------------------------------------------------------------

describe("LODGE-302: nightly inventory matrix", () => {
  it("produces rows for each date × room type", () => {
    const block = makeBlock()
    const rows = buildNightlyInventoryMatrix({ block, assignmentsByDate: new Map() })
    // 2 nights × 2 room types = 4 rows
    expect(rows).toHaveLength(4)
  })

  it("computes available = contracted - picked_up", () => {
    const block = makeBlock()
    const pickups = new Map([["2026-08-01", new Map([["King", 2]])]])
    const rows = buildNightlyInventoryMatrix({ block, assignmentsByDate: new Map(), pickupsByDate: pickups })
    const kingRow = rows.find((r) => r.date === "2026-08-01" && r.room_type === "King")!
    expect(kingRow.available).toBe(2) // 4 - 2
    expect(kingRow.picked_up).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// LODGE-303
// ---------------------------------------------------------------------------

describe("LODGE-303: rooming assignment validation", () => {
  it("no conflicts for clean assignment", () => {
    const conflicts = validateRoomAssignment(makeAssignment(), [], 2)
    expect(conflicts).toHaveLength(0)
  })

  it("flags single room violation", () => {
    const assignment = makeAssignment()
    const rules = [{ person_id: "p1", requires_single: true, needs_accessible_room: false }]
    const conflicts = validateRoomAssignment(assignment, rules, 2)
    expect(conflicts.some((c) => c.conflict_type === "single_room_required")).toBe(true)
  })

  it("flags excluded roommate", () => {
    const assignment = makeAssignment()
    const rules = [{ person_id: "p1", excluded_ids: ["p2"], requires_single: false, needs_accessible_room: false }]
    const conflicts = validateRoomAssignment(assignment, rules, 2)
    expect(conflicts.some((c) => c.conflict_type === "excluded_roommate")).toBe(true)
  })

  it("flags capacity exceeded", () => {
    const conflicts = validateRoomAssignment(makeAssignment(), [], 1) // capacity=1, 2 occupants
    expect(conflicts.some((c) => c.conflict_type === "capacity_exceeded")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// LODGE-304
// ---------------------------------------------------------------------------

describe("LODGE-304: occupancy validation", () => {
  it("valid when all required persons are assigned", () => {
    const result = validateLodgingOccupancy({
      block: makeBlock({ status: "confirmed", confirmation_number: "CNF" }),
      assignments: [makeAssignment()],
      requiredPersonIds: ["p1", "p2"],
    })
    expect(result.valid).toBe(true)
  })

  it("errors when a required person is unassigned", () => {
    const result = validateLodgingOccupancy({
      block: makeBlock({ status: "confirmed", confirmation_number: "CNF" }),
      assignments: [makeAssignment()],
      requiredPersonIds: ["p1", "p2", "p3"], // p3 not assigned
    })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("p3"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// LODGE-305
// ---------------------------------------------------------------------------

describe("LODGE-305: deadline tracking", () => {
  it("marks past cutoff correctly", () => {
    const block = makeBlock({ cutoff_date: "2026-07-25" })
    const s = getLodgingDeadlineStatus(block, NOW, NOW)
    expect(s.is_past_cutoff).toBe(true)
  })

  it("detects modification after cutoff", () => {
    const block = makeBlock({ cutoff_date: "2026-07-25" })
    const s = getLodgingDeadlineStatus(block, "2026-07-30T10:00:00Z", NOW)
    expect(s.last_modified_after_cutoff).toBe(true)
  })

  it("not past cutoff when cutoff is in the future", () => {
    const block = makeBlock({ cutoff_date: "2026-09-01" })
    const s = getLodgingDeadlineStatus(block, NOW, NOW)
    expect(s.is_past_cutoff).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// LODGE-306
// ---------------------------------------------------------------------------

describe("LODGE-306: cost estimation", () => {
  it("estimates cost for each room type", () => {
    const block = makeBlock()
    const estimates = estimateLodgingCost(block, makePolicy())
    expect(estimates).toHaveLength(2)
    const king = estimates.find((e) => e.room_type === "King")!
    expect(king.nights).toBe(2)
    expect(king.subtotal).toBe(150 * 2 * 4) // rate × nights × contracted
  })

  it("includes deposit when required", () => {
    const block = makeBlock()
    const estimates = estimateLodgingCost(block, makePolicy({ deposit_policy: "required", deposit_amount: 50, currency: "USD" }))
    const king = estimates.find((e) => e.room_type === "King")!
    expect(king.deposit_due).toBe(200) // 50 × 4 rooms
  })
})

// ---------------------------------------------------------------------------
// LODGE-307
// ---------------------------------------------------------------------------

describe("LODGE-307: lodging projection", () => {
  it("projects only traveler's own lodging details", () => {
    const projected = projectLodgingForTraveler({
      personId: "p1",
      personName: "Alice",
      assignment: makeAssignment(),
      block: makeBlock({ status: "confirmed", confirmation_number: "CNF-456" }),
      policy: makePolicy(),
      roommateNames: ["Bob"],
      propertyAddress: "123 Main St",
    })
    expect(projected.person_id).toBe("p1")
    expect(projected.property_name).toBe("Grand Hotel")
    expect(projected.roommate_names).toContain("Bob")
    expect(projected.check_in_date).toBe("2026-08-01")
    // No raw IDs in the projection
    expect("block_id" in projected).toBe(false)
  })
})
