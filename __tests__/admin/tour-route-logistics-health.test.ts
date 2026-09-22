/**
 * TOUR-302 — Route and logistics health signal integration tests.
 *
 * Acceptance criteria:
 *  - Conflicts, missing segments/rooms/seats/equipment/meals, and
 *    unresolved traveler data roll into summary.
 *  - All signals carry the TOUR-301 contract (source/severity/threshold/
 *    owner/freshness/remediationUrl).
 */

import { describe, it, expect } from "vitest"
import {
  buildRouteHealthSignals,
  buildLogisticsHealthSignals,
  buildRouteLogisticsHealthSignals,
  deriveRouteHealthCounts,
  deriveLogisticsHealthCounts,
  type RouteHealthInput,
  type LogisticsHealthInput,
} from "@/lib/admin/tour-route-logistics-health"
import { buildTourHealthSummary } from "@/lib/admin/tour-health-aggregation"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"
import type { RouteLegLogisticsBundle } from "@/lib/admin/tour-route-logistics-context"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"
const FRESH = "2026-07-20T09:30:00.000Z"
const TOUR_PATH = "/admin/dashboard/tours/t1"

const baseRouteInput = (): RouteHealthInput => ({
  tourId: "t1",
  conflictErrorCount: 0,
  conflictWarningCount: 0,
  unknownLegCount: 0,
  oldestLegCalculatedAt: FRESH,
  evaluatedAt: FRESH,
  adminTourPath: TOUR_PATH,
  maxLegAgeMinutes: 120,
  nowIso: NOW,
})

const baseLogisticsInput = (): LogisticsHealthInput => ({
  tourId: "t1",
  missingSegmentCount: 0,
  missingRoomNightCount: 0,
  missingEquipmentTransportCount: 0,
  unresolvedTravelerCount: 0,
  missingMealCount: 0,
  evaluatedAt: FRESH,
  adminTourPath: TOUR_PATH,
  nowIso: NOW,
})

// ---------------------------------------------------------------------------
// buildRouteHealthSignals
// ---------------------------------------------------------------------------

describe("buildRouteHealthSignals — clean route", () => {
  it("returns 4 signals", () => {
    const signals = buildRouteHealthSignals(baseRouteInput())
    expect(signals).toHaveLength(4)
  })

  it("all signals are ok when route is clean", () => {
    const signals = buildRouteHealthSignals(baseRouteInput())
    for (const sig of signals) {
      expect(sig.severity).toBe("ok")
    }
  })

  it("every signal has required contract fields", () => {
    for (const sig of buildRouteHealthSignals(baseRouteInput())) {
      expect(sig.signal_id).toBeTruthy()
      expect(sig.label).toBeTruthy()
      expect(sig.source).toBe("route")
      expect(sig.owner).toBe("route")
      expect(sig.threshold).toBeDefined()
      expect(sig.evaluated_at).toBeTruthy()
      expect(sig.remediationUrl).toContain(TOUR_PATH)
    }
  })
})

describe("buildRouteHealthSignals — conflict errors", () => {
  it("route.conflict_errors is 'error' when conflictErrorCount > 0", () => {
    const signals = buildRouteHealthSignals({ ...baseRouteInput(), conflictErrorCount: 3 })
    const sig = signals.find((s) => s.signal_id === "route.conflict_errors")!
    expect(sig.severity).toBe("error")
    expect(sig.detail).toContain("3")
  })

  it("route.conflict_warnings is 'warning' when conflictWarningCount > 0", () => {
    const signals = buildRouteHealthSignals({ ...baseRouteInput(), conflictWarningCount: 2 })
    const sig = signals.find((s) => s.signal_id === "route.conflict_warnings")!
    expect(sig.severity).toBe("warning")
  })

  it("route.unknown_legs is 'error' when unknownLegCount > 0", () => {
    const signals = buildRouteHealthSignals({ ...baseRouteInput(), unknownLegCount: 2 })
    const sig = signals.find((s) => s.signal_id === "route.unknown_legs")!
    expect(sig.severity).toBe("error")
  })

  it("route.stale_legs is 'warning' when leg data is old", () => {
    const signals = buildRouteHealthSignals({
      ...baseRouteInput(),
      oldestLegCalculatedAt: "2026-07-20T06:00:00Z", // 4h ago > 2h threshold
    })
    const sig = signals.find((s) => s.signal_id === "route.stale_legs")!
    expect(sig.severity).toBe("warning")
  })

  it("route.stale_legs is 'unknown' when no legs exist", () => {
    const signals = buildRouteHealthSignals({
      ...baseRouteInput(),
      oldestLegCalculatedAt: null,
    })
    const sig = signals.find((s) => s.signal_id === "route.stale_legs")!
    expect(sig.severity).toBe("unknown")
  })
})

// ---------------------------------------------------------------------------
// buildLogisticsHealthSignals
// ---------------------------------------------------------------------------

describe("buildLogisticsHealthSignals — clean logistics", () => {
  it("returns 5 signals", () => {
    const signals = buildLogisticsHealthSignals(baseLogisticsInput())
    expect(signals).toHaveLength(5)
  })

  it("all signals ok when logistics is clean", () => {
    for (const sig of buildLogisticsHealthSignals(baseLogisticsInput())) {
      expect(sig.severity).toBe("ok")
    }
  })

  it("every signal has required contract fields", () => {
    for (const sig of buildLogisticsHealthSignals(baseLogisticsInput())) {
      expect(sig.signal_id).toBeTruthy()
      expect(sig.source).toBe("logistics")
      expect(sig.remediationUrl).toContain(TOUR_PATH)
    }
  })
})

describe("buildLogisticsHealthSignals — missing logistics", () => {
  it("logistics.missing_segments is error when > 0", () => {
    const signals = buildLogisticsHealthSignals({ ...baseLogisticsInput(), missingSegmentCount: 2 })
    const sig = signals.find((s) => s.signal_id === "logistics.missing_segments")!
    expect(sig.severity).toBe("error")
    expect(sig.detail).toContain("2")
  })

  it("logistics.missing_rooms is error when > 0", () => {
    const signals = buildLogisticsHealthSignals({ ...baseLogisticsInput(), missingRoomNightCount: 5 })
    const sig = signals.find((s) => s.signal_id === "logistics.missing_rooms")!
    expect(sig.severity).toBe("error")
  })

  it("logistics.missing_equipment is error when > 0", () => {
    const signals = buildLogisticsHealthSignals({ ...baseLogisticsInput(), missingEquipmentTransportCount: 1 })
    const sig = signals.find((s) => s.signal_id === "logistics.missing_equipment")!
    expect(sig.severity).toBe("error")
  })

  it("logistics.unresolved_travelers is error when > 0", () => {
    const signals = buildLogisticsHealthSignals({ ...baseLogisticsInput(), unresolvedTravelerCount: 3 })
    const sig = signals.find((s) => s.signal_id === "logistics.unresolved_travelers")!
    expect(sig.severity).toBe("error")
  })

  it("logistics.missing_meals is error when > 0", () => {
    const signals = buildLogisticsHealthSignals({ ...baseLogisticsInput(), missingMealCount: 8 })
    const sig = signals.find((s) => s.signal_id === "logistics.missing_meals")!
    expect(sig.severity).toBe("error")
    expect(sig.detail).toContain("8")
  })
})

// ---------------------------------------------------------------------------
// Integration: signals roll into health summary
// ---------------------------------------------------------------------------

describe("route + logistics signals roll into tour health summary", () => {
  it("healthy tour: all signals ok → summary is healthy", () => {
    const signals = buildRouteLogisticsHealthSignals({
      route: baseRouteInput(),
      logistics: baseLogisticsInput(),
    })
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    expect(summary.status).toBe("healthy")
  })

  it("route conflict error → summary is unhealthy", () => {
    const signals = buildRouteLogisticsHealthSignals({
      route: { ...baseRouteInput(), conflictErrorCount: 1 },
      logistics: baseLogisticsInput(),
    })
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    expect(summary.status).toBe("unhealthy")
    expect(summary.errors.length).toBeGreaterThan(0)
  })

  it("missing room nights → summary is unhealthy", () => {
    const signals = buildRouteLogisticsHealthSignals({
      route: baseRouteInput(),
      logistics: { ...baseLogisticsInput(), missingRoomNightCount: 3 },
    })
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    expect(summary.status).toBe("unhealthy")
  })

  it("stale legs → summary is at_risk (warning)", () => {
    const signals = buildRouteLogisticsHealthSignals({
      route: { ...baseRouteInput(), oldestLegCalculatedAt: "2026-07-20T06:00:00Z" },
      logistics: baseLogisticsInput(),
    })
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    expect(["at_risk", "unhealthy", "degraded"]).toContain(summary.status)
  })

  it("unknown legs (no data) → summary is degraded", () => {
    const signals = buildRouteLogisticsHealthSignals({
      route: { ...baseRouteInput(), oldestLegCalculatedAt: null },
      logistics: baseLogisticsInput(),
    })
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    // unknown signals → degraded
    expect(["degraded", "unhealthy"]).toContain(summary.status)
  })

  it("summary has 9 signals total", () => {
    const signals = buildRouteLogisticsHealthSignals({
      route: baseRouteInput(),
      logistics: baseLogisticsInput(),
    })
    expect(signals).toHaveLength(9)
  })
})

// ---------------------------------------------------------------------------
// deriveRouteHealthCounts
// ---------------------------------------------------------------------------

describe("deriveRouteHealthCounts", () => {
  it("counts errors and warnings from violations array", () => {
    const violations: RouteConstraintViolation[] = [
      { code: "excessive_drive", severity: "error", legId: "l1", fromStopId: "s1", toStopId: "s2", message: "", evidence: {}, remediationHint: "" },
      { code: "missing_location", severity: "warning", legId: null, fromStopId: "s3", toStopId: null, message: "", evidence: {}, remediationHint: "" },
    ]
    const { conflictErrorCount, conflictWarningCount } = deriveRouteHealthCounts(violations)
    expect(conflictErrorCount).toBe(1)
    expect(conflictWarningCount).toBe(1)
  })

  it("returns zero counts for empty violations", () => {
    const { conflictErrorCount, conflictWarningCount } = deriveRouteHealthCounts([])
    expect(conflictErrorCount).toBe(0)
    expect(conflictWarningCount).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// deriveLogisticsHealthCounts
// ---------------------------------------------------------------------------

describe("deriveLogisticsHealthCounts", () => {
  const makeLegCtx = () => ({
    tour_id: "t1",
    tour_version_id: "tv1",
    leg_id: "l1",
    from_stop_id: "s1",
    to_stop_id: "s2",
    stop_id: null,
  })

  const makeBundle = (overrides: Partial<RouteLegLogisticsBundle> = {}): RouteLegLogisticsBundle => ({
    context: makeLegCtx(),
    travel_segments: [],
    vehicle_movements: [],
    room_nights: [],
    equipment_moves: [],
    passenger_assignments: [],
    ...overrides,
  })

  it("detects missing segment when passengers exist but no segment", () => {
    const bundle = makeBundle({
      passenger_assignments: [
        { assignment_id: "pa1", context: makeLegCtx(), person_id: "p1", person_name: "P", has_room_night: true },
      ],
    })
    const { missingSegmentCount } = deriveLogisticsHealthCounts([bundle])
    expect(missingSegmentCount).toBe(1)
  })

  it("no missing segment when segment exists", () => {
    const bundle = makeBundle({
      travel_segments: [
        { segment_id: "seg1", context: makeLegCtx(), mode: "drive", passenger_count: 1 },
      ],
      passenger_assignments: [
        { assignment_id: "pa1", context: makeLegCtx(), person_id: "p1", person_name: "P", has_room_night: true },
      ],
    })
    const { missingSegmentCount } = deriveLogisticsHealthCounts([bundle])
    expect(missingSegmentCount).toBe(0)
  })

  it("counts missing room nights", () => {
    const bundle = makeBundle({
      passenger_assignments: [
        { assignment_id: "pa1", context: makeLegCtx(), person_id: "p1", person_name: "P", has_room_night: false },
        { assignment_id: "pa2", context: makeLegCtx(), person_id: "p2", person_name: "Q", has_room_night: true },
      ],
    })
    const { missingRoomNightCount } = deriveLogisticsHealthCounts([bundle])
    expect(missingRoomNightCount).toBe(1)
  })

  it("counts equipment moves with no transport", () => {
    const bundle = makeBundle({
      equipment_moves: [
        {
          move_id: "em1",
          context: makeLegCtx(),
          equipment_item_id: "eq1",
          item_label: "Guitar",
          mode: "own_vehicle",
          vehicle_movement_id: null,
          travel_segment_id: null,
        },
      ],
    })
    const { missingEquipmentTransportCount } = deriveLogisticsHealthCounts([bundle])
    expect(missingEquipmentTransportCount).toBe(1)
  })

  it("returns zero counts for empty bundles", () => {
    const counts = deriveLogisticsHealthCounts([makeBundle()])
    expect(counts.missingSegmentCount).toBe(0)
    expect(counts.missingRoomNightCount).toBe(0)
    expect(counts.missingEquipmentTransportCount).toBe(0)
    expect(counts.unresolvedTravelerCount).toBe(0)
  })
})
