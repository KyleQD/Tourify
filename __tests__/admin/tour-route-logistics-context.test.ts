/**
 * ROUTE-309 — Route-to-logistics context reference model tests.
 *
 * Acceptance criteria:
 *  - Each travel segment, vehicle movement, room night, equipment move,
 *    and passenger assignment references canonical stop/leg context.
 *  - Validation catches incomplete/inconsistent contexts.
 *  - Bundle consistency check catches orphan references.
 */

import { describe, it, expect } from "vitest"
import {
  validateRouteLegContext,
  makeLegContext,
  makeStopContext,
  checkBundleConsistency,
  type RouteLegContext,
  type RouteLegLogisticsBundle,
  type TravelSegmentRef,
  type VehicleMovementRef,
  type RoomNightRef,
  type EquipmentMoveRef,
  type PassengerAssignmentRef,
} from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function legCtx(overrides: Partial<RouteLegContext> = {}): RouteLegContext {
  return {
    tour_id: "tour1",
    tour_version_id: "tv1",
    leg_id: "leg-s1-s2",
    from_stop_id: "s1",
    to_stop_id: "s2",
    stop_id: null,
    transport_mode: "drive",
    ...overrides,
  }
}

function stopCtx(overrides: Partial<RouteLegContext> = {}): RouteLegContext {
  return {
    tour_id: "tour1",
    tour_version_id: "tv1",
    leg_id: null,
    from_stop_id: null,
    to_stop_id: null,
    stop_id: "s2",
    ...overrides,
  }
}

function makeTravelSegment(id: string, ctx = legCtx()): TravelSegmentRef {
  return {
    segment_id: id,
    context: ctx,
    mode: "drive",
    passenger_count: 4,
  }
}

function makeVehicleMovement(id: string, passengerIds: string[] = [], ctx = legCtx()): VehicleMovementRef {
  return {
    movement_id: id,
    context: ctx,
    vehicle_type: "van",
    passenger_ids: passengerIds,
    equipment_ids: [],
  }
}

function makeRoomNight(id: string, ctx = stopCtx()): RoomNightRef {
  return {
    room_night_id: id,
    context: ctx,
    property_name: "The Grand Hotel",
    check_in_date: "2026-08-01",
    check_out_date: "2026-08-02",
    night_count: 1,
    occupant_id: "person-1",
  }
}

function makeEquipmentMove(
  id: string,
  ctx = legCtx(),
  opts: { vehicleMovementId?: string; travelSegmentId?: string } = {},
): EquipmentMoveRef {
  return {
    move_id: id,
    context: ctx,
    equipment_item_id: "eq-1",
    item_label: "Guitar + case",
    mode: "own_vehicle",
    vehicle_movement_id: opts.vehicleMovementId ?? null,
    travel_segment_id: opts.travelSegmentId ?? null,
  }
}

function makePassengerAssignment(
  id: string,
  personId: string,
  ctx = legCtx(),
  opts: { vehicleMovementId?: string; travelSegmentId?: string } = {},
): PassengerAssignmentRef {
  return {
    assignment_id: id,
    context: ctx,
    person_id: personId,
    person_name: `Person ${personId}`,
    vehicle_movement_id: opts.vehicleMovementId ?? null,
    travel_segment_id: opts.travelSegmentId ?? null,
    has_room_night: false,
  }
}

function makeBundle(overrides: Partial<RouteLegLogisticsBundle> = {}): RouteLegLogisticsBundle {
  return {
    context: legCtx(),
    travel_segments: [],
    vehicle_movements: [],
    room_nights: [],
    equipment_moves: [],
    passenger_assignments: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// validateRouteLegContext
// ---------------------------------------------------------------------------

describe("validateRouteLegContext — leg context", () => {
  it("accepts a valid leg context", () => {
    const r = validateRouteLegContext(legCtx())
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it("requires tour_id", () => {
    const r = validateRouteLegContext(legCtx({ tour_id: "" }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("tour_id"))).toBe(true)
  })

  it("requires tour_version_id", () => {
    const r = validateRouteLegContext(legCtx({ tour_version_id: "" }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("tour_version_id"))).toBe(true)
  })

  it("requires at least one of leg_id or stop_id", () => {
    const r = validateRouteLegContext(legCtx({ leg_id: null, stop_id: null }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("leg_id or stop_id"))).toBe(true)
  })

  it("requires from_stop_id and to_stop_id when leg_id is set", () => {
    const r = validateRouteLegContext(legCtx({ from_stop_id: null }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("from_stop_id"))).toBe(true)
  })
})

describe("validateRouteLegContext — stop context", () => {
  it("accepts a valid stop context", () => {
    const r = validateRouteLegContext(stopCtx())
    expect(r.valid).toBe(true)
  })

  it("stop context with no leg_id is valid when stop_id is set", () => {
    const r = validateRouteLegContext(stopCtx({ stop_id: "s3" }))
    expect(r.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// makeLegContext / makeStopContext helpers
// ---------------------------------------------------------------------------

describe("makeLegContext", () => {
  it("builds a complete leg context", () => {
    const ctx = makeLegContext({
      tourId: "t1",
      tourVersionId: "tv1",
      legId: "leg-1",
      fromStopId: "s1",
      toStopId: "s2",
      transportMode: "fly",
    })
    expect(ctx.leg_id).toBe("leg-1")
    expect(ctx.stop_id).toBeNull()
    expect(ctx.transport_mode).toBe("fly")
    expect(validateRouteLegContext(ctx).valid).toBe(true)
  })
})

describe("makeStopContext", () => {
  it("builds a complete stop context", () => {
    const ctx = makeStopContext({ tourId: "t1", tourVersionId: "tv1", stopId: "s2" })
    expect(ctx.stop_id).toBe("s2")
    expect(ctx.leg_id).toBeNull()
    expect(validateRouteLegContext(ctx).valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// checkBundleConsistency — valid bundle
// ---------------------------------------------------------------------------

describe("checkBundleConsistency — valid bundle", () => {
  it("returns valid for an empty bundle with valid context", () => {
    const r = checkBundleConsistency(makeBundle())
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it("returns valid when equipment_move references an existing movement", () => {
    const vm = makeVehicleMovement("vm1")
    const em = makeEquipmentMove("em1", legCtx(), { vehicleMovementId: "vm1" })
    const r = checkBundleConsistency(
      makeBundle({ vehicle_movements: [vm], equipment_moves: [em] }),
    )
    expect(r.valid).toBe(true)
  })

  it("returns valid when passenger_assignment references an existing movement", () => {
    const vm = makeVehicleMovement("vm1", ["p1"])
    const pa = makePassengerAssignment("pa1", "p1", legCtx(), { vehicleMovementId: "vm1" })
    const r = checkBundleConsistency(
      makeBundle({ vehicle_movements: [vm], passenger_assignments: [pa] }),
    )
    expect(r.valid).toBe(true)
    expect(r.warnings).toHaveLength(0)
  })

  it("returns valid when equipment_move references an existing travel segment", () => {
    const ts = makeTravelSegment("seg1")
    const em = makeEquipmentMove("em1", legCtx(), { travelSegmentId: "seg1" })
    const r = checkBundleConsistency(
      makeBundle({ travel_segments: [ts], equipment_moves: [em] }),
    )
    expect(r.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// checkBundleConsistency — orphan references
// ---------------------------------------------------------------------------

describe("checkBundleConsistency — orphan references", () => {
  it("errors when equipment_move references missing vehicle_movement_id", () => {
    const em = makeEquipmentMove("em1", legCtx(), { vehicleMovementId: "missing" })
    const r = checkBundleConsistency(makeBundle({ equipment_moves: [em] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("missing"))).toBe(true)
  })

  it("errors when equipment_move references missing travel_segment_id", () => {
    const em = makeEquipmentMove("em1", legCtx(), { travelSegmentId: "missing-seg" })
    const r = checkBundleConsistency(makeBundle({ equipment_moves: [em] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("missing-seg"))).toBe(true)
  })

  it("errors when passenger_assignment references missing vehicle_movement_id", () => {
    const pa = makePassengerAssignment("pa1", "p1", legCtx(), { vehicleMovementId: "ghost-vm" })
    const r = checkBundleConsistency(makeBundle({ passenger_assignments: [pa] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("ghost-vm"))).toBe(true)
  })

  it("errors when passenger_assignment references missing travel_segment_id", () => {
    const pa = makePassengerAssignment("pa1", "p1", legCtx(), { travelSegmentId: "ghost-seg" })
    const r = checkBundleConsistency(makeBundle({ passenger_assignments: [pa] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("ghost-seg"))).toBe(true)
  })

  it("warns when vehicle_movement passenger_id not in passenger_assignments", () => {
    const vm = makeVehicleMovement("vm1", ["untracked-person"])
    const r = checkBundleConsistency(makeBundle({ vehicle_movements: [vm] }))
    expect(r.valid).toBe(true) // warning, not error
    expect(r.warnings.some((w) => w.includes("untracked-person"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// checkBundleConsistency — invalid context on child records
// ---------------------------------------------------------------------------

describe("checkBundleConsistency — invalid child contexts", () => {
  it("errors when a vehicle_movement has invalid context", () => {
    const vm = makeVehicleMovement("vm1", [], { ...legCtx(), tour_id: "" })
    const r = checkBundleConsistency(makeBundle({ vehicle_movements: [vm] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("vehicle_movement"))).toBe(true)
  })

  it("errors when an equipment_move has invalid context", () => {
    const em = makeEquipmentMove("em1", { ...legCtx(), leg_id: null, stop_id: null })
    const r = checkBundleConsistency(makeBundle({ equipment_moves: [em] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("equipment_move"))).toBe(true)
  })

  it("errors when a passenger_assignment has invalid context", () => {
    const pa = makePassengerAssignment("pa1", "p1", { ...legCtx(), tour_version_id: "" })
    const r = checkBundleConsistency(makeBundle({ passenger_assignments: [pa] }))
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("passenger_assignment"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// checkBundleConsistency — bundle-level invalid context
// ---------------------------------------------------------------------------

describe("checkBundleConsistency — bundle context validation", () => {
  it("errors when the bundle context itself is invalid", () => {
    const r = checkBundleConsistency(
      makeBundle({ context: { ...legCtx(), tour_id: "", tour_version_id: "" } }),
    )
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.startsWith("context:"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Type shape spot-checks
// ---------------------------------------------------------------------------

describe("type shape spot-checks", () => {
  it("TravelSegmentRef has segment_id, context, mode, passenger_count", () => {
    const seg = makeTravelSegment("seg-x")
    expect(seg.segment_id).toBe("seg-x")
    expect(seg.mode).toBe("drive")
    expect(seg.passenger_count).toBe(4)
    expect(seg.context.leg_id).toBe("leg-s1-s2")
  })

  it("RoomNightRef has stop_id context (not leg_id)", () => {
    const rn = makeRoomNight("rn-x")
    expect(rn.context.stop_id).toBe("s2")
    expect(rn.context.leg_id).toBeNull()
    expect(validateRouteLegContext(rn.context).valid).toBe(true)
  })

  it("VehicleMovementRef tracks passenger and equipment ids", () => {
    const vm = makeVehicleMovement("vm-x", ["p1", "p2"])
    vm.equipment_ids = ["eq1", "eq2"]
    expect(vm.passenger_ids).toHaveLength(2)
    expect(vm.equipment_ids).toHaveLength(2)
  })

  it("PassengerAssignmentRef has room night flag", () => {
    const pa = makePassengerAssignment("pa-x", "p1")
    expect(pa.has_room_night).toBe(false)
    const paWithRoom: PassengerAssignmentRef = { ...pa, has_room_night: true }
    expect(paWithRoom.has_room_night).toBe(true)
  })

  it("EquipmentMoveRef supports airline_baggage mode", () => {
    const em: EquipmentMoveRef = {
      ...makeEquipmentMove("em-x"),
      mode: "airline_baggage",
    }
    expect(em.mode).toBe("airline_baggage")
  })
})
