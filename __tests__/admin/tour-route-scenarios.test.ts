/**
 * ROUTE-307 — Tour route scenario workspace tests.
 */

import { describe, it, expect } from "vitest"
import {
  branchScenario,
  compareScenarios,
  computeScenarioMetrics,
  adoptScenario,
  shareScenario,
  revokeScenarioShare,
  archiveScenario,
  renameScenario,
  activeScenarios,
  findScenario,
  validateScenarioAdoptable,
  type RouteScenario,
  type ScenarioStop,
} from "@/lib/admin/tour-route-scenarios"
import type { TourRouteLeg } from "@/lib/admin/tour-route-legs"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"
const ACTOR = "user-abc"

const makeStop = (id: string, ordinal: number, overrides: Partial<ScenarioStop> = {}): ScenarioStop => ({
  id,
  ordinal,
  name: `Stop ${id}`,
  stop_type: "show",
  local_date: `2026-08-${String(ordinal).padStart(2, "0")}`,
  venue_label: `Venue ${id}`,
  start_utc: `2026-08-${String(ordinal).padStart(2, "0")}T20:00:00Z`,
  end_utc: `2026-08-${String(ordinal).padStart(2, "0")}T23:00:00Z`,
  ianaZone: "America/New_York",
  ...overrides,
})

const makeLeg = (fromId: string, toId: string, distKm: number, durMins: number): TourRouteLeg => ({
  id: `leg-${fromId}-${toId}`,
  tour_version_id: "tv1",
  tour_id: "tour1",
  org_id: "org1",
  from_stop_id: fromId,
  to_stop_id: toId,
  from_ordinal: 1,
  to_ordinal: 2,
  transport_mode: "drive",
  distance_km: distKm,
  duration_minutes: durMins,
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
  fromId = "s1",
  toId = "s2",
): RouteConstraintViolation => ({
  code,
  severity,
  legId: `leg-${fromId}-${toId}`,
  fromStopId: fromId,
  toStopId: toId,
  message: `Violation: ${code}`,
  evidence: {},
  remediationHint: "Fix it.",
})

function makeScenario(overrides: Partial<RouteScenario> = {}): RouteScenario {
  return {
    scenario_id: "active",
    name: "Active Draft",
    description: null,
    status: "active",
    base_tour_version_id: "tv1",
    created_by: ACTOR,
    created_at: NOW,
    updated_by: ACTOR,
    updated_at: NOW,
    stops: [makeStop("s1", 1), makeStop("s2", 2), makeStop("s3", 3)],
    legs: [makeLeg("s1", "s2", 500, 300), makeLeg("s2", "s3", 300, 180)],
    violations: [],
    suggestions: [],
    shares: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// branchScenario
// ---------------------------------------------------------------------------

describe("branchScenario", () => {
  it("creates a new draft scenario with the same stops/legs", () => {
    const base = makeScenario()
    const branch = branchScenario({ base, newName: "Alt Route", actorUserId: ACTOR, nowIso: NOW })
    expect(branch.status).toBe("draft")
    expect(branch.name).toBe("Alt Route")
    expect(branch.stops).toHaveLength(3)
    expect(branch.legs).toHaveLength(2)
    expect(branch.scenario_id).not.toBe(base.scenario_id)
    expect(branch.base_tour_version_id).toBe(base.base_tour_version_id)
  })

  it("deep-copies stops so mutations on branch don't affect base", () => {
    const base = makeScenario()
    const branch = branchScenario({ base, newName: "Mod", actorUserId: ACTOR, nowIso: NOW })
    branch.stops[0].name = "Changed"
    expect(base.stops[0].name).toBe("Stop s1")
  })

  it("deep-copies legs so mutations on branch don't affect base", () => {
    const base = makeScenario({
      legs: [makeLeg("s1", "s2", 500, 300)],
    })
    const branch = branchScenario({ base, newName: "Mod", actorUserId: ACTOR, nowIso: NOW })
    ;(branch.legs[0] as TourRouteLeg).distance_km = 999
    expect(base.legs[0].distance_km).toBe(500)
  })

  it("uses default name when newName is empty", () => {
    const base = makeScenario({ name: "My Tour" })
    const branch = branchScenario({ base, newName: "", actorUserId: ACTOR, nowIso: NOW })
    expect(branch.name).toBe("Branch of My Tour")
  })

  it("carries description", () => {
    const base = makeScenario()
    const branch = branchScenario({
      base,
      newName: "With Desc",
      description: "Test desc",
      actorUserId: ACTOR,
      nowIso: NOW,
    })
    expect(branch.description).toBe("Test desc")
  })

  it("starts with empty shares", () => {
    const base = makeScenario()
    const branch = branchScenario({ base, newName: "X", actorUserId: ACTOR, nowIso: NOW })
    expect(branch.shares).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// computeScenarioMetrics
// ---------------------------------------------------------------------------

describe("computeScenarioMetrics", () => {
  it("computes total_distance_km summing legs", () => {
    const s = makeScenario()
    const metrics = computeScenarioMetrics(s)
    const dist = metrics.find((m) => m.metric === "total_distance_km")!
    expect(dist.value).toBe(800)
    expect(dist.formatted).toContain("800")
  })

  it("computes total_drive_minutes for drive legs", () => {
    const s = makeScenario()
    const metrics = computeScenarioMetrics(s)
    const drive = metrics.find((m) => m.metric === "total_drive_minutes")!
    expect(drive.value).toBe(480)
    expect(drive.formatted).toBe("8h")
  })

  it("counts total_legs and total_stops", () => {
    const s = makeScenario()
    const metrics = computeScenarioMetrics(s)
    expect(metrics.find((m) => m.metric === "total_legs")!.value).toBe(2)
    expect(metrics.find((m) => m.metric === "total_stops")!.value).toBe(3)
  })

  it("counts errors and warnings", () => {
    const s = makeScenario({
      violations: [
        makeViolation("excessive_drive", "error"),
        makeViolation("missing_location", "warning", "s2", "s3"),
      ],
    })
    const metrics = computeScenarioMetrics(s)
    expect(metrics.find((m) => m.metric === "error_count")!.value).toBe(1)
    expect(metrics.find((m) => m.metric === "warning_count")!.value).toBe(1)
  })

  it("counts show_days, travel_days, rest_days", () => {
    const s = makeScenario({
      stops: [
        makeStop("s1", 1, { stop_type: "show" }),
        makeStop("s2", 2, { stop_type: "travel" }),
        makeStop("s3", 3, { stop_type: "rest" }),
        makeStop("s4", 4, { stop_type: "festival" }),
      ],
    })
    const metrics = computeScenarioMetrics(s)
    expect(metrics.find((m) => m.metric === "show_days")!.value).toBe(2) // show + festival
    expect(metrics.find((m) => m.metric === "travel_days")!.value).toBe(1)
    expect(metrics.find((m) => m.metric === "rest_days")!.value).toBe(1)
  })

  it("computes date_range_days from first to last dated stop", () => {
    const s = makeScenario({
      stops: [
        makeStop("s1", 1, { local_date: "2026-08-01" }),
        makeStop("s2", 2, { local_date: "2026-08-11" }),
      ],
    })
    const metrics = computeScenarioMetrics(s)
    expect(metrics.find((m) => m.metric === "date_range_days")!.value).toBe(10)
  })

  it("respects override distance on legs", () => {
    const leg = makeLeg("s1", "s2", 500, 300)
    leg.override = { distance_km: 600, duration_minutes: 360 }
    const s = makeScenario({ legs: [leg], stops: [makeStop("s1", 1), makeStop("s2", 2)] })
    const metrics = computeScenarioMetrics(s)
    expect(metrics.find((m) => m.metric === "total_distance_km")!.value).toBe(600)
  })
})

// ---------------------------------------------------------------------------
// compareScenarios
// ---------------------------------------------------------------------------

describe("compareScenarios", () => {
  it("reports neutral when scenarios are identical", () => {
    const base = makeScenario()
    const comp = compareScenarios({ base, comparand: { ...base, scenario_id: "branch-1" } })
    expect(comp.verdict).toBe("neutral")
    expect(comp.violations.resolved).toHaveLength(0)
    expect(comp.violations.introduced).toHaveLength(0)
  })

  it("reports comparand_better when comparand has fewer errors", () => {
    const base = makeScenario({
      violations: [makeViolation("excessive_drive", "error")],
    })
    const comparand = makeScenario({ scenario_id: "branch-1", violations: [] })
    const comp = compareScenarios({ base, comparand })
    expect(comp.verdict).toBe("comparand_better")
    expect(comp.violations.resolved).toHaveLength(1)
  })

  it("reports comparand_worse when comparand introduces new errors", () => {
    const base = makeScenario({ violations: [] })
    const comparand = makeScenario({
      scenario_id: "branch-1",
      violations: [makeViolation("excessive_drive", "error")],
    })
    const comp = compareScenarios({ base, comparand })
    expect(comp.verdict).toBe("comparand_worse")
    expect(comp.violations.introduced).toHaveLength(1)
  })

  it("computes metric deltas correctly", () => {
    const base = makeScenario()
    const comparand = makeScenario({
      scenario_id: "branch-2",
      legs: [makeLeg("s1", "s2", 400, 200)],
    })
    const comp = compareScenarios({ base, comparand })
    const distDiff = comp.metrics.find((m) => m.metric === "total_distance_km")!
    // base: 800km, comparand: 400km → delta = -400
    expect(distDiff.delta).toBe(-400)
    expect(distDiff.direction).toBe("better")
  })

  it("includes shared violations in shared array", () => {
    const v = makeViolation("missing_location", "warning")
    const base = makeScenario({ violations: [v] })
    const comparand = makeScenario({ scenario_id: "branch-3", violations: [{ ...v }] })
    const comp = compareScenarios({ base, comparand })
    expect(comp.violations.shared).toHaveLength(1)
    expect(comp.violations.resolved).toHaveLength(0)
    expect(comp.violations.introduced).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// adoptScenario — preview mode
// ---------------------------------------------------------------------------

describe("adoptScenario — preview", () => {
  it("returns impact without updating active scenario", () => {
    const active = makeScenario()
    const branch = branchScenario({ base: active, newName: "Branch", actorUserId: ACTOR, nowIso: NOW })
    // Modify branch
    branch.stops[0] = { ...branch.stops[0], name: "Renamed" }

    const result = adoptScenario({
      active,
      branch,
      actorUserId: ACTOR,
      commitAdopt: false,
      nowIso: NOW,
    })
    expect(result.updatedActiveScenario).toBeNull()
    expect(result.adoptedScenario.scenario_id).toBe(branch.scenario_id)
  })

  it("identifies modified stops", () => {
    const active = makeScenario()
    const branch = branchScenario({ base: active, newName: "B", actorUserId: ACTOR, nowIso: NOW })
    branch.stops[0] = { ...branch.stops[0], name: "New Name", ordinal: 5 }

    const result = adoptScenario({ active, branch, actorUserId: ACTOR, commitAdopt: false })
    expect(result.impact.stopsModified.some((m) => m.changedFields.includes("name"))).toBe(true)
  })

  it("identifies added and removed stops", () => {
    const active = makeScenario()
    const branch = branchScenario({ base: active, newName: "B", actorUserId: ACTOR, nowIso: NOW })
    // Remove s3 (last stop), then add a new stop
    branch.stops = branch.stops.slice(0, -1) // remove s3 → [s1, s2]
    branch.stops.push(makeStop("s_new", 4))   // add s_new → [s1, s2, s_new]

    const result = adoptScenario({ active, branch, actorUserId: ACTOR, commitAdopt: false })
    expect(result.impact.stopsAdded.map((s) => s.id)).toContain("s_new")
    expect(result.impact.stopsRemoved.map((s) => s.id)).toContain("s3")
  })

  it("computes violationDelta", () => {
    const active = makeScenario({
      violations: [makeViolation("excessive_drive", "error")],
    })
    const branch = makeScenario({
      scenario_id: "branch-x",
      status: "draft",
      violations: [],
    })
    const result = adoptScenario({ active, branch, actorUserId: ACTOR, commitAdopt: false })
    expect(result.impact.violationDelta).toBe(-1)
    expect(result.impact.resolvesErrors).toBe(true)
    expect(result.impact.introducesErrors).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// adoptScenario — commit mode
// ---------------------------------------------------------------------------

describe("adoptScenario — commit", () => {
  it("replaces active stops/legs with branch data", () => {
    const active = makeScenario()
    const branch = branchScenario({ base: active, newName: "B", actorUserId: ACTOR, nowIso: NOW })
    branch.stops[0] = { ...branch.stops[0], name: "Replaced" }

    const result = adoptScenario({ active, branch, actorUserId: ACTOR, commitAdopt: true, nowIso: NOW })
    expect(result.updatedActiveScenario).not.toBeNull()
    expect(result.updatedActiveScenario!.stops[0].name).toBe("Replaced")
  })

  it("marks adopted branch as 'adopted'", () => {
    const active = makeScenario()
    const branch = branchScenario({ base: active, newName: "B", actorUserId: ACTOR, nowIso: NOW })
    const result = adoptScenario({ active, branch, actorUserId: ACTOR, commitAdopt: true, nowIso: NOW })
    expect(result.adoptedScenario.status).toBe("adopted")
  })

  it("does not mutate original active or branch objects", () => {
    const active = makeScenario()
    const branch = branchScenario({ base: active, newName: "B", actorUserId: ACTOR, nowIso: NOW })
    adoptScenario({ active, branch, actorUserId: ACTOR, commitAdopt: true, nowIso: NOW })
    expect(active.status).toBe("active")
    expect(branch.status).toBe("draft")
  })
})

// ---------------------------------------------------------------------------
// shareScenario
// ---------------------------------------------------------------------------

describe("shareScenario", () => {
  it("generates a token and appends share to scenario", () => {
    const s = makeScenario()
    const { token, updatedScenario } = shareScenario({
      scenario: s,
      sharedWith: "user-bob",
      actorUserId: ACTOR,
      nowIso: NOW,
    })
    expect(token).toMatch(/^share_/)
    expect(updatedScenario.shares).toHaveLength(1)
    expect(updatedScenario.shares[0].shared_with).toBe("user-bob")
    expect(updatedScenario.shares[0].revoked).toBe(false)
  })

  it("does not mutate the original scenario", () => {
    const s = makeScenario()
    shareScenario({ scenario: s, sharedWith: "x", actorUserId: ACTOR, nowIso: NOW })
    expect(s.shares).toHaveLength(0)
  })

  it("supports expiry date", () => {
    const s = makeScenario()
    const { updatedScenario } = shareScenario({
      scenario: s,
      sharedWith: "y",
      expiresAt: "2026-09-01T00:00:00Z",
      actorUserId: ACTOR,
      nowIso: NOW,
    })
    expect(updatedScenario.shares[0].expires_at).toBe("2026-09-01T00:00:00Z")
  })

  it("accumulates multiple shares", () => {
    const s = makeScenario()
    const { updatedScenario: s2 } = shareScenario({ scenario: s, sharedWith: "a", actorUserId: ACTOR, nowIso: NOW })
    const { updatedScenario: s3 } = shareScenario({
      scenario: s2,
      sharedWith: "b",
      actorUserId: ACTOR,
      nowIso: "2026-07-20T11:00:00Z",
    })
    expect(s3.shares).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// revokeScenarioShare
// ---------------------------------------------------------------------------

describe("revokeScenarioShare", () => {
  it("marks a token as revoked", () => {
    const s = makeScenario()
    const { token, updatedScenario: shared } = shareScenario({
      scenario: s,
      sharedWith: "c",
      actorUserId: ACTOR,
      nowIso: NOW,
    })
    const revoked = revokeScenarioShare({ scenario: shared, token, actorUserId: ACTOR, nowIso: NOW })
    expect(revoked.shares[0].revoked).toBe(true)
  })

  it("no-ops when token is not found", () => {
    const s = makeScenario()
    const revoked = revokeScenarioShare({
      scenario: s,
      token: "nonexistent",
      actorUserId: ACTOR,
      nowIso: NOW,
    })
    expect(revoked.shares).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// archiveScenario
// ---------------------------------------------------------------------------

describe("archiveScenario", () => {
  it("archives a draft scenario", () => {
    const branch = makeScenario({ scenario_id: "b1", status: "draft" })
    const archived = archiveScenario({ scenario: branch, actorUserId: ACTOR, nowIso: NOW })
    expect(archived.status).toBe("archived")
  })

  it("throws when trying to archive the active draft", () => {
    const active = makeScenario()
    expect(() => archiveScenario({ scenario: active, actorUserId: ACTOR })).toThrow()
  })

  it("archives an adopted scenario", () => {
    const adopted = makeScenario({ scenario_id: "b2", status: "adopted" })
    const archived = archiveScenario({ scenario: adopted, actorUserId: ACTOR, nowIso: NOW })
    expect(archived.status).toBe("archived")
  })
})

// ---------------------------------------------------------------------------
// renameScenario
// ---------------------------------------------------------------------------

describe("renameScenario", () => {
  it("updates name", () => {
    const s = makeScenario({ scenario_id: "b1", status: "draft" })
    const renamed = renameScenario({ scenario: s, newName: "My New Name", actorUserId: ACTOR, nowIso: NOW })
    expect(renamed.name).toBe("My New Name")
  })

  it("throws on empty name", () => {
    const s = makeScenario({ scenario_id: "b1", status: "draft" })
    expect(() => renameScenario({ scenario: s, newName: "   ", actorUserId: ACTOR })).toThrow()
  })

  it("updates description when provided", () => {
    const s = makeScenario({ scenario_id: "b1", status: "draft" })
    const renamed = renameScenario({
      scenario: s,
      newName: "X",
      newDescription: "New desc",
      actorUserId: ACTOR,
      nowIso: NOW,
    })
    expect(renamed.description).toBe("New desc")
  })

  it("preserves existing description when newDescription is undefined", () => {
    const s = makeScenario({ scenario_id: "b1", status: "draft", description: "keep me" })
    const renamed = renameScenario({ scenario: s, newName: "Y", actorUserId: ACTOR, nowIso: NOW })
    expect(renamed.description).toBe("keep me")
  })
})

// ---------------------------------------------------------------------------
// activeScenarios / findScenario
// ---------------------------------------------------------------------------

describe("activeScenarios", () => {
  it("filters out archived scenarios", () => {
    const a = makeScenario()
    const b = makeScenario({ scenario_id: "b1", status: "draft" })
    const c = makeScenario({ scenario_id: "b2", status: "archived" })
    expect(activeScenarios([a, b, c])).toHaveLength(2)
  })
})

describe("findScenario", () => {
  it("returns a matching scenario", () => {
    const a = makeScenario()
    const b = makeScenario({ scenario_id: "b1", status: "draft" })
    expect(findScenario([a, b], "b1")?.scenario_id).toBe("b1")
  })

  it("returns null when not found", () => {
    const a = makeScenario()
    expect(findScenario([a], "missing")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// validateScenarioAdoptable
// ---------------------------------------------------------------------------

describe("validateScenarioAdoptable", () => {
  it("allows a draft scenario with stops", () => {
    const b = makeScenario({ scenario_id: "b1", status: "draft" })
    expect(validateScenarioAdoptable(b)).toEqual({ valid: true, reason: null })
  })

  it("blocks adopted scenarios", () => {
    const b = makeScenario({ scenario_id: "b1", status: "adopted" })
    const r = validateScenarioAdoptable(b)
    expect(r.valid).toBe(false)
    expect(r.reason).toContain("already been adopted")
  })

  it("blocks archived scenarios", () => {
    const b = makeScenario({ scenario_id: "b1", status: "archived" })
    const r = validateScenarioAdoptable(b)
    expect(r.valid).toBe(false)
    expect(r.reason).toContain("Archived")
  })

  it("blocks active scenario as branch target", () => {
    const a = makeScenario()
    const r = validateScenarioAdoptable(a)
    expect(r.valid).toBe(false)
    expect(r.reason).toContain("active scenario")
  })

  it("blocks draft scenario with no stops", () => {
    const b = makeScenario({ scenario_id: "b1", status: "draft", stops: [] })
    const r = validateScenarioAdoptable(b)
    expect(r.valid).toBe(false)
    expect(r.reason).toContain("no stops")
  })
})
