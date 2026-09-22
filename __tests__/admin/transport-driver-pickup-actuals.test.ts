/**
 * TRANS-304/305/306 combined tests.
 */

import { describe, it, expect } from "vitest"
import {
  validateDriverAssignment,
  driverAssignmentIsValid,
  DEFAULT_DRIVER_REST_POLICY,
} from "@/lib/admin/transport-driver-assignment"
import {
  updatePassengerCheckState,
  reportDelay,
  totalDelayMinutes,
  estimatedActualUtc,
  allPassengersCheckedIn,
  type PickupDropoffOperation,
} from "@/lib/admin/transport-pickup-ops"
import {
  computeActualDistance,
  computeTotalFuelCost,
  computeTotalTollCost,
  hasUnresolvedIssues,
  vendorFollowUpRequired,
  buildActualsFinanceSummary,
  type VehicleMovementActuals,
} from "@/lib/admin/transport-movement-actuals"

const NOW = "2026-08-01T10:00:00.000Z"
const ACTOR = "user-1"

// ---------------------------------------------------------------------------
// TRANS-304: Driver assignment validation
// ---------------------------------------------------------------------------

describe("validateDriverAssignment — TRANS-304", () => {
  it("returns ok when all checks pass", () => {
    const results = validateDriverAssignment({
      plannedDriveMinutes: 300,
      policy: DEFAULT_DRIVER_REST_POLICY,
    })
    expect(driverAssignmentIsValid(results)).toBe(true)
    expect(results[0].code).toBe("ok")
  })

  it("flags exceeds_drive_hours when over policy max", () => {
    const results = validateDriverAssignment({
      plannedDriveMinutes: 700,
      policy: DEFAULT_DRIVER_REST_POLICY,
    })
    expect(results.some((r) => r.code === "exceeds_drive_hours")).toBe(true)
    expect(driverAssignmentIsValid(results)).toBe(false)
  })

  it("flags insufficient_rest when rest is too short", () => {
    const results = validateDriverAssignment({
      plannedDriveMinutes: 300,
      policy: DEFAULT_DRIVER_REST_POLICY,
      previousAssignmentEndUtc: "2026-08-01T04:00:00Z",
      currentAssignmentStartUtc: "2026-08-01T06:00:00Z", // only 2h rest
    })
    expect(results.some((r) => r.code === "insufficient_rest")).toBe(true)
  })

  it("flags missing_license_class when class doesn't match", () => {
    const results = validateDriverAssignment({
      plannedDriveMinutes: 300,
      driverLicenseClass: "Class B",
      policy: { ...DEFAULT_DRIVER_REST_POLICY, requiredLicenseClass: "CDL-A" },
    })
    expect(results.some((r) => r.code === "missing_license_class")).toBe(true)
  })

  it("flags availability_conflict when overlapping", () => {
    const results = validateDriverAssignment({
      plannedDriveMinutes: 300,
      policy: DEFAULT_DRIVER_REST_POLICY,
      conflicts: [{ conflicting_movement_id: "mv2", planned_departure_utc: NOW, planned_arrival_utc: NOW }],
    })
    expect(results.some((r) => r.code === "availability_conflict")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TRANS-305: Pickup/dropoff operations
// ---------------------------------------------------------------------------

function makePickupOp(overrides: Partial<PickupDropoffOperation> = {}): PickupDropoffOperation {
  return {
    operation_id: "op1",
    movement_id: "mv1",
    event_type: "pickup",
    location: { label: "Venue Backstage", offline_instructions: "Use side entrance" },
    scheduled_utc: "2026-08-01T14:00:00Z",
    passenger_checks: [
      { person_id: "p1", person_name: "Alice", state: "expected" },
      { person_id: "p2", person_name: "Bob", state: "expected" },
    ],
    delays: [],
    status: "pending",
    created_by: ACTOR,
    created_at: NOW,
    ...overrides,
  }
}

describe("pickup/dropoff operations — TRANS-305", () => {
  it("updates passenger check state", () => {
    const op = makePickupOp()
    const updated = updatePassengerCheckState(op, "p1", "checked_in", NOW)
    expect(updated.passenger_checks.find((p) => p.person_id === "p1")!.state).toBe("checked_in")
    expect(updated.passenger_checks.find((p) => p.person_id === "p2")!.state).toBe("expected")
  })

  it("reports delay and sets status to exception", () => {
    const op = makePickupOp()
    const delayed = reportDelay(op, 30, "Traffic", ACTOR, NOW)
    expect(delayed.status).toBe("exception")
    expect(totalDelayMinutes(delayed)).toBe(30)
  })

  it("estimates actual UTC based on delay", () => {
    const op = makePickupOp()
    const delayed = reportDelay(op, 30, "Traffic", ACTOR, NOW)
    const estimated = estimatedActualUtc(delayed)
    expect(estimated).toBe("2026-08-01T14:30:00.000Z")
  })

  it("allPassengersCheckedIn returns true when all checked in or no_show", () => {
    const op = makePickupOp()
    const updated = updatePassengerCheckState(
      updatePassengerCheckState(op, "p1", "checked_in", NOW),
      "p2",
      "no_show",
      NOW,
    )
    expect(allPassengersCheckedIn(updated)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TRANS-306: Movement actuals
// ---------------------------------------------------------------------------

function makeActuals(overrides: Partial<VehicleMovementActuals> = {}): VehicleMovementActuals {
  return {
    movement_id: "mv1",
    odometer_start_km: 10000,
    odometer_end_km: 10420,
    fuel_records: [{ amount_litres: 40, amount_gallons: null, cost: 60, currency: "USD", fueled_at: NOW }],
    toll_records: [{ cost: 12, currency: "USD" }],
    issue_reports: [],
    recorded_by: ACTOR,
    recorded_at: NOW,
    ...overrides,
  }
}

describe("movement actuals — TRANS-306", () => {
  it("computes distance from odometers", () => {
    const a = makeActuals()
    expect(computeActualDistance(a)).toBe(420)
  })

  it("uses actual_distance_km when set", () => {
    const a = makeActuals({ actual_distance_km: 500 })
    expect(computeActualDistance(a)).toBe(500)
  })

  it("computes total fuel and toll cost", () => {
    const a = makeActuals()
    expect(computeTotalFuelCost(a)).toBe(60)
    expect(computeTotalTollCost(a)).toBe(12)
  })

  it("detects unresolved issues", () => {
    const a = makeActuals({
      issue_reports: [{
        issue_id: "i1", movement_id: "mv1", issue_type: "delay", severity: "minor",
        description: "Flat tire", reported_at: NOW, reported_by: ACTOR, requires_vendor_follow_up: false,
      }],
    })
    expect(hasUnresolvedIssues(a)).toBe(true)
  })

  it("vendor follow-up required when flagged and unresolved", () => {
    const a = makeActuals({
      issue_reports: [{
        issue_id: "i1", movement_id: "mv1", issue_type: "vendor_issue", severity: "major",
        description: "Vehicle arrived 2h late", reported_at: NOW, reported_by: ACTOR, requires_vendor_follow_up: true,
      }],
    })
    expect(vendorFollowUpRequired(a)).toBe(true)
  })

  it("buildActualsFinanceSummary aggregates correctly", () => {
    const a = makeActuals()
    const s = buildActualsFinanceSummary(a)
    expect(s.distance_km).toBe(420)
    expect(s.fuel_cost).toBe(60)
    expect(s.toll_cost).toBe(12)
    expect(s.total_cost).toBe(72)
    expect(s.has_issues).toBe(false)
  })
})
