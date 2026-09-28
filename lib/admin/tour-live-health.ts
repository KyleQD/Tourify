/**
 * TOUR-401 — Integrated workforce/advance/live health per stop and tour.
 *
 * Aggregates health signals from:
 *  - Workforce coverage/conflicts/credentials/labor-rest
 *  - Advance sections (overdue, unapproved)
 *  - Day sheet publications (unacknowledged, pending)
 *  - Incidents (open/high-severity)
 *
 * Returns per-stop and tour-rollup views. Each signal is governed:
 *  - Severity: ok / warning / error / critical
 *  - Count and label so a dashboard can drill into the owning domain.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Signal types
// ---------------------------------------------------------------------------

export type SignalSeverity = "ok" | "warning" | "error" | "critical"

export interface StopHealthSignal {
  signal_type:
    | "workforce_coverage"
    | "credential_missing"
    | "labor_rest_conflict"
    | "advance_overdue"
    | "advance_unapproved"
    | "day_sheet_unacknowledged"
    | "incident_open"
    | "incident_critical"
  severity: SignalSeverity
  count: number
  label: string
}

// ---------------------------------------------------------------------------
// Per-stop inputs (callers supply pre-computed counts from domain modules)
// ---------------------------------------------------------------------------

export interface StopWorkforceHealth {
  stop_id: string
  coverage_deficit: number        // open positions not filled
  credential_violations: number
  labor_rest_conflicts: number
}

export interface StopAdvanceHealth {
  stop_id: string
  overdue_sections: number
  unapproved_sections: number
}

export interface StopDaySheetHealth {
  stop_id: string
  unacknowledged_recipients: number
}

export interface StopIncidentHealth {
  stop_id: string
  open_incidents: number
  critical_incidents: number
}

// ---------------------------------------------------------------------------
// Build per-stop health signals
// ---------------------------------------------------------------------------

export function buildStopHealthSignals(
  workforce: StopWorkforceHealth,
  advance: StopAdvanceHealth,
  day_sheet: StopDaySheetHealth,
  incidents: StopIncidentHealth,
): StopHealthSignal[] {
  const signals: StopHealthSignal[] = []

  // Workforce coverage
  if (workforce.coverage_deficit > 0) {
    signals.push({
      signal_type: "workforce_coverage",
      severity: workforce.coverage_deficit >= 3 ? "critical" : "error",
      count: workforce.coverage_deficit,
      label: `${workforce.coverage_deficit} open position(s) unfilled`,
    })
  }

  if (workforce.credential_violations > 0) {
    signals.push({
      signal_type: "credential_missing",
      severity: "warning",
      count: workforce.credential_violations,
      label: `${workforce.credential_violations} credential violation(s)`,
    })
  }

  if (workforce.labor_rest_conflicts > 0) {
    signals.push({
      signal_type: "labor_rest_conflict",
      severity: "error",
      count: workforce.labor_rest_conflicts,
      label: `${workforce.labor_rest_conflicts} labor/rest conflict(s)`,
    })
  }

  // Advance
  if (advance.overdue_sections > 0) {
    signals.push({
      signal_type: "advance_overdue",
      severity: "error",
      count: advance.overdue_sections,
      label: `${advance.overdue_sections} advance section(s) overdue`,
    })
  }

  if (advance.unapproved_sections > 0) {
    signals.push({
      signal_type: "advance_unapproved",
      severity: "warning",
      count: advance.unapproved_sections,
      label: `${advance.unapproved_sections} advance section(s) awaiting approval`,
    })
  }

  // Day sheet
  if (day_sheet.unacknowledged_recipients > 0) {
    signals.push({
      signal_type: "day_sheet_unacknowledged",
      severity: "warning",
      count: day_sheet.unacknowledged_recipients,
      label: `${day_sheet.unacknowledged_recipients} recipient(s) have not acknowledged day sheet`,
    })
  }

  // Incidents
  if (incidents.open_incidents > 0) {
    signals.push({
      signal_type: "incident_open",
      severity: "warning",
      count: incidents.open_incidents,
      label: `${incidents.open_incidents} open incident(s)`,
    })
  }

  if (incidents.critical_incidents > 0) {
    signals.push({
      signal_type: "incident_critical",
      severity: "critical",
      count: incidents.critical_incidents,
      label: `${incidents.critical_incidents} critical incident(s)`,
    })
  }

  return signals
}

// ---------------------------------------------------------------------------
// Per-stop summary
// ---------------------------------------------------------------------------

export interface StopHealthSummary {
  stop_id: string
  overall_severity: SignalSeverity
  signals: StopHealthSignal[]
}

const SEVERITY_RANK: Record<SignalSeverity, number> = {
  ok: 0, warning: 1, error: 2, critical: 3,
}

export function computeStopHealthSummary(
  stop_id: string,
  signals: StopHealthSignal[],
): StopHealthSummary {
  let overall: SignalSeverity = "ok"
  for (const s of signals) {
    if (SEVERITY_RANK[s.severity] > SEVERITY_RANK[overall]) {
      overall = s.severity
    }
  }
  return { stop_id, overall_severity: overall, signals }
}

// ---------------------------------------------------------------------------
// Tour-level rollup
// ---------------------------------------------------------------------------

export interface TourLiveHealthRollup {
  total_stops: number
  stops_with_critical: number
  stops_with_error: number
  stops_with_warning: number
  stops_ok: number
  worst_severity: SignalSeverity
  stop_summaries: StopHealthSummary[]
}

export function buildTourLiveHealthRollup(
  summaries: readonly StopHealthSummary[],
): TourLiveHealthRollup {
  let stops_with_critical = 0, stops_with_error = 0, stops_with_warning = 0, stops_ok = 0
  let worst: SignalSeverity = "ok"

  for (const s of summaries) {
    if (s.overall_severity === "critical") stops_with_critical += 1
    else if (s.overall_severity === "error") stops_with_error += 1
    else if (s.overall_severity === "warning") stops_with_warning += 1
    else stops_ok += 1

    if (SEVERITY_RANK[s.overall_severity] > SEVERITY_RANK[worst]) {
      worst = s.overall_severity
    }
  }

  return {
    total_stops: summaries.length,
    stops_with_critical,
    stops_with_error,
    stops_with_warning,
    stops_ok,
    worst_severity: worst,
    stop_summaries: [...summaries],
  }
}
