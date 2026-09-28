/**
 * ROUTE-304 — Route constraint engine tests.
 *
 * Acceptance criteria:
 *  1. same_day_overlap      — two shows on same local day → error; different days → null
 *  2. insufficient_travel   — travel+buffer > gap → error; adequate gap → null
 *  3. insufficient_rest     — rest < policy.minRestMinutes between drive legs → warning
 *  4. excessive_drive       — single leg > policy.maxDriveMinutes → warning
 *  5. curfew_conflict       — estimated arrival after venue curfew → error
 *  6. border_ferry_risk     — ferry/border with inadequate buffer → warning; no times → warning
 *  7. missing_location      — no venue, no id, no coords → warning; any present → null
 *  8. impossible_arrival    — can't reach show start in time → error
 *  evaluateRouteConstraints — consolidated engine returns all violations; errors/warnings split;
 *                             hasErrors/hasWarnings flags correct; stop-only checks run per stop;
 *                             non-show stops excluded from same-day check.
 */

import { describe, expect, it } from "vitest"

import {
  checkBorderFerryRisk,
  checkCurfewConflict,
  checkExcessiveDrive,
  checkImpossibleArrival,
  checkInsufficientRest,
  checkInsufficientTravel,
  checkMissingLocation,
  checkSameDayOverlap,
  DEFAULT_ROUTE_CONSTRAINT_POLICY,
  evaluateRouteConstraints,
  type ConstraintLeg,
  type ConstraintStop,
} from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeStop(overrides: Partial<ConstraintStop> = {}): ConstraintStop {
  return {
    id: "stop-1",
    ordinal: 0,
    name: "Chicago",
    stop_type: "show",
    start_utc: "2026-07-20T19:00:00Z",    // 2pm EDT / 2pm CDT
    end_utc:   "2026-07-20T23:00:00Z",    // 6pm CDT
    ianaZone: "America/Chicago",
    curfew_local: null,
    has_border_crossing: false,
    venue_label: "Civic Center",
    venue_id: "venue-1",
    has_coordinates: true,
    ...overrides,
  }
}

function makeLeg(overrides: Partial<ConstraintLeg> = {}): ConstraintLeg {
  return {
    id: "leg-1",
    fromStopId: "stop-1",
    toStopId: "stop-2",
    fromOrdinal: 0,
    toOrdinal: 1,
    transport_mode: "drive",
    duration_minutes: 240,   // 4 hours
    distance_km: 400,
    buffer_minutes: 30,
    override: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// 1. same_day_overlap
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkSameDayOverlap", () => {
  it("returns error when two shows are on the same local day", () => {
    const a = makeStop({ id: "s1", ordinal: 0, start_utc: "2026-07-20T18:00:00Z", ianaZone: "America/Chicago" })
    const b = makeStop({ id: "s2", ordinal: 1, name: "Detroit", start_utc: "2026-07-20T23:00:00Z", ianaZone: "America/Chicago" })
    const v = checkSameDayOverlap(a, b)
    expect(v?.code).toBe("same_day_overlap")
    expect(v?.severity).toBe("error")
  })

  it("returns null when shows are on different local days", () => {
    const a = makeStop({ id: "s1", start_utc: "2026-07-20T18:00:00Z" })
    const b = makeStop({ id: "s2", start_utc: "2026-07-21T19:00:00Z" })
    expect(checkSameDayOverlap(a, b)).toBeNull()
  })

  it("returns null when either stop has no start_utc", () => {
    const a = makeStop({ id: "s1", start_utc: null })
    const b = makeStop({ id: "s2" })
    expect(checkSameDayOverlap(a, b)).toBeNull()
  })

  it("returns null for non-show stop types", () => {
    const a = makeStop({ id: "s1", stop_type: "travel", start_utc: "2026-07-20T10:00:00Z" })
    const b = makeStop({ id: "s2", stop_type: "rest", start_utc: "2026-07-20T20:00:00Z" })
    expect(checkSameDayOverlap(a, b)).toBeNull()
  })

  it("detects overlap even when shows are in different time zones but share a UTC day", () => {
    // Both are CDT (UTC-5) day of Jul 20 in local — same local day
    const a = makeStop({ id: "s1", start_utc: "2026-07-20T18:00:00Z", ianaZone: "America/Chicago" })
    const b = makeStop({ id: "s2", start_utc: "2026-07-20T22:00:00Z", ianaZone: "America/Chicago" })
    expect(checkSameDayOverlap(a, b)?.code).toBe("same_day_overlap")
  })
})

// ---------------------------------------------------------------------------
// 2. insufficient_travel
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkInsufficientTravel", () => {
  it("returns error when travel+buffer exceeds the available gap", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    // Only 2h gap, but travel is 4h + 30min buffer = 270 min
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T01:00:00Z" })
    const leg = makeLeg({ duration_minutes: 240, buffer_minutes: 30 })
    const v = checkInsufficientTravel(from, to, leg)
    expect(v?.code).toBe("insufficient_travel")
    expect(v?.severity).toBe("error")
  })

  it("returns null when gap is adequate", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    // 6h gap, travel 4h + 30min buffer = 270 min ≤ 360 min
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T05:00:00Z" })
    const leg = makeLeg({ duration_minutes: 240, buffer_minutes: 30 })
    expect(checkInsufficientTravel(from, to, leg)).toBeNull()
  })

  it("returns null when stop times are missing", () => {
    const from = makeStop({ end_utc: null })
    const to = makeStop({ id: "s2", start_utc: null })
    expect(checkInsufficientTravel(from, to, makeLeg())).toBeNull()
  })

  it("returns null when leg duration is unknown", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T01:00:00Z" })
    expect(checkInsufficientTravel(from, to, makeLeg({ duration_minutes: null }))).toBeNull()
  })

  it("uses approved override duration when present", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T01:30:00Z" }) // 2.5h gap
    // Provider says 2h but override says 1h — override wins; 1h + 30min buffer = 90 min ≤ 150 min → no violation
    const leg = makeLeg({
      duration_minutes: 120,
      buffer_minutes: 30,
      override: { distance_km: null, duration_minutes: 60, approvedBy: "mgr-1", reason: "Shortcut" },
    })
    expect(checkInsufficientTravel(from, to, leg)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 3. insufficient_rest
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkInsufficientRest", () => {
  it("returns warning when rest < policy min between two drive legs", () => {
    const prevLeg = makeLeg({ id: "leg-a", fromStopId: "s0", toStopId: "s1", transport_mode: "drive" })
    const restStop = makeStop({ id: "s1", start_utc: "2026-07-21T06:00:00Z", end_utc: "2026-07-21T09:00:00Z" }) // 3h rest
    const nextLeg = makeLeg({ id: "leg-b", fromStopId: "s1", toStopId: "s2", transport_mode: "drive" })
    const v = checkInsufficientRest(prevLeg, restStop, nextLeg, { ...DEFAULT_ROUTE_CONSTRAINT_POLICY, minRestMinutes: 480 })
    expect(v?.code).toBe("insufficient_rest")
    expect(v?.severity).toBe("warning")
  })

  it("returns null when rest meets the policy minimum", () => {
    const prevLeg = makeLeg({ transport_mode: "drive", fromStopId: "s0", toStopId: "s1" })
    const restStop = makeStop({ id: "s1", start_utc: "2026-07-21T06:00:00Z", end_utc: "2026-07-21T15:00:00Z" }) // 9h
    const nextLeg = makeLeg({ transport_mode: "drive", fromStopId: "s1", toStopId: "s2" })
    expect(checkInsufficientRest(prevLeg, restStop, nextLeg, { ...DEFAULT_ROUTE_CONSTRAINT_POLICY, minRestMinutes: 480 })).toBeNull()
  })

  it("returns null when adjacent legs are not both drive", () => {
    const prevLeg = makeLeg({ transport_mode: "fly", fromStopId: "s0", toStopId: "s1" })
    const restStop = makeStop({ id: "s1", start_utc: "2026-07-21T06:00:00Z", end_utc: "2026-07-21T08:00:00Z" })
    const nextLeg = makeLeg({ transport_mode: "drive", fromStopId: "s1", toStopId: "s2" })
    expect(checkInsufficientRest(prevLeg, restStop, nextLeg)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 4. excessive_drive
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkExcessiveDrive", () => {
  it("returns warning when drive duration exceeds policy maximum", () => {
    const leg = makeLeg({ transport_mode: "drive", duration_minutes: 660 }) // 11h
    const v = checkExcessiveDrive(makeStop(), makeStop({ id: "s2" }), leg, { ...DEFAULT_ROUTE_CONSTRAINT_POLICY, maxDriveMinutes: 600 })
    expect(v?.code).toBe("excessive_drive")
    expect(v?.severity).toBe("warning")
    expect(v?.evidence.travelMinutes).toBe(660)
  })

  it("returns null when duration is within policy maximum", () => {
    const leg = makeLeg({ transport_mode: "drive", duration_minutes: 540 }) // 9h
    expect(checkExcessiveDrive(makeStop(), makeStop({ id: "s2" }), leg)).toBeNull()
  })

  it("returns null for non-drive legs regardless of duration", () => {
    const leg = makeLeg({ transport_mode: "fly", duration_minutes: 900 }) // very long flight
    expect(checkExcessiveDrive(makeStop(), makeStop({ id: "s2" }), leg)).toBeNull()
  })

  it("returns null when duration is unknown", () => {
    expect(checkExcessiveDrive(makeStop(), makeStop({ id: "s2" }), makeLeg({ duration_minutes: null }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 5. curfew_conflict
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkCurfewConflict", () => {
  it("returns error when estimated arrival is after venue curfew", () => {
    // Depart 23:00Z (18:00 CDT), travel 4h, arrive 03:00Z next day (22:00 CDT)
    // Curfew 21:00 → conflict
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({
      id: "s2",
      name: "Detroit",
      ianaZone: "America/Detroit",
      curfew_local: "21:00",
    })
    const leg = makeLeg({ duration_minutes: 240, buffer_minutes: 0 })
    const v = checkCurfewConflict(from, to, leg)
    expect(v?.code).toBe("curfew_conflict")
    expect(v?.severity).toBe("error")
  })

  it("returns null when arrival is before curfew", () => {
    // Depart 15:00Z (10:00 CDT), travel 2h, arrive 17:00Z (12:00 CDT)
    // Curfew 23:00 → OK
    const from = makeStop({ end_utc: "2026-07-20T15:00:00Z" })
    const to = makeStop({ id: "s2", ianaZone: "America/Chicago", curfew_local: "23:00" })
    const leg = makeLeg({ duration_minutes: 120, buffer_minutes: 0 })
    expect(checkCurfewConflict(from, to, leg)).toBeNull()
  })

  it("returns null when destination has no curfew", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", curfew_local: null })
    expect(checkCurfewConflict(from, to, makeLeg())).toBeNull()
  })

  it("returns null when duration is unknown", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", curfew_local: "22:00" })
    expect(checkCurfewConflict(from, to, makeLeg({ duration_minutes: null }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 6. border_ferry_risk
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkBorderFerryRisk", () => {
  it("returns warning for ferry leg without adequate customs buffer", () => {
    // Gap is 3h (180 min), travel 2h, buffer 0 → surplus 60 min < 120 min required
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T02:00:00Z" })
    const leg = makeLeg({ transport_mode: "ferry", duration_minutes: 120, buffer_minutes: 0 })
    const v = checkBorderFerryRisk(from, to, leg, DEFAULT_ROUTE_CONSTRAINT_POLICY)
    expect(v?.code).toBe("border_ferry_risk")
    expect(v?.severity).toBe("warning")
  })

  it("returns warning when stop times are missing (cannot verify)", () => {
    const from = makeStop({ end_utc: null, has_border_crossing: true })
    const to = makeStop({ id: "s2", start_utc: null })
    const leg = makeLeg({ transport_mode: "drive" })
    const v = checkBorderFerryRisk(from, to, leg)
    expect(v?.code).toBe("border_ferry_risk")
  })

  it("returns null for non-ferry / non-border leg with adequate buffer", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z", has_border_crossing: false })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T08:00:00Z", has_border_crossing: false })
    const leg = makeLeg({ transport_mode: "drive" })
    expect(checkBorderFerryRisk(from, to, leg)).toBeNull()
  })

  it("border_crossing flag triggers the check even for non-ferry legs", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z", has_border_crossing: true })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T01:00:00Z" })
    const leg = makeLeg({ transport_mode: "drive", duration_minutes: 90, buffer_minutes: 0 })
    // Gap = 120 min, travel = 90 min, surplus = 30 min < 120 required
    const v = checkBorderFerryRisk(from, to, leg, DEFAULT_ROUTE_CONSTRAINT_POLICY)
    expect(v?.code).toBe("border_ferry_risk")
  })
})

// ---------------------------------------------------------------------------
// 7. missing_location
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkMissingLocation", () => {
  it("returns warning when no venue_id, no venue_label, and no coordinates", () => {
    const stop = makeStop({ venue_id: undefined, venue_label: undefined, has_coordinates: false })
    const v = checkMissingLocation(stop)
    expect(v?.code).toBe("missing_location")
    expect(v?.severity).toBe("warning")
  })

  it("returns null when venue_id is present", () => {
    expect(checkMissingLocation(makeStop({ venue_id: "v1" }))).toBeNull()
  })

  it("returns null when venue_label is present", () => {
    expect(checkMissingLocation(makeStop({ venue_id: undefined, venue_label: "Civic Center" }))).toBeNull()
  })

  it("returns null when coordinates are available", () => {
    expect(checkMissingLocation(makeStop({ venue_id: undefined, venue_label: undefined, has_coordinates: true }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 8. impossible_arrival
// ---------------------------------------------------------------------------

describe("ROUTE-304 checkImpossibleArrival", () => {
  it("returns error when departure is too late to arrive in time", () => {
    // Show starts at 02:00Z. Travel 4h + 30min buffer + 60min arrival = 330 min.
    // Need to depart by 02:00Z − 330 min = 20:30Z previous day.
    // But fromStop ends at 23:00Z → 150 min too late.
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T02:00:00Z" })
    const leg = makeLeg({ duration_minutes: 240, buffer_minutes: 30 })
    const v = checkImpossibleArrival(from, to, leg, DEFAULT_ROUTE_CONSTRAINT_POLICY)
    expect(v?.code).toBe("impossible_arrival")
    expect(v?.severity).toBe("error")
    expect(v?.evidence.lateMins).toBeGreaterThan(0)
  })

  it("returns null when there is enough time", () => {
    // Show starts at 09:00Z. Travel 4h + 30min buffer + 60min arrival = 330 min.
    // fromStop ends at 22:00Z prev day → 11h gap → 660 min ≥ 330 → ok
    const from = makeStop({ end_utc: "2026-07-19T22:00:00Z" })
    const to = makeStop({ id: "s2", start_utc: "2026-07-20T09:00:00Z" })
    const leg = makeLeg({ duration_minutes: 240, buffer_minutes: 30 })
    expect(checkImpossibleArrival(from, to, leg)).toBeNull()
  })

  it("returns null when times are missing", () => {
    expect(checkImpossibleArrival(makeStop({ end_utc: null }), makeStop({ id: "s2" }), makeLeg())).toBeNull()
  })

  it("returns null when duration is unknown", () => {
    const from = makeStop({ end_utc: "2026-07-20T23:00:00Z" })
    const to = makeStop({ id: "s2", start_utc: "2026-07-21T01:00:00Z" })
    expect(checkImpossibleArrival(from, to, makeLeg({ duration_minutes: null }))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// evaluateRouteConstraints — consolidated engine
// ---------------------------------------------------------------------------

describe("ROUTE-304 evaluateRouteConstraints", () => {
  it("returns empty violations for a clean route", () => {
    const stops: ConstraintStop[] = [
      makeStop({ id: "s1", ordinal: 0, start_utc: "2026-07-20T19:00:00Z", end_utc: "2026-07-20T23:00:00Z" }),
      makeStop({ id: "s2", ordinal: 1, name: "Detroit", start_utc: "2026-07-21T19:00:00Z", end_utc: "2026-07-21T23:00:00Z" }),
    ]
    const legs: ConstraintLeg[] = [
      makeLeg({ id: "l1", fromStopId: "s1", toStopId: "s2", duration_minutes: 240, buffer_minutes: 30 }),
    ]
    const result = evaluateRouteConstraints({ stops, legs })
    expect(result.hasErrors).toBe(false)
    expect(result.hasWarnings).toBe(false)
    expect(result.violations).toHaveLength(0)
  })

  it("collects all violation codes across multiple failing checks", () => {
    // Same day overlap + missing location on s3
    const stops: ConstraintStop[] = [
      makeStop({ id: "s1", ordinal: 0, start_utc: "2026-07-20T19:00:00Z", end_utc: "2026-07-20T23:00:00Z" }),
      makeStop({ id: "s2", ordinal: 1, name: "Detroit", start_utc: "2026-07-20T23:30:00Z", end_utc: "2026-07-21T03:00:00Z" }),
      makeStop({ id: "s3", ordinal: 2, name: "Cleveland", stop_type: "show", venue_id: undefined, venue_label: undefined, has_coordinates: false }),
    ]
    const legs: ConstraintLeg[] = [
      makeLeg({ id: "l1", fromStopId: "s1", toStopId: "s2", duration_minutes: 30, buffer_minutes: 0 }),
      makeLeg({ id: "l2", fromStopId: "s2", toStopId: "s3", duration_minutes: 90, buffer_minutes: 0 }),
    ]
    const result = evaluateRouteConstraints({ stops, legs })
    const codes = result.violations.map((v) => v.code)
    expect(codes).toContain("same_day_overlap")
    expect(codes).toContain("missing_location")
    expect(result.hasErrors).toBe(true)
  })

  it("errors and warnings are correctly split", () => {
    // Excessive drive (warning) + impossible arrival (error)
    const stops: ConstraintStop[] = [
      makeStop({ id: "s1", ordinal: 0, end_utc: "2026-07-20T23:00:00Z" }),
      makeStop({ id: "s2", ordinal: 1, name: "LA", start_utc: "2026-07-21T02:00:00Z" }),
    ]
    const legs: ConstraintLeg[] = [
      makeLeg({ id: "l1", fromStopId: "s1", toStopId: "s2", transport_mode: "drive", duration_minutes: 720, buffer_minutes: 30 }),
    ]
    const result = evaluateRouteConstraints({ stops, legs })
    expect(result.errors.some((v) => v.code === "impossible_arrival")).toBe(true)
    expect(result.warnings.some((v) => v.code === "excessive_drive")).toBe(true)
    expect(result.hasErrors).toBe(true)
    expect(result.hasWarnings).toBe(true)
  })

  it("non-show stop types are excluded from same-day check", () => {
    const stops: ConstraintStop[] = [
      makeStop({ id: "s1", ordinal: 0, stop_type: "travel", start_utc: "2026-07-20T10:00:00Z", end_utc: "2026-07-20T12:00:00Z" }),
      makeStop({ id: "s2", ordinal: 1, stop_type: "rest", start_utc: "2026-07-20T14:00:00Z", end_utc: "2026-07-20T20:00:00Z" }),
    ]
    const result = evaluateRouteConstraints({ stops, legs: [] })
    expect(result.violations.filter((v) => v.code === "same_day_overlap")).toHaveLength(0)
  })

  it("policy overrides are respected", () => {
    // With a very low maxDriveMinutes threshold, any leg triggers excessive_drive
    const stops: ConstraintStop[] = [
      makeStop({ id: "s1", ordinal: 0 }),
      makeStop({ id: "s2", ordinal: 1, name: "Detroit" }),
    ]
    const legs: ConstraintLeg[] = [
      makeLeg({ id: "l1", fromStopId: "s1", toStopId: "s2", transport_mode: "drive", duration_minutes: 60 }),
    ]
    const result = evaluateRouteConstraints({ stops, legs, policy: { maxDriveMinutes: 30 } })
    expect(result.warnings.some((v) => v.code === "excessive_drive")).toBe(true)
  })

  it("checkedAt is a valid ISO timestamp", () => {
    const result = evaluateRouteConstraints({ stops: [], legs: [] })
    expect(new Date(result.checkedAt).getTime()).not.toBeNaN()
  })

  it("DEFAULT_ROUTE_CONSTRAINT_POLICY has expected thresholds", () => {
    expect(DEFAULT_ROUTE_CONSTRAINT_POLICY.maxDriveMinutes).toBe(600)
    expect(DEFAULT_ROUTE_CONSTRAINT_POLICY.minRestMinutes).toBe(480)
    expect(DEFAULT_ROUTE_CONSTRAINT_POLICY.minArrivalBufferMinutes).toBe(60)
    expect(DEFAULT_ROUTE_CONSTRAINT_POLICY.borderFerryBufferMinutes).toBe(120)
  })
})
