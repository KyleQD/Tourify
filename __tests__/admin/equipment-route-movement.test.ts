import { describe, expect, it } from "vitest"

import {
  assertMovementStatusTransition,
  buildEquipmentCoverageReport,
  canTransitionMovementStatus,
  deriveEquipmentLocationState,
  evaluateLineCoverage,
  evaluateVehicleCapacity,
  MovementStatusTransitionError,
  type EquipmentMovement,
  type ManifestLineItem,
} from "@/lib/admin/equipment-route-movement"
import { makeLegContext } from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeMovement(overrides: Partial<EquipmentMovement> = {}): EquipmentMovement {
  return {
    id: overrides.id ?? "mov-1",
    org_id: "org-1",
    tour_id: "tour-1",
    catalog_item_id: overrides.catalog_item_id ?? "item-1",
    case_id: overrides.case_id ?? null,
    item_label: overrides.item_label ?? "Shure SM58",
    route_leg_context: overrides.route_leg_context ?? makeLegContext({
      tourId: "tour-1",
      tourVersionId: "v1",
      legId: "leg-1",
      fromStopId: "stop-a",
      toStopId: "stop-b",
    }),
    mode: overrides.mode ?? "own_vehicle",
    vehicle_movement_id: overrides.vehicle_movement_id ?? null,
    travel_segment_id: null,
    origin: overrides.origin ?? { stop_id: "stop-a", location_label: "Stop A", location_notes: null },
    destination: overrides.destination ?? { stop_id: "stop-b", location_label: "Stop B", location_notes: null },
    planned_departure_utc: "2025-06-01T08:00:00Z",
    actual_departure_utc: null,
    planned_arrival_utc: "2025-06-01T14:00:00Z",
    actual_arrival_utc: null,
    custody_owner_id: overrides.custody_owner_id ?? "user-1",
    custody_owner_label: "Stage Manager",
    handling_notes: null,
    requires_climate_control: false,
    is_fragile: false,
    status: overrides.status ?? "planned",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  }
}

function makeLineItem(overrides: Partial<ManifestLineItem> = {}): ManifestLineItem {
  return {
    id: overrides.id ?? "line-1",
    source_id: overrides.source_id ?? "item-1",
    source_type: "org_catalog",
    label: overrides.label ?? "Shure SM58",
    quantity_required: 4,
    quantity_sourced: 4,
    alternates: [],
    department: "FOH Audio",
    responsible_role: "A1",
    notes: null,
    is_sourced: true,
    ...overrides,
  }
}

// ============================================================================
// Movement status transitions
// ============================================================================

describe("EQUIP-303 movement status transitions", () => {
  it("allows planned → confirmed → in_transit → arrived", () => {
    expect(canTransitionMovementStatus("planned", "confirmed")).toBe(true)
    expect(canTransitionMovementStatus("confirmed", "in_transit")).toBe(true)
    expect(canTransitionMovementStatus("in_transit", "arrived")).toBe(true)
  })

  it("allows any non-terminal to cancel", () => {
    expect(canTransitionMovementStatus("planned", "cancelled")).toBe(true)
    expect(canTransitionMovementStatus("confirmed", "cancelled")).toBe(true)
    expect(canTransitionMovementStatus("in_transit", "cancelled")).toBe(true)
  })

  it("allows re-plan after cancel", () => {
    expect(canTransitionMovementStatus("cancelled", "planned")).toBe(true)
  })

  it("rejects arrived → any (terminal)", () => {
    expect(canTransitionMovementStatus("arrived", "planned")).toBe(false)
    expect(canTransitionMovementStatus("arrived", "in_transit")).toBe(false)
    expect(() => assertMovementStatusTransition("arrived", "in_transit")).toThrow(
      MovementStatusTransitionError,
    )
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionMovementStatus("planned", "planned")).toBe(true)
  })
})

// ============================================================================
// Location state derivation
// ============================================================================

describe("EQUIP-303 equipment location state", () => {
  it("reports arrived at destination when latest movement is arrived", () => {
    const movements = [
      makeMovement({ id: "m1", status: "arrived", destination: { stop_id: "stop-b", location_label: "Stop B", location_notes: null } }),
    ]
    const state = deriveEquipmentLocationState("item-1", false, "SM58", movements, "deployed")
    expect(state.source).toBe("movement_arrived")
    expect(state.current_location?.stop_id).toBe("stop-b")
    expect(state.movement_id).toBe("m1")
    expect(state.asset_status).toBe("deployed")
  })

  it("reports origin when movement is in_transit", () => {
    const movements = [
      makeMovement({ id: "m1", status: "in_transit", origin: { stop_id: "stop-a", location_label: "Stop A", location_notes: null } }),
    ]
    const state = deriveEquipmentLocationState("item-1", false, "SM58", movements, "deployed")
    expect(state.source).toBe("movement_in_transit")
    expect(state.current_location?.stop_id).toBe("stop-a")
  })

  it("reports staged location when mode is staged_in_place and confirmed", () => {
    const movements = [
      makeMovement({
        id: "m1",
        status: "confirmed",
        mode: "staged_in_place",
        destination: { stop_id: "stop-c", location_label: "Venue Stage", location_notes: null },
      }),
    ]
    const state = deriveEquipmentLocationState("item-1", false, "SM58", movements, "available")
    expect(state.source).toBe("staged")
    expect(state.current_location?.stop_id).toBe("stop-c")
  })

  it("reports unassigned when no active movements", () => {
    const state = deriveEquipmentLocationState("item-1", false, "SM58", [], null)
    expect(state.source).toBe("unassigned")
    expect(state.current_location).toBeNull()
  })

  it("resolves case_id correctly when isCase=true", () => {
    const movements = [
      makeMovement({ id: "m1", case_id: "case-1", catalog_item_id: null, status: "arrived" }),
    ]
    const state = deriveEquipmentLocationState("case-1", true, "FOH Case", movements, null)
    expect(state.case_id).toBe("case-1")
    expect(state.catalog_item_id).toBeNull()
    expect(state.source).toBe("movement_arrived")
  })
})

// ============================================================================
// Gap detection — line coverage
// ============================================================================

describe("EQUIP-303 line coverage gaps", () => {
  const line = makeLineItem()

  it("returns no gaps when movement covers the leg with owner", () => {
    const movements = [makeMovement({ status: "planned", custody_owner_id: "user-1" })]
    const gaps = evaluateLineCoverage(line, ["leg-1"], movements)
    expect(gaps).toHaveLength(0)
  })

  it("flags no_movement_for_leg when no movement exists", () => {
    const gaps = evaluateLineCoverage(line, ["leg-1"], [])
    expect(gaps).toHaveLength(1)
    expect(gaps[0].code).toBe("no_movement_for_leg")
    expect(gaps[0].severity).toBe("blocking")
  })

  it("flags movement_cancelled when all movements for leg are cancelled", () => {
    const movements = [makeMovement({ status: "cancelled" })]
    const gaps = evaluateLineCoverage(line, ["leg-1"], movements)
    expect(gaps[0].code).toBe("movement_cancelled")
    expect(gaps[0].severity).toBe("blocking")
  })

  it("flags no_custody_owner as warning when owner missing", () => {
    const movements = [makeMovement({ status: "planned", custody_owner_id: null })]
    const gaps = evaluateLineCoverage(line, ["leg-1"], movements)
    expect(gaps.some((g) => g.code === "no_custody_owner")).toBe(true)
    expect(gaps.find((g) => g.code === "no_custody_owner")?.severity).toBe("warning")
  })

  it("reports gaps per leg independently", () => {
    const movements = [makeMovement({ status: "planned", route_leg_context: makeLegContext({ tourId: "tour-1", tourVersionId: "v1", legId: "leg-1", fromStopId: "stop-a", toStopId: "stop-b" }) })]
    // leg-2 has no movement
    const gaps = evaluateLineCoverage(line, ["leg-1", "leg-2"], movements)
    expect(gaps.some((g) => g.leg_id === "leg-2" && g.code === "no_movement_for_leg")).toBe(true)
    expect(gaps.filter((g) => g.leg_id === "leg-1")).toHaveLength(0)
  })
})

// ============================================================================
// Vehicle capacity checks
// ============================================================================

describe("EQUIP-303 vehicle capacity", () => {
  it("passes when under both limits", () => {
    const assignments = [
      { vehicle_movement_id: "vm-1", catalog_item_id: "i1", case_id: null, item_label: "SM58", weight_kg: 0.3 },
      { vehicle_movement_id: "vm-1", catalog_item_id: "i2", case_id: null, item_label: "DI Box", weight_kg: 0.5 },
    ]
    const result = evaluateVehicleCapacity(
      { vehicle_movement_id: "vm-1", max_item_count: 10, max_weight_kg: 100 },
      assignments,
    )
    expect(result.over_count).toBe(false)
    expect(result.over_weight).toBe(false)
    expect(result.gaps).toHaveLength(0)
    expect(result.total_weight_kg).toBeCloseTo(0.8)
  })

  it("flags over_count when count exceeds limit", () => {
    const assignments = Array.from({ length: 5 }, (_, i) => ({
      vehicle_movement_id: "vm-1",
      catalog_item_id: `i${i}`,
      case_id: null,
      item_label: `Item ${i}`,
      weight_kg: 1,
    }))
    const result = evaluateVehicleCapacity(
      { vehicle_movement_id: "vm-1", max_item_count: 3, max_weight_kg: 100 },
      assignments,
    )
    expect(result.over_count).toBe(true)
    expect(result.gaps.some((g) => g.code === "vehicle_capacity_exceeded")).toBe(true)
  })

  it("flags over_weight when weight exceeds limit", () => {
    const assignments = [
      { vehicle_movement_id: "vm-1", catalog_item_id: "i1", case_id: null, item_label: "Heavy Case", weight_kg: 150 },
    ]
    const result = evaluateVehicleCapacity(
      { vehicle_movement_id: "vm-1", max_item_count: null, max_weight_kg: 100 },
      assignments,
    )
    expect(result.over_weight).toBe(true)
    expect(result.gaps.some((g) => g.code === "vehicle_capacity_exceeded")).toBe(true)
  })

  it("ignores null limits (no constraint)", () => {
    const assignments = Array.from({ length: 50 }, (_, i) => ({
      vehicle_movement_id: "vm-1",
      catalog_item_id: `i${i}`,
      case_id: null,
      item_label: `Item ${i}`,
      weight_kg: 100,
    }))
    const result = evaluateVehicleCapacity(
      { vehicle_movement_id: "vm-1", max_item_count: null, max_weight_kg: null },
      assignments,
    )
    expect(result.over_count).toBe(false)
    expect(result.over_weight).toBe(false)
  })
})

// ============================================================================
// Full coverage report
// ============================================================================

describe("EQUIP-303 buildEquipmentCoverageReport", () => {
  const legIds = ["leg-1", "leg-2", "leg-3"]

  const lineItems: ManifestLineItem[] = [
    makeLineItem({ id: "l1", source_id: "item-1", label: "SM58" }),
    makeLineItem({ id: "l2", source_id: "item-2", label: "DI Box" }),
  ]

  function makeMovementForLeg(legId: string, itemId: string, status: EquipmentMovement["status"] = "planned"): EquipmentMovement {
    return makeMovement({
      id: `${legId}-${itemId}`,
      catalog_item_id: itemId,
      route_leg_context: makeLegContext({ tourId: "tour-1", tourVersionId: "v1", legId, fromStopId: "stop-a", toStopId: "stop-b" }),
      status,
    })
  }

  it("fully covered — no gaps", () => {
    const allMovements = [
      makeMovementForLeg("leg-1", "item-1"),
      makeMovementForLeg("leg-1", "item-2"),
      makeMovementForLeg("leg-2", "item-1"),
      makeMovementForLeg("leg-2", "item-2"),
      makeMovementForLeg("leg-3", "item-1"),
      makeMovementForLeg("leg-3", "item-2"),
    ]
    const report = buildEquipmentCoverageReport({
      tourId: "tour-1", manifestId: "manifest-1", lineItems, legIds, allMovements,
    })
    expect(report.blocking_gap_count).toBe(0)
    expect(report.fully_covered_legs).toBe(3)
    expect(report.legs_with_gaps).toBe(0)
    expect(report.unassigned_items).toHaveLength(0)
  })

  it("detects gaps on some legs", () => {
    // leg-3 has no movements for item-2
    const allMovements = [
      makeMovementForLeg("leg-1", "item-1"),
      makeMovementForLeg("leg-1", "item-2"),
      makeMovementForLeg("leg-2", "item-1"),
      makeMovementForLeg("leg-2", "item-2"),
      makeMovementForLeg("leg-3", "item-1"),
      // item-2 missing on leg-3
    ]
    const report = buildEquipmentCoverageReport({
      tourId: "tour-1", manifestId: "manifest-1", lineItems, legIds, allMovements,
    })
    expect(report.legs_with_gaps).toBe(1)
    expect(report.blocking_gap_count).toBeGreaterThan(0)
  })

  it("identifies completely unassigned items", () => {
    // item-2 has no movements at all
    const allMovements = [
      makeMovementForLeg("leg-1", "item-1"),
      makeMovementForLeg("leg-2", "item-1"),
      makeMovementForLeg("leg-3", "item-1"),
    ]
    const report = buildEquipmentCoverageReport({
      tourId: "tour-1", manifestId: "manifest-1", lineItems, legIds, allMovements,
    })
    expect(report.unassigned_items).toContain("DI Box")
    expect(report.unassigned_items).not.toContain("SM58")
  })

  it("handles empty legs list", () => {
    const report = buildEquipmentCoverageReport({
      tourId: "tour-1", manifestId: "manifest-1", lineItems, legIds: [], allMovements: [],
    })
    expect(report.total_legs).toBe(0)
    expect(report.fully_covered_legs).toBe(0)
  })
})
