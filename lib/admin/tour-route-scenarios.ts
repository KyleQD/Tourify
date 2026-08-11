/**
 * ROUTE-307 — Route scenario workspace (pure).
 *
 * Supports branching draft route scenarios, comparing them across multiple
 * dimensions, naming/sharing with internal collaborators, and adopting a
 * selected scenario into the active draft with an impact preview.
 *
 * Contract:
 *  - A scenario is a named snapshot of (stops + legs + violations) derived
 *    from a base tour_version_id. The active draft is scenario id="active".
 *  - Branch creates a deep-copy of the active scenario under a new scenario_id.
 *  - Compare returns a ScenarioComparison for each metric dimension.
 *  - Adopt replaces the active scenario's stops/legs with those from the
 *    chosen branch and generates an impact preview before committing.
 *  - Share generates an internal token (opaque string) for a named collaborator.
 *  - Archive marks a scenario inactive (no deletion — retains history).
 *
 * Pure: no I/O, no `server-only`. All inputs are plain value objects.
 */

import type { TourRouteLeg } from "@/lib/admin/tour-route-legs"
import type { RouteConstraintViolation } from "@/lib/admin/tour-route-constraints"
import type { TravelRestDaySuggestion } from "@/lib/admin/tour-travel-rest-days"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScenarioStatus = "active" | "draft" | "adopted" | "archived"

export interface ScenarioStop {
  id: string
  ordinal: number
  name: string
  stop_type?: string | null
  local_date?: string | null
  venue_label?: string | null
  start_utc?: string | null
  end_utc?: string | null
  ianaZone?: string | null
}

export interface RouteScenario {
  /** Stable scenario id. Use "active" for the live draft. */
  scenario_id: string
  /** Human-readable label. */
  name: string
  description?: string | null
  status: ScenarioStatus
  /** Tour version this scenario was branched from. */
  base_tour_version_id: string
  /** Actor who created this scenario. */
  created_by: string
  created_at: string
  /** Last actor to modify stops/legs. */
  updated_by: string
  updated_at: string
  /** Ordered stop list. */
  stops: ScenarioStop[]
  /** Route legs for this scenario. */
  legs: TourRouteLeg[]
  /** Constraint violations computed for this scenario. */
  violations: RouteConstraintViolation[]
  /** Unresolved suggestions (not yet adopted). */
  suggestions: TravelRestDaySuggestion[]
  /** Internal share tokens issued for this scenario. */
  shares: ScenarioShare[]
}

export interface ScenarioShare {
  token: string
  shared_with: string
  /** ISO timestamp of when the share was issued. */
  issued_at: string
  /** ISO timestamp after which the share expires (null = no expiry). */
  expires_at: string | null
  /** Whether the share has been explicitly revoked. */
  revoked: boolean
}

// ---------------------------------------------------------------------------
// Comparison types
// ---------------------------------------------------------------------------

export type ScenarioMetric =
  | "total_distance_km"
  | "total_drive_minutes"
  | "total_legs"
  | "total_stops"
  | "error_count"
  | "warning_count"
  | "show_days"
  | "travel_days"
  | "rest_days"
  | "date_range_days"

export interface ScenarioMetricValue {
  metric: ScenarioMetric
  value: number
  /** Human-readable formatted value (e.g. "1 234 km", "3h 20m"). */
  formatted: string
}

export interface ScenarioMetricDiff {
  metric: ScenarioMetric
  baseValue: number
  comparandValue: number
  /** Absolute delta (comparand − base). Positive = comparand is higher. */
  delta: number
  /** Relative percentage change (null when base is 0). */
  pctChange: number | null
  /** "better" / "worse" / "neutral" from the perspective of the route planner. */
  direction: "better" | "worse" | "neutral"
}

export interface UniqueViolationKey {
  code: string
  /** stop-pair key: "fromId:toId" or just "legId". */
  pairKey: string
}

export interface ScenarioViolationDiff {
  /** Violations present in base only (removed in comparand). */
  resolved: RouteConstraintViolation[]
  /** Violations present in comparand only (introduced by comparand). */
  introduced: RouteConstraintViolation[]
  /** Violations present in both. */
  shared: RouteConstraintViolation[]
}

export interface ScenarioComparison {
  baseScenarioId: string
  comparandScenarioId: string
  metrics: ScenarioMetricDiff[]
  violations: ScenarioViolationDiff
  /** Summary verdict. */
  verdict: "comparand_better" | "comparand_worse" | "neutral"
}

// ---------------------------------------------------------------------------
// Adopt / impact preview types
// ---------------------------------------------------------------------------

export interface ScenarioAdoptImpact {
  /** Stops added relative to active scenario. */
  stopsAdded: ScenarioStop[]
  /** Stops removed relative to active scenario. */
  stopsRemoved: ScenarioStop[]
  /** Stops whose fields changed. */
  stopsModified: Array<{ stopId: string; changedFields: string[] }>
  /** Legs replaced (count). */
  legsReplaced: number
  /** Net change in violations (negative = fewer violations after adopt). */
  violationDelta: number
  /** Whether adopting introduces any new errors. */
  introducesErrors: boolean
  /** Whether adopting removes existing errors. */
  resolvesErrors: boolean
}

export interface ScenarioAdoptResult {
  /** Full impact preview — always computed even if not committed. */
  impact: ScenarioAdoptImpact
  /**
   * The updated active scenario after adoption.
   * null when called in preview-only mode (commitAdopt=false).
   */
  updatedActiveScenario: RouteScenario | null
  /** The adopted scenario (status → "adopted"). */
  adoptedScenario: RouteScenario
}

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------

/**
 * Branch creates a deep-copy of a base scenario as a new draft scenario.
 *
 * The new scenario gets a generated scenario_id, a copy of all stops/legs/
 * violations/suggestions, and "draft" status. The base scenario is unchanged.
 */
export function branchScenario(args: {
  base: RouteScenario
  newName: string
  description?: string | null
  actorUserId: string
  nowIso?: string
}): RouteScenario {
  const now = args.nowIso ?? new Date().toISOString()
  const newId = `scenario_${args.base.scenario_id}_branch_${Date.now()}`

  return {
    scenario_id: newId,
    name: args.newName.trim() || `Branch of ${args.base.name}`,
    description: args.description ?? null,
    status: "draft",
    base_tour_version_id: args.base.base_tour_version_id,
    created_by: args.actorUserId,
    created_at: now,
    updated_by: args.actorUserId,
    updated_at: now,
    // Deep-copy the data so mutations on the branch don't affect the base
    stops: args.base.stops.map((s) => ({ ...s })),
    legs: args.base.legs.map((l) => ({
      ...l,
      override: l.override ? { ...l.override } : null,
      conflict_codes: [...l.conflict_codes],
    })),
    violations: args.base.violations.map((v) => ({
      ...v,
      evidence: { ...v.evidence },
    })),
    suggestions: args.base.suggestions.map((s) => ({
      ...s,
      source_violation_codes: [...s.source_violation_codes],
    })),
    shares: [],
  }
}

// ---------------------------------------------------------------------------
// Scenario metrics
// ---------------------------------------------------------------------------

/**
 * Compute the set of comparable scalar metrics for a scenario.
 */
export function computeScenarioMetrics(scenario: RouteScenario): ScenarioMetricValue[] {
  const stops = scenario.stops
  const legs = scenario.legs
  const violations = scenario.violations

  const totalDistanceKm = legs.reduce((sum, l) => {
    const eff = (l.override?.distance_km != null ? l.override.distance_km : l.distance_km) ?? 0
    return sum + eff
  }, 0)

  const totalDriveMinutes = legs
    .filter((l) => l.transport_mode === "drive")
    .reduce((sum, l) => {
      const eff = (l.override?.duration_minutes != null ? l.override.duration_minutes : l.duration_minutes) ?? 0
      return sum + eff
    }, 0)

  const errorCount = violations.filter((v) => v.severity === "error").length
  const warningCount = violations.filter((v) => v.severity === "warning").length

  const showDays = stops.filter(
    (s) => !s.stop_type || s.stop_type === "show" || s.stop_type === "festival",
  ).length
  const travelDays = stops.filter((s) => s.stop_type === "travel").length
  const restDays = stops.filter((s) => s.stop_type === "rest").length

  // Date range: difference in days between first and last dated stop
  const dates = stops
    .map((s) => s.local_date)
    .filter((d): d is string => Boolean(d))
    .sort()
  const dateRangeDays =
    dates.length >= 2
      ? Math.round(
          (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0

  return [
    {
      metric: "total_distance_km",
      value: totalDistanceKm,
      formatted: `${Math.round(totalDistanceKm).toLocaleString()} km`,
    },
    {
      metric: "total_drive_minutes",
      value: totalDriveMinutes,
      formatted: formatMinutes(totalDriveMinutes),
    },
    {
      metric: "total_legs",
      value: legs.length,
      formatted: String(legs.length),
    },
    {
      metric: "total_stops",
      value: stops.length,
      formatted: String(stops.length),
    },
    {
      metric: "error_count",
      value: errorCount,
      formatted: String(errorCount),
    },
    {
      metric: "warning_count",
      value: warningCount,
      formatted: String(warningCount),
    },
    {
      metric: "show_days",
      value: showDays,
      formatted: String(showDays),
    },
    {
      metric: "travel_days",
      value: travelDays,
      formatted: String(travelDays),
    },
    {
      metric: "rest_days",
      value: restDays,
      formatted: String(restDays),
    },
    {
      metric: "date_range_days",
      value: dateRangeDays,
      formatted: `${dateRangeDays} days`,
    },
  ]
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

/** Metrics where a lower value is "better" (from planner perspective). */
const LOWER_IS_BETTER: Set<ScenarioMetric> = new Set([
  "total_distance_km",
  "total_drive_minutes",
  "error_count",
  "warning_count",
  "date_range_days",
])

/** Metrics where a higher value is "better". */
const HIGHER_IS_BETTER: Set<ScenarioMetric> = new Set([
  "show_days",
])

function metricDirection(
  metric: ScenarioMetric,
  delta: number,
): "better" | "worse" | "neutral" {
  if (delta === 0) return "neutral"
  if (LOWER_IS_BETTER.has(metric)) return delta < 0 ? "better" : "worse"
  if (HIGHER_IS_BETTER.has(metric)) return delta > 0 ? "better" : "worse"
  return "neutral"
}

function violationPairKey(v: RouteConstraintViolation): string {
  if (v.legId) return `leg:${v.legId}`
  const from = v.fromStopId ?? "null"
  const to = v.toStopId ?? "null"
  return `${v.code}:${from}:${to}`
}

/**
 * Compare two scenarios.
 * base is treated as the reference; comparand is evaluated relative to it.
 */
export function compareScenarios(args: {
  base: RouteScenario
  comparand: RouteScenario
}): ScenarioComparison {
  const baseMetrics = computeScenarioMetrics(args.base)
  const comparandMetrics = computeScenarioMetrics(args.comparand)

  const metricMap = new Map<ScenarioMetric, number>()
  for (const m of baseMetrics) metricMap.set(m.metric, m.value)

  const diffs: ScenarioMetricDiff[] = comparandMetrics.map((cm) => {
    const baseVal = metricMap.get(cm.metric) ?? 0
    const delta = cm.value - baseVal
    return {
      metric: cm.metric,
      baseValue: baseVal,
      comparandValue: cm.value,
      delta,
      pctChange: baseVal === 0 ? null : Math.round((delta / baseVal) * 10000) / 100,
      direction: metricDirection(cm.metric, delta),
    }
  })

  // Violation diff by deduplication key
  const baseKeys = new Map<string, RouteConstraintViolation>()
  for (const v of args.base.violations) baseKeys.set(violationPairKey(v), v)

  const comparandKeys = new Map<string, RouteConstraintViolation>()
  for (const v of args.comparand.violations) comparandKeys.set(violationPairKey(v), v)

  const resolved: RouteConstraintViolation[] = []
  const sharedViolations: RouteConstraintViolation[] = []

  for (const [key, v] of baseKeys) {
    if (comparandKeys.has(key)) {
      sharedViolations.push(v)
    } else {
      resolved.push(v)
    }
  }

  const introduced: RouteConstraintViolation[] = []
  for (const [key, v] of comparandKeys) {
    if (!baseKeys.has(key)) introduced.push(v)
  }

  // Verdict: weight errors heavily, then warnings
  const betterCount = diffs.filter((d) => d.direction === "better").length
  const worseCount = diffs.filter((d) => d.direction === "worse").length
  const errorDelta =
    (comparandKeys.size === 0 ? 0 : [...comparandKeys.values()].filter((v) => v.severity === "error").length) -
    (baseKeys.size === 0 ? 0 : [...baseKeys.values()].filter((v) => v.severity === "error").length)

  let verdict: ScenarioComparison["verdict"] = "neutral"
  if (errorDelta < 0 || (errorDelta === 0 && betterCount > worseCount)) {
    verdict = "comparand_better"
  } else if (errorDelta > 0 || (errorDelta === 0 && worseCount > betterCount)) {
    verdict = "comparand_worse"
  }

  return {
    baseScenarioId: args.base.scenario_id,
    comparandScenarioId: args.comparand.scenario_id,
    metrics: diffs,
    violations: { resolved, introduced, shared: sharedViolations },
    verdict,
  }
}

// ---------------------------------------------------------------------------
// Adopt
// ---------------------------------------------------------------------------

/**
 * Preview (and optionally commit) adoption of a scenario into the active draft.
 *
 * Steps:
 *  1. Compute the impact: stops added/removed/modified, legs replaced, violation delta.
 *  2. If commitAdopt=true, return the updated active scenario and mark the
 *     adopted scenario status="adopted".
 *  3. If commitAdopt=false (preview), return impact only (updatedActiveScenario=null).
 */
export function adoptScenario(args: {
  active: RouteScenario
  branch: RouteScenario
  actorUserId: string
  commitAdopt: boolean
  nowIso?: string
}): ScenarioAdoptResult {
  const now = args.nowIso ?? new Date().toISOString()

  // --- Compute impact ---
  const activeStopIds = new Set(args.active.stops.map((s) => s.id))
  const branchStopIds = new Set(args.branch.stops.map((s) => s.id))

  const stopsAdded = args.branch.stops.filter((s) => !activeStopIds.has(s.id))
  const stopsRemoved = args.active.stops.filter((s) => !branchStopIds.has(s.id))

  // Modified: stops present in both but with different field values
  const stopsModified: ScenarioAdoptImpact["stopsModified"] = []
  const activeStopMap = new Map(args.active.stops.map((s) => [s.id, s]))
  for (const bs of args.branch.stops) {
    const as = activeStopMap.get(bs.id)
    if (!as) continue
    const changed: string[] = []
    const fields: (keyof ScenarioStop)[] = [
      "ordinal",
      "name",
      "stop_type",
      "local_date",
      "venue_label",
      "start_utc",
      "end_utc",
      "ianaZone",
    ]
    for (const f of fields) {
      if (as[f] !== bs[f]) changed.push(f)
    }
    if (changed.length > 0) stopsModified.push({ stopId: bs.id, changedFields: changed })
  }

  const activeErrors = args.active.violations.filter((v) => v.severity === "error").length
  const branchErrors = args.branch.violations.filter((v) => v.severity === "error").length
  const violationDelta = args.branch.violations.length - args.active.violations.length

  const impact: ScenarioAdoptImpact = {
    stopsAdded,
    stopsRemoved,
    stopsModified,
    legsReplaced: args.branch.legs.length,
    violationDelta,
    introducesErrors: branchErrors > activeErrors,
    resolvesErrors: branchErrors < activeErrors,
  }

  if (!args.commitAdopt) {
    return {
      impact,
      updatedActiveScenario: null,
      adoptedScenario: args.branch,
    }
  }

  // --- Commit adopt ---
  const updatedActive: RouteScenario = {
    ...args.active,
    stops: args.branch.stops.map((s) => ({ ...s })),
    legs: args.branch.legs.map((l) => ({
      ...l,
      override: l.override ? { ...l.override } : null,
      conflict_codes: [...l.conflict_codes],
    })),
    violations: args.branch.violations.map((v) => ({ ...v, evidence: { ...v.evidence } })),
    suggestions: args.branch.suggestions.map((s) => ({
      ...s,
      source_violation_codes: [...s.source_violation_codes],
    })),
    updated_by: args.actorUserId,
    updated_at: now,
  }

  const adoptedBranch: RouteScenario = {
    ...args.branch,
    status: "adopted",
    updated_by: args.actorUserId,
    updated_at: now,
  }

  return {
    impact,
    updatedActiveScenario: updatedActive,
    adoptedScenario: adoptedBranch,
  }
}

// ---------------------------------------------------------------------------
// Share
// ---------------------------------------------------------------------------

/**
 * Generate an internal share token for a scenario and return the updated
 * scenario with the share appended.
 *
 * Token is a deterministic opaque string (base on scenario_id + recipient +
 * issued_at). In production the token would be stored server-side with a
 * lookup; here we produce a stable string that the test can verify.
 */
export function shareScenario(args: {
  scenario: RouteScenario
  sharedWith: string
  expiresAt?: string | null
  actorUserId: string
  nowIso?: string
}): { updatedScenario: RouteScenario; token: string } {
  const now = args.nowIso ?? new Date().toISOString()
  // Produce a stable but opaque token from the inputs
  const raw = `${args.scenario.scenario_id}|${args.sharedWith}|${now}`
  const token = `share_${btoa(raw).replace(/[+/=]/g, "").slice(0, 32)}`

  const share: ScenarioShare = {
    token,
    shared_with: args.sharedWith,
    issued_at: now,
    expires_at: args.expiresAt ?? null,
    revoked: false,
  }

  return {
    token,
    updatedScenario: {
      ...args.scenario,
      shares: [...args.scenario.shares, share],
      updated_by: args.actorUserId,
      updated_at: now,
    },
  }
}

/**
 * Revoke an existing share token on a scenario.
 * Returns the updated scenario; no-ops if token not found.
 */
export function revokeScenarioShare(args: {
  scenario: RouteScenario
  token: string
  actorUserId: string
  nowIso?: string
}): RouteScenario {
  const now = args.nowIso ?? new Date().toISOString()
  return {
    ...args.scenario,
    shares: args.scenario.shares.map((s) =>
      s.token === args.token ? { ...s, revoked: true } : s,
    ),
    updated_by: args.actorUserId,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Archive
// ---------------------------------------------------------------------------

/**
 * Archive a scenario (status → "archived"). Cannot archive the active draft.
 */
export function archiveScenario(args: {
  scenario: RouteScenario
  actorUserId: string
  nowIso?: string
}): RouteScenario {
  if (args.scenario.scenario_id === "active" || args.scenario.status === "active") {
    throw new Error("Cannot archive the active draft scenario. Adopt a branch first.")
  }
  const now = args.nowIso ?? new Date().toISOString()
  return {
    ...args.scenario,
    status: "archived",
    updated_by: args.actorUserId,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Rename
// ---------------------------------------------------------------------------

/**
 * Rename a scenario or update its description.
 */
export function renameScenario(args: {
  scenario: RouteScenario
  newName: string
  newDescription?: string | null
  actorUserId: string
  nowIso?: string
}): RouteScenario {
  if (!args.newName.trim()) {
    throw new Error("Scenario name must not be empty.")
  }
  const now = args.nowIso ?? new Date().toISOString()
  return {
    ...args.scenario,
    name: args.newName.trim(),
    description: args.newDescription !== undefined ? args.newDescription : args.scenario.description,
    updated_by: args.actorUserId,
    updated_at: now,
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/** Filter a scenario list to only non-archived items. */
export function activeScenarios(scenarios: RouteScenario[]): RouteScenario[] {
  return scenarios.filter((s) => s.status !== "archived")
}

/** Find a scenario by id; returns null if not found. */
export function findScenario(
  scenarios: RouteScenario[],
  scenarioId: string,
): RouteScenario | null {
  return scenarios.find((s) => s.scenario_id === scenarioId) ?? null
}

/**
 * Validate that a scenario is adoptable:
 *  - Must be "draft" status (not already adopted or archived).
 *  - Must have at least one stop.
 *  - All shares must not be the only access path (internal use).
 */
export function validateScenarioAdoptable(
  scenario: RouteScenario,
): { valid: boolean; reason: string | null } {
  if (scenario.status === "adopted") {
    return { valid: false, reason: "Scenario has already been adopted." }
  }
  if (scenario.status === "archived") {
    return { valid: false, reason: "Archived scenarios cannot be adopted." }
  }
  if (scenario.status === "active") {
    return { valid: false, reason: "The active scenario is the current draft — adopt a branch instead." }
  }
  if (scenario.stops.length === 0) {
    return { valid: false, reason: "Scenario has no stops to adopt." }
  }
  return { valid: true, reason: null }
}
