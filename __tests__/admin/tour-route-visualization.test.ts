/**
 * ROUTE-308 — Route visualization data model tests.
 *
 * Acceptance criteria:
 *  - Map/timeline clearly distinguish confirmed, held, tentative, travel,
 *    and conflict states.
 *  - Accessible list provides equivalent information.
 */

import { describe, it, expect } from "vitest"
import {
  buildRouteVisualization,
  getRouteLegend,
  type VisualizationStop,
  type RouteStopDisplayState,
} from "@/lib/admin/tour-route-visualization"
import type { TourRouteLeg } from "@/lib/admin/tour-route-legs"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"

const makeStop = (
  id: string,
  ordinal: number,
  overrides: Partial<VisualizationStop> = {},
): VisualizationStop => ({
  id,
  ordinal,
  name: `Stop ${id}`,
  stop_type: "show",
  local_date: `2026-08-${String(ordinal).padStart(2, "0")}`,
  start_utc: `2026-08-${String(ordinal).padStart(2, "0")}T20:00:00Z`,
  end_utc: `2026-08-${String(ordinal).padStart(2, "0")}T23:00:00Z`,
  ianaZone: "America/New_York",
  venue_label: `Venue ${id}`,
  coordinates: { lat: 41.88, lng: -87.63 },
  is_confirmed: false,
  has_active_hold: false,
  ...overrides,
})

const makeLeg = (fromId: string, toId: string, fromOrd: number, toOrd: number): TourRouteLeg => ({
  id: `leg-${fromId}-${toId}`,
  tour_version_id: "tv1",
  tour_id: "tour1",
  org_id: "org1",
  from_stop_id: fromId,
  to_stop_id: toId,
  from_ordinal: fromOrd,
  to_ordinal: toOrd,
  transport_mode: "drive",
  distance_km: 400,
  duration_minutes: 240,
  buffer_minutes: 30,
  provider: "manual",
  provider_version: null,
  calculated_at: NOW,
  override: null,
  transport_booking_id: null,
  has_conflict: false,
  conflict_codes: [],
  source: "auto",
})

const makeViolation = (
  code: RouteConstraintViolation["code"],
  severity: RouteConstraintViolation["severity"],
  fromStopId: string,
  toStopId: string,
  legId?: string,
): RouteConstraintViolation => ({
  code,
  severity,
  legId: legId ?? `leg-${fromStopId}-${toStopId}`,
  fromStopId,
  toStopId,
  message: `${code} violation`,
  evidence: {},
  remediationHint: "Fix it.",
})

// ---------------------------------------------------------------------------
// Stop display state classification
// ---------------------------------------------------------------------------

describe("buildRouteVisualization — stop display states", () => {
  it("classifies a confirmed stop as 'confirmed'", () => {
    const stops = [makeStop("s1", 1, { is_confirmed: true })]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("confirmed")
  })

  it("classifies a stop with active hold as 'held'", () => {
    const stops = [makeStop("s1", 1, { has_active_hold: true })]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("held")
  })

  it("classifies a plain planned stop as 'tentative'", () => {
    const stops = [makeStop("s1", 1)]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("tentative")
  })

  it("classifies a travel-type stop as 'travel'", () => {
    const stops = [makeStop("s1", 1, { stop_type: "travel" })]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("travel")
  })

  it("classifies rest-type stop as 'travel'", () => {
    const stops = [makeStop("s1", 1, { stop_type: "rest" })]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("travel")
  })

  it("confirmed takes priority over held", () => {
    const stops = [makeStop("s1", 1, { is_confirmed: true, has_active_hold: true })]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("confirmed")
  })

  it("travel type overrides confirmed/held flags", () => {
    // Travel days are always travel regardless of hold/confirm flags
    const stops = [makeStop("s1", 1, { stop_type: "rest", is_confirmed: true })]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops[0].displayState).toBe("travel")
  })
})

// ---------------------------------------------------------------------------
// Stop conflict overlay
// ---------------------------------------------------------------------------

describe("buildRouteVisualization — stop conflict overlay", () => {
  it("marks hasConflict=true when stop is in a violation", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const violations = [makeViolation("insufficient_travel", "error", "s1", "s2")]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs, violations })
    expect(mapStops.find((s) => s.stopId === "s1")!.hasConflict).toBe(true)
    expect(mapStops.find((s) => s.stopId === "s2")!.hasConflict).toBe(true)
  })

  it("a confirmed stop can still carry hasConflict=true", () => {
    const stops = [makeStop("s1", 1, { is_confirmed: true }), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const violations = [makeViolation("impossible_arrival", "error", "s1", "s2")]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs, violations })
    const s1 = mapStops.find((s) => s.stopId === "s1")!
    expect(s1.displayState).toBe("confirmed")
    expect(s1.hasConflict).toBe(true)
  })

  it("records violation codes on the stop", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const violations = [
      makeViolation("insufficient_travel", "error", "s1", "s2"),
      makeViolation("impossible_arrival", "error", "s1", "s2"),
    ]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs, violations })
    const s1 = mapStops.find((s) => s.stopId === "s1")!
    expect(s1.violationCodes).toContain("insufficient_travel")
    expect(s1.violationCodes).toContain("impossible_arrival")
  })

  it("deduplicates violation codes", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const violations = [
      makeViolation("missing_location", "warning", "s1", "s2"),
      makeViolation("missing_location", "warning", "s1", "s2"),
    ]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations })
    expect(mapStops.find((s) => s.stopId === "s1")!.violationCodes.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Leg display states
// ---------------------------------------------------------------------------

describe("buildRouteVisualization — leg display states", () => {
  it("classifies a normal leg as 'ok'", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const { legs: mapLegs } = buildRouteVisualization({ stops, legs, violations: [] })
    expect(mapLegs[0].displayState).toBe("ok")
  })

  it("classifies a leg with violations as 'conflict'", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const violations = [makeViolation("excessive_drive", "error", "s1", "s2")]
    const { legs: mapLegs } = buildRouteVisualization({ stops, legs, violations })
    expect(mapLegs[0].displayState).toBe("conflict")
  })

  it("classifies a leg with no distance/duration as 'unknown'", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const nullLeg: TourRouteLeg = { ...makeLeg("s1", "s2", 1, 2), distance_km: null, duration_minutes: null }
    const { legs: mapLegs } = buildRouteVisualization({ stops, legs: [nullLeg], violations: [] })
    expect(mapLegs[0].displayState).toBe("unknown")
  })

  it("uses override distance/duration in the map leg output", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const overrideLeg: TourRouteLeg = {
      ...makeLeg("s1", "s2", 1, 2),
      override: { distance_km: 999, duration_minutes: 600 },
    }
    const { legs: mapLegs } = buildRouteVisualization({ stops, legs: [overrideLeg], violations: [] })
    expect(mapLegs[0].distance_km).toBe(999)
    expect(mapLegs[0].duration_minutes).toBe(600)
  })
})

// ---------------------------------------------------------------------------
// Accessible list
// ---------------------------------------------------------------------------

describe("buildRouteVisualization — accessible list", () => {
  it("interleaves stops and legs in ordinal order", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2), makeStop("s3", 3)]
    const legs = [makeLeg("s1", "s2", 1, 2), makeLeg("s2", "s3", 2, 3)]
    const { accessibleList } = buildRouteVisualization({ stops, legs, violations: [] })
    // Expect: stop, leg, stop, leg, stop = 5 entries
    expect(accessibleList).toHaveLength(5)
    expect(accessibleList[0].kind).toBe("stop")
    expect(accessibleList[1].kind).toBe("leg")
    expect(accessibleList[2].kind).toBe("stop")
    expect(accessibleList[3].kind).toBe("leg")
    expect(accessibleList[4].kind).toBe("stop")
  })

  it("every entry has kind, key, label, stateDescription, ariaRole", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const { accessibleList } = buildRouteVisualization({ stops, legs, violations: [] })
    for (const entry of accessibleList) {
      expect(entry.kind).toBeDefined()
      expect(entry.key).toBeDefined()
      expect(entry.label).toBeTruthy()
      expect(entry.stateDescription).toBeTruthy()
      expect(entry.ariaRole).toBe("listitem")
    }
  })

  it("stop entry label matches stop name", () => {
    const stops = [makeStop("s1", 1)]
    const { accessibleList } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(accessibleList[0].label).toBe("Stop s1")
  })

  it("leg entry label is 'fromName → toName'", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const { accessibleList } = buildRouteVisualization({ stops, legs, violations: [] })
    expect(accessibleList[1].label).toBe("Stop s1 → Stop s2")
  })

  it("conflict entries have hasConflict=true", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const violations = [makeViolation("excessive_drive", "error", "s1", "s2")]
    const { accessibleList } = buildRouteVisualization({ stops, legs, violations })
    const legEntry = accessibleList.find((e) => e.kind === "leg")!
    expect(legEntry.hasConflict).toBe(true)
  })

  it("non-conflict entries have hasConflict=false", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const { accessibleList } = buildRouteVisualization({ stops, legs, violations: [] })
    for (const entry of accessibleList) {
      expect(entry.hasConflict).toBe(false)
    }
  })

  it("stop entries have date and venue_label in detail", () => {
    const stops = [makeStop("s1", 1, { local_date: "2026-08-01", venue_label: "Aragon Ballroom" })]
    const { accessibleList } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(accessibleList[0].detail).toContain("2026-08-01")
    expect(accessibleList[0].detail).toContain("Aragon Ballroom")
  })

  it("leg entries include distance and duration in detail", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const { accessibleList } = buildRouteVisualization({ stops, legs, violations: [] })
    const legEntry = accessibleList.find((e) => e.kind === "leg")!
    expect(legEntry.detail).toContain("400")
    expect(legEntry.detail).toContain("4h")
  })
})

// ---------------------------------------------------------------------------
// Summary counts
// ---------------------------------------------------------------------------

describe("buildRouteVisualization — summary", () => {
  it("counts all five display state categories", () => {
    const stops = [
      makeStop("s1", 1, { is_confirmed: true }),
      makeStop("s2", 2, { has_active_hold: true }),
      makeStop("s3", 3),
      makeStop("s4", 4, { stop_type: "travel" }),
    ]
    const { summary } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(summary.confirmed).toBe(1)
    expect(summary.held).toBe(1)
    expect(summary.tentative).toBe(1)
    expect(summary.travel).toBe(1)
  })

  it("counts conflicted stops", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const legs = [makeLeg("s1", "s2", 1, 2)]
    const violations = [makeViolation("insufficient_travel", "error", "s1", "s2")]
    const { summary } = buildRouteVisualization({ stops, legs, violations })
    // Both s1 and s2 referenced in violation
    expect(summary.conflicted).toBe(2)
  })

  it("counts unknown legs", () => {
    const stops = [makeStop("s1", 1), makeStop("s2", 2)]
    const nullLeg: TourRouteLeg = { ...makeLeg("s1", "s2", 1, 2), distance_km: null, duration_minutes: null }
    const { summary } = buildRouteVisualization({ stops, legs: [nullLeg], violations: [] })
    expect(summary.unknownLegs).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Ordering and edge cases
// ---------------------------------------------------------------------------

describe("buildRouteVisualization — ordering and edge cases", () => {
  it("sorts stops by ordinal regardless of input order", () => {
    const stops = [makeStop("s3", 3), makeStop("s1", 1), makeStop("s2", 2)]
    const { stops: mapStops } = buildRouteVisualization({ stops, legs: [], violations: [] })
    expect(mapStops.map((s) => s.ordinal)).toEqual([1, 2, 3])
  })

  it("handles a single stop with no legs", () => {
    const stops = [makeStop("s1", 1)]
    const { stops: mapStops, legs: mapLegs, accessibleList } = buildRouteVisualization({
      stops,
      legs: [],
      violations: [],
    })
    expect(mapStops).toHaveLength(1)
    expect(mapLegs).toHaveLength(0)
    expect(accessibleList).toHaveLength(1)
  })

  it("handles empty route gracefully", () => {
    const viz = buildRouteVisualization({ stops: [], legs: [], violations: [] })
    expect(viz.stops).toHaveLength(0)
    expect(viz.legs).toHaveLength(0)
    expect(viz.accessibleList).toHaveLength(0)
    expect(viz.summary).toMatchObject({
      confirmed: 0, held: 0, tentative: 0, travel: 0, conflicted: 0, unknownLegs: 0,
    })
  })
})

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

describe("getRouteLegend", () => {
  it("returns entries for all five stop states and leg states", () => {
    const legend = getRouteLegend()
    const states = legend.map((l) => l.state)
    expect(states).toContain("confirmed")
    expect(states).toContain("held")
    expect(states).toContain("tentative")
    expect(states).toContain("travel")
    expect(states).toContain("conflict")
    expect(states).toContain("ok")
    expect(states).toContain("unknown")
  })

  it("every legend item has a label and description", () => {
    for (const item of getRouteLegend()) {
      expect(item.label).toBeTruthy()
      expect(item.description).toBeTruthy()
    }
  })
})
