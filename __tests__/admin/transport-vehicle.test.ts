/**
 * TRANS-301 — Vehicle master and capacity tests.
 */

import { describe, it, expect } from "vitest"
import {
  validateVehicle,
  hasPassengerCapacity,
  meetsAccessibilityRequirements,
  isVehicleAvailable,
  remainingPassengerCapacity,
  getVehicleSensitiveDataSummary,
  makeVehicle,
  type Vehicle,
  type VehicleCapacity,
} from "@/lib/admin/transport-vehicle"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"
const ACTOR = "user-1"

const makeCap = (overrides: Partial<VehicleCapacity> = {}): VehicleCapacity => ({
  passenger_seats: 12,
  sleeping_berths: 0,
  cargo_cubic_meters: 5,
  wheelchair_spaces: 2,
  is_accessible: true,
  ...overrides,
})

const makeTestVehicle = (overrides: Partial<Vehicle> = {}): Vehicle =>
  makeVehicle({
    vehicle_id: "v1",
    label: "Tour Bus #1",
    vehicle_class: "bus",
    ownership: "rented",
    capacity: makeCap(),
    actor: ACTOR,
    at: NOW,
    overrides,
  })

// ---------------------------------------------------------------------------
// validateVehicle
// ---------------------------------------------------------------------------

describe("validateVehicle", () => {
  it("accepts a valid vehicle", () => {
    const r = validateVehicle(makeTestVehicle())
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it("requires vehicle_id", () => {
    const r = validateVehicle({ ...makeTestVehicle(), vehicle_id: "" })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("vehicle_id"))).toBe(true)
  })

  it("requires label", () => {
    const r = validateVehicle({ ...makeTestVehicle(), label: "" })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("label"))).toBe(true)
  })

  it("rejects negative passenger_seats", () => {
    const r = validateVehicle({ ...makeTestVehicle(), capacity: makeCap({ passenger_seats: -1 }) })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("passenger_seats"))).toBe(true)
  })

  it("rejects negative cargo_cubic_meters", () => {
    const r = validateVehicle({ ...makeTestVehicle(), capacity: makeCap({ cargo_cubic_meters: -5 }) })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("cargo_cubic_meters"))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Capacity helpers
// ---------------------------------------------------------------------------

describe("hasPassengerCapacity", () => {
  it("returns true when enough capacity", () => {
    const v = makeTestVehicle()
    expect(hasPassengerCapacity(v, 10, 0)).toBe(true)
  })

  it("returns false when over capacity", () => {
    const v = makeTestVehicle()
    expect(hasPassengerCapacity(v, 10, 5)).toBe(false) // 12 - 5 = 7 < 10
  })

  it("exact capacity is ok", () => {
    const v = makeTestVehicle()
    expect(hasPassengerCapacity(v, 12, 0)).toBe(true)
  })

  it("one over capacity is not ok", () => {
    const v = makeTestVehicle()
    expect(hasPassengerCapacity(v, 13, 0)).toBe(false)
  })
})

describe("meetsAccessibilityRequirements", () => {
  it("returns true when no accessibility needs", () => {
    const v = makeTestVehicle()
    expect(meetsAccessibilityRequirements(v, false)).toBe(true)
  })

  it("returns true when accessible and wheelchair space available", () => {
    const v = makeTestVehicle()
    expect(meetsAccessibilityRequirements(v, true, 0)).toBe(true)
  })

  it("returns false when not accessible", () => {
    const v = makeTestVehicle({ capacity: makeCap({ is_accessible: false, wheelchair_spaces: 0 }) })
    expect(meetsAccessibilityRequirements(v, true)).toBe(false)
  })

  it("returns false when wheelchair spaces are used up", () => {
    const v = makeTestVehicle({ capacity: makeCap({ wheelchair_spaces: 1 }) })
    expect(meetsAccessibilityRequirements(v, true, 1)).toBe(false)
  })
})

describe("isVehicleAvailable", () => {
  it("active vehicle is available", () => {
    expect(isVehicleAvailable(makeTestVehicle())).toBe(true)
  })

  it("maintenance vehicle is not available", () => {
    expect(isVehicleAvailable(makeTestVehicle({ status: "maintenance" }))).toBe(false)
  })

  it("retired vehicle is not available", () => {
    expect(isVehicleAvailable(makeTestVehicle({ status: "retired" }))).toBe(false)
  })
})

describe("remainingPassengerCapacity", () => {
  it("returns correct remaining seats", () => {
    const v = makeTestVehicle()
    expect(remainingPassengerCapacity(v, 4)).toBe(8)
  })

  it("never returns negative", () => {
    const v = makeTestVehicle()
    expect(remainingPassengerCapacity(v, 100)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Sensitive data
// ---------------------------------------------------------------------------

describe("getVehicleSensitiveDataSummary", () => {
  it("returns null indicator when no sensitive docs", () => {
    const v = makeTestVehicle()
    const s = getVehicleSensitiveDataSummary(v)
    expect(s.has_sensitive_driver_docs).toBe(false)
    expect(s.protected_indicator).toBeNull()
  })

  it("returns protected indicator when sensitive docs exist", () => {
    const v = makeTestVehicle({ has_sensitive_driver_docs: true })
    const s = getVehicleSensitiveDataSummary(v)
    expect(s.has_sensitive_driver_docs).toBe(true)
    expect(s.protected_indicator).toContain("protected")
  })
})

// ---------------------------------------------------------------------------
// makeVehicle factory
// ---------------------------------------------------------------------------

describe("makeVehicle", () => {
  it("creates a vehicle with active status by default", () => {
    const v = makeTestVehicle()
    expect(v.status).toBe("active")
    expect(v.has_sensitive_driver_docs).toBe(false)
  })

  it("applies overrides", () => {
    const v = makeVehicle({
      vehicle_id: "v2",
      label: "Coach",
      vehicle_class: "coach",
      ownership: "org_owned",
      capacity: makeCap(),
      actor: ACTOR,
      at: NOW,
      overrides: { fleet_number: "FLEET-001", has_sensitive_driver_docs: true },
    })
    expect(v.fleet_number).toBe("FLEET-001")
    expect(v.has_sensitive_driver_docs).toBe(true)
  })
})
