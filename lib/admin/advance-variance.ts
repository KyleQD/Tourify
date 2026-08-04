/**
 * ADV-407 — Add tour-standard variance detection
 *
 * Compares local advance section responses against tour-level production
 * standards across: rider/production, staffing, route, equipment,
 * hospitality, curfew, and budget.
 *
 * Produces variance findings that are assigned to owners for resolution.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Variance categories and severity
// ---------------------------------------------------------------------------

export type VarianceCategory =
  | "rider"          // technical/hospitality rider spec
  | "production"     // stage/power/load-in window/production requirements
  | "staffing"       // required crew headcount or roles
  | "route"          // routing/travel inconsistency
  | "equipment"      // required equipment not confirmed
  | "hospitality"    // catering/dietary/dressing room
  | "curfew"         // curfew or noise ordinance breach
  | "budget"         // actual vs. budgeted cost variance

export type VarianceSeverity = "info" | "warning" | "critical"

// ---------------------------------------------------------------------------
// Tour standard — one entry per field/category
// ---------------------------------------------------------------------------

export interface TourStandardEntry {
  id: string
  category: VarianceCategory
  field_key: string          // e.g. "stage.width_m", "power.amps", "curfew.time"
  label: string
  /** Expected value as a string (for comparison after normalization) */
  expected_value: string
  /** Tolerance for numeric comparisons (absolute value) */
  numeric_tolerance?: number
  severity_if_variance: VarianceSeverity
  /** True if a variance on this entry blocks publication */
  blocks_publication: boolean
  notes?: string
}

// ---------------------------------------------------------------------------
// Local response value (extracted from AdvanceFieldResponse for comparison)
// ---------------------------------------------------------------------------

export interface LocalResponseValue {
  field_key: string
  raw_value: string   // normalized string representation
  /** Set if the field has not been answered yet */
  is_missing: boolean
}

// ---------------------------------------------------------------------------
// Variance finding
// ---------------------------------------------------------------------------

export type VarianceFindingStatus =
  | "open"
  | "acknowledged"
  | "resolved"
  | "waived"

export interface AdvanceVarianceFinding {
  id: string
  advance_section_id: string
  tour_standard_id: string
  field_key: string
  category: VarianceCategory
  severity: VarianceSeverity
  blocks_publication: boolean

  expected_value: string
  actual_value: string    // "MISSING" when not answered
  description: string

  status: VarianceFindingStatus
  assigned_to?: string
  resolution_notes?: string
  resolved_at?: string
  resolved_by?: string
  waive_reason?: string

  detected_at: string
}

// ---------------------------------------------------------------------------
// Variance detection
// ---------------------------------------------------------------------------

export interface DetectVariancesInput {
  advance_section_id: string
  standards: TourStandardEntry[]
  local_responses: LocalResponseValue[]
  now?: string
  id_prefix?: string
}

/**
 * Compares local responses against tour standards.
 * Returns a variance finding for each standard where the local value
 * is missing or differs beyond tolerance.
 */
export function detectVariances(input: DetectVariancesInput): AdvanceVarianceFinding[] {
  const { advance_section_id, standards, local_responses, id_prefix = "var" } = input
  const ts = input.now ?? new Date().toISOString()
  const findings: AdvanceVarianceFinding[] = []

  for (const std of standards) {
    const local = local_responses.find((r) => r.field_key === std.field_key)

    if (!local || local.is_missing) {
      findings.push({
        id: `${id_prefix}-${std.id}-missing`,
        advance_section_id,
        tour_standard_id: std.id,
        field_key: std.field_key,
        category: std.category,
        severity: std.severity_if_variance,
        blocks_publication: std.blocks_publication,
        expected_value: std.expected_value,
        actual_value: "MISSING",
        description: `Required field '${std.label}' has not been answered.`,
        status: "open",
        detected_at: ts,
      })
      continue
    }

    const matches = valuesMatch(std.expected_value, local.raw_value, std.numeric_tolerance)
    if (!matches) {
      findings.push({
        id: `${id_prefix}-${std.id}-variance`,
        advance_section_id,
        tour_standard_id: std.id,
        field_key: std.field_key,
        category: std.category,
        severity: std.severity_if_variance,
        blocks_publication: std.blocks_publication,
        expected_value: std.expected_value,
        actual_value: local.raw_value,
        description: `'${std.label}': expected '${std.expected_value}', got '${local.raw_value}'.`,
        status: "open",
        detected_at: ts,
      })
    }
  }

  return findings
}

/**
 * Compares two string values.  When both parse as numbers and a numeric
 * tolerance is given, uses numeric comparison.  Otherwise case-insensitive
 * string equality.
 */
function valuesMatch(
  expected: string,
  actual: string,
  tolerance?: number,
): boolean {
  const expNum = parseFloat(expected)
  const actNum = parseFloat(actual)
  if (!isNaN(expNum) && !isNaN(actNum) && tolerance !== undefined) {
    return Math.abs(expNum - actNum) <= tolerance
  }
  return expected.trim().toLowerCase() === actual.trim().toLowerCase()
}

// ---------------------------------------------------------------------------
// Assign a finding to an owner
// ---------------------------------------------------------------------------

export function assignVarianceFinding(
  finding: AdvanceVarianceFinding,
  assignedTo: string,
): AdvanceVarianceFinding {
  return { ...finding, assigned_to: assignedTo }
}

// ---------------------------------------------------------------------------
// Transition finding status
// ---------------------------------------------------------------------------

export type FindingTransitionReason = {
  status: "acknowledged" | "resolved" | "waived"
  resolution_notes?: string
  waive_reason?: string
  actor_id: string
  now?: string
}

export function transitionVarianceFinding(
  finding: AdvanceVarianceFinding,
  transition: FindingTransitionReason,
): AdvanceVarianceFinding {
  if (finding.status !== "open" && finding.status !== "acknowledged") {
    throw new Error(`Cannot transition finding '${finding.id}' from status '${finding.status}'.`)
  }
  if (transition.status === "waived" && !transition.waive_reason?.trim()) {
    throw new Error("waive_reason is required when waiving a variance finding.")
  }
  const ts = transition.now ?? new Date().toISOString()
  return {
    ...finding,
    status: transition.status,
    resolution_notes: transition.resolution_notes ?? finding.resolution_notes,
    waive_reason: transition.waive_reason ?? finding.waive_reason,
    resolved_at: transition.status === "resolved" || transition.status === "waived" ? ts : finding.resolved_at,
    resolved_by: transition.status === "resolved" || transition.status === "waived" ? transition.actor_id : finding.resolved_by,
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface VarianceSummary {
  total: number
  open: number
  acknowledged: number
  resolved: number
  waived: number
  critical: number
  blocking_publication: number
  can_publish: boolean
  by_category: Partial<Record<VarianceCategory, number>>
}

export function summarizeVariances(findings: AdvanceVarianceFinding[]): VarianceSummary {
  let open = 0, acknowledged = 0, resolved = 0, waived = 0, critical = 0, blocking_publication = 0
  const by_category: Partial<Record<VarianceCategory, number>> = {}

  for (const f of findings) {
    by_category[f.category] = (by_category[f.category] ?? 0) + 1
    switch (f.status) {
      case "open": open++; break
      case "acknowledged": acknowledged++; break
      case "resolved": resolved++; break
      case "waived": waived++; break
    }
    if (f.severity === "critical") critical++
    if (f.blocks_publication && (f.status === "open" || f.status === "acknowledged")) {
      blocking_publication++
    }
  }

  return {
    total: findings.length,
    open,
    acknowledged,
    resolved,
    waived,
    critical,
    blocking_publication,
    can_publish: blocking_publication === 0,
    by_category,
  }
}
