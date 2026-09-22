/**
 * LIVE-402 — Add timeline validation
 *
 * Validates a ROS timeline for:
 *   1. Overlapping items (same-role or same-location conflicts)
 *   2. Dependency inversion (B ordered_after A but B starts before A ends)
 *   3. Missing location or owner on required-location / critical items
 *   4. Travel / load timing conflict (load_in too early or load_out too late
 *      relative to adjacent travel legs)
 *   5. Curfew breach (any item ends after the event curfew_utc)
 *   6. Unstaffed critical item (is_critical=true but no owner_id)
 *
 * Returns a typed list of RosValidationIssue; severity blocking/warning/info.
 *
 * Pure domain logic; no Supabase imports.
 */
import type { RosItem } from "./ros-timeline"

// ---------------------------------------------------------------------------
// Validation issue
// ---------------------------------------------------------------------------

export type RosValidationCode =
  | "overlap"
  | "dependency_inversion"
  | "dependency_cycle"
  | "missing_location"
  | "missing_owner"
  | "travel_load_conflict"
  | "curfew_breach"
  | "unstaffed_critical"

export type RosValidationSeverity = "blocking" | "warning" | "info"

export interface RosValidationIssue {
  code: RosValidationCode
  severity: RosValidationSeverity
  /** Item(s) involved in this issue */
  item_ids: string[]
  message: string
}

// ---------------------------------------------------------------------------
// Config for validation
// ---------------------------------------------------------------------------

export interface RosValidationConfig {
  /** Event curfew as ISO-8601 UTC datetime; null = no curfew check */
  curfew_utc?: string
  /** Minimum gap (minutes) between load_out end and travel departure */
  min_load_out_to_travel_gap_minutes: number
  /** Minimum gap (minutes) between travel arrival and load_in start */
  min_travel_to_load_in_gap_minutes: number
  /** Whether missing location on non-critical items is blocking or warning */
  missing_location_severity: RosValidationSeverity
  /** Whether missing owner on non-critical items is blocking or warning */
  missing_owner_severity: RosValidationSeverity
}

export const DEFAULT_VALIDATION_CONFIG: RosValidationConfig = {
  min_load_out_to_travel_gap_minutes: 30,
  min_travel_to_load_in_gap_minutes: 30,
  missing_location_severity: "warning",
  missing_owner_severity: "warning",
}

// ---------------------------------------------------------------------------
// Main validation entry point
// ---------------------------------------------------------------------------

export interface RosValidationResult {
  valid: boolean
  issues: RosValidationIssue[]
  blocking_count: number
  warning_count: number
}

export function validateRosTimeline(
  items: RosItem[],
  config: RosValidationConfig = DEFAULT_VALIDATION_CONFIG,
): RosValidationResult {
  const issues: RosValidationIssue[] = [
    ...checkOverlaps(items),
    ...checkDependencyInversions(items),
    ...checkDependencyCycles(items),
    ...checkMissingLocation(items, config),
    ...checkMissingOwner(items, config),
    ...checkTravelLoadConflicts(items, config),
    ...(config.curfew_utc ? checkCurfewBreaches(items, config.curfew_utc) : []),
    ...checkUnstaffedCritical(items),
  ]

  const blocking_count = issues.filter((i) => i.severity === "blocking").length
  const warning_count = issues.filter((i) => i.severity === "warning").length

  return {
    valid: blocking_count === 0,
    issues,
    blocking_count,
    warning_count,
  }
}

// ---------------------------------------------------------------------------
// 1. Overlap detection
// ---------------------------------------------------------------------------

/**
 * Two items overlap when their planned UTC windows intersect AND they share
 * the same owner_id or the same location.label.
 */
function checkOverlaps(items: RosItem[]): RosValidationIssue[] {
  const issues: RosValidationIssue[] = []

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]

      if (!intervalsOverlap(a.planned_start_utc, a.planned_end_utc, b.planned_start_utc, b.planned_end_utc)) continue

      const sameOwner = a.owner_id && b.owner_id && a.owner_id === b.owner_id
      const sameLocation = a.location?.label && b.location?.label && a.location.label === b.location.label

      if (sameOwner || sameLocation) {
        issues.push({
          code: "overlap",
          severity: "blocking",
          item_ids: [a.id, b.id],
          message: `Items '${a.title}' and '${b.title}' overlap in time${sameOwner ? " (same owner)" : " (same location)"}.`,
        })
      }
    }
  }

  return issues
}

function intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

// ---------------------------------------------------------------------------
// 2. Dependency inversion
// ---------------------------------------------------------------------------

function checkDependencyInversions(items: RosItem[]): RosValidationIssue[] {
  const issues: RosValidationIssue[] = []
  const itemMap = new Map(items.map((i) => [i.id, i]))

  for (const item of items) {
    for (const depId of item.ordered_after) {
      const dep = itemMap.get(depId)
      if (!dep) continue
      // item must start at or after dep ends
      if (item.planned_start_utc < dep.planned_end_utc) {
        issues.push({
          code: "dependency_inversion",
          severity: "blocking",
          item_ids: [item.id, depId],
          message: `'${item.title}' starts before its dependency '${dep.title}' ends.`,
        })
      }
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// 3. Dependency cycle
// ---------------------------------------------------------------------------

function checkDependencyCycles(items: RosItem[]): RosValidationIssue[] {
  const adjMap = new Map<string, string[]>()
  for (const item of items) adjMap.set(item.id, item.ordered_after)

  const visited = new Set<string>()
  const inStack = new Set<string>()
  let cyclePath: string[] | null = null

  function dfs(id: string, path: string[]): boolean {
    if (inStack.has(id)) { cyclePath = [...path, id]; return true }
    if (visited.has(id)) return false
    visited.add(id)
    inStack.add(id)
    for (const dep of adjMap.get(id) ?? []) {
      if (dfs(dep, [...path, id])) return true
    }
    inStack.delete(id)
    return false
  }

  for (const item of items) {
    if (!visited.has(item.id) && dfs(item.id, [])) break
  }

  if (!cyclePath) return []

  const safePath = cyclePath as string[]
  return [{
    code: "dependency_cycle",
    severity: "blocking",
    item_ids: safePath,
    message: `Dependency cycle detected: ${safePath.join(" → ")}.`,
  }]
}

// ---------------------------------------------------------------------------
// 4. Missing location
// ---------------------------------------------------------------------------

function checkMissingLocation(items: RosItem[], config: RosValidationConfig): RosValidationIssue[] {
  // location is required for load_in, soundcheck, show, load_out, security
  const LOCATION_REQUIRED_CATEGORIES = new Set(["load_in", "soundcheck", "show", "load_out", "security"])
  return items
    .filter((i) => LOCATION_REQUIRED_CATEGORIES.has(i.category) && !i.location?.label)
    .map((i) => ({
      code: "missing_location" as RosValidationCode,
      severity: i.is_critical ? "blocking" : config.missing_location_severity,
      item_ids: [i.id],
      message: `Item '${i.title}' (${i.category}) is missing a location.`,
    }))
}

// ---------------------------------------------------------------------------
// 5. Missing owner
// ---------------------------------------------------------------------------

function checkMissingOwner(items: RosItem[], config: RosValidationConfig): RosValidationIssue[] {
  return items
    .filter((i) => !i.owner_id)
    .map((i) => ({
      code: "missing_owner" as RosValidationCode,
      severity: i.is_critical ? "blocking" : config.missing_owner_severity,
      item_ids: [i.id],
      message: `Item '${i.title}' has no assigned owner.`,
    }))
}

// ---------------------------------------------------------------------------
// 6. Travel / load timing conflict
// ---------------------------------------------------------------------------

function checkTravelLoadConflicts(items: RosItem[], config: RosValidationConfig): RosValidationIssue[] {
  const issues: RosValidationIssue[] = []
  const sorted = [...items].sort((a, b) => a.planned_start_utc.localeCompare(b.planned_start_utc))

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i]
    const next = sorted[i + 1]

    // load_out → travel: gap must be ≥ min_load_out_to_travel_gap_minutes
    if (curr.category === "load_out" && next.category === "travel") {
      const gapMs = new Date(next.planned_start_utc).getTime() - new Date(curr.planned_end_utc).getTime()
      const gapMinutes = gapMs / 60000
      if (gapMinutes < config.min_load_out_to_travel_gap_minutes) {
        issues.push({
          code: "travel_load_conflict",
          severity: "warning",
          item_ids: [curr.id, next.id],
          message: `Load-out '${curr.title}' ends only ${gapMinutes.toFixed(0)} min before travel '${next.title}' (minimum: ${config.min_load_out_to_travel_gap_minutes} min).`,
        })
      }
    }

    // travel → load_in: gap must be ≥ min_travel_to_load_in_gap_minutes
    if (curr.category === "travel" && next.category === "load_in") {
      const gapMs = new Date(next.planned_start_utc).getTime() - new Date(curr.planned_end_utc).getTime()
      const gapMinutes = gapMs / 60000
      if (gapMinutes < config.min_travel_to_load_in_gap_minutes) {
        issues.push({
          code: "travel_load_conflict",
          severity: "warning",
          item_ids: [curr.id, next.id],
          message: `Travel '${curr.title}' ends only ${gapMinutes.toFixed(0)} min before load-in '${next.title}' (minimum: ${config.min_travel_to_load_in_gap_minutes} min).`,
        })
      }
    }
  }

  return issues
}

// ---------------------------------------------------------------------------
// 7. Curfew breach
// ---------------------------------------------------------------------------

function checkCurfewBreaches(items: RosItem[], curfewUtc: string): RosValidationIssue[] {
  return items
    .filter((i) => i.planned_end_utc > curfewUtc)
    .map((i) => ({
      code: "curfew_breach" as RosValidationCode,
      severity: "blocking" as RosValidationSeverity,
      item_ids: [i.id],
      message: `Item '${i.title}' ends at ${i.planned_end_utc}, which is after the curfew (${curfewUtc}).`,
    }))
}

// ---------------------------------------------------------------------------
// 8. Unstaffed critical item
// ---------------------------------------------------------------------------

function checkUnstaffedCritical(items: RosItem[]): RosValidationIssue[] {
  return items
    .filter((i) => i.is_critical && !i.owner_id)
    .map((i) => ({
      code: "unstaffed_critical" as RosValidationCode,
      severity: "blocking" as RosValidationSeverity,
      item_ids: [i.id],
      message: `Critical item '${i.title}' has no assigned owner.`,
    }))
}
