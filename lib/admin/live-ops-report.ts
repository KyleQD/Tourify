/**
 * REP-401 — Workforce/advance/live reporting dashboard definitions.
 *
 * Governed metric definitions ensure dashboard consumers use consistent
 * denominators, labels, and drill-down links. Covers:
 *
 *  - Workforce: coverage, conflicts, credentials, cost
 *  - Advance: status by section
 *  - Publication: acknowledgement rate
 *  - Live: timeline variance, tasks, incidents, check-in
 *
 * Pure: no I/O, no Supabase imports.
 */

export type MetricSeverity = "ok" | "warning" | "error" | "critical"

// ---------------------------------------------------------------------------
// Governed metric definition
// ---------------------------------------------------------------------------

export interface ReportMetricDef {
  metric_id: string
  label: string
  /** Short description of what this metric measures and its denominator. */
  description: string
  /** Domain that owns the data this metric reads from. */
  source_domain: string
  /** Severity thresholds: below these values the severity applies. */
  thresholds: ReportMetricThreshold[]
}

export interface ReportMetricThreshold {
  /** Value at or above this → severity applies. */
  min_value: number
  severity: MetricSeverity
}

export function evaluateMetricSeverity(
  def: ReportMetricDef,
  value: number,
): MetricSeverity {
  let severity: MetricSeverity = "ok"
  for (const t of def.thresholds) {
    if (value >= t.min_value && evaluateSeverityRank(t.severity) > evaluateSeverityRank(severity)) {
      severity = t.severity
    }
  }
  return severity
}

function evaluateSeverityRank(s: MetricSeverity): number {
  return { ok: 0, warning: 1, error: 2, critical: 3 }[s]
}

// ---------------------------------------------------------------------------
// Canonical Phase 4 live/workforce metric definitions
// ---------------------------------------------------------------------------

export const LIVE_METRICS: ReportMetricDef[] = [
  {
    metric_id: "workforce_coverage_deficit",
    label: "Unfilled Positions",
    description: "Count of required roles without an accepted assignment. Denominator: total required slots.",
    source_domain: "workforce",
    thresholds: [{ min_value: 1, severity: "warning" }, { min_value: 3, severity: "error" }],
  },
  {
    metric_id: "credential_violations",
    label: "Credential Violations",
    description: "Workers assigned to roles where required credentials are missing or expired.",
    source_domain: "workforce",
    thresholds: [{ min_value: 1, severity: "warning" }, { min_value: 5, severity: "error" }],
  },
  {
    metric_id: "labor_rest_conflicts",
    label: "Labor/Rest Conflicts",
    description: "Number of assignments that violate labor or rest-period rules.",
    source_domain: "workforce",
    thresholds: [{ min_value: 1, severity: "error" }],
  },
  {
    metric_id: "advance_overdue_sections",
    label: "Overdue Advance Sections",
    description: "Sections whose submission deadline has passed and are not yet submitted.",
    source_domain: "advance",
    thresholds: [{ min_value: 1, severity: "warning" }, { min_value: 3, severity: "error" }],
  },
  {
    metric_id: "day_sheet_ack_pending",
    label: "Day Sheet Ack Pending",
    description: "Recipients who have received the published day sheet but not acknowledged it.",
    source_domain: "publication",
    thresholds: [{ min_value: 1, severity: "warning" }],
  },
  {
    metric_id: "timeline_variance_significant",
    label: "Significant Timeline Variance",
    description: "ROS items with actual start/end deviating >= 15 minutes from planned.",
    source_domain: "live_ops",
    thresholds: [{ min_value: 1, severity: "warning" }, { min_value: 5, severity: "error" }],
  },
  {
    metric_id: "open_tasks_critical",
    label: "Critical Open Tasks",
    description: "Live tasks with priority=critical not yet completed.",
    source_domain: "live_ops",
    thresholds: [{ min_value: 1, severity: "critical" }],
  },
  {
    metric_id: "open_incidents_high_severity",
    label: "Open High-Severity Incidents",
    description: "Incidents with severity=high or critical that are not resolved/closed.",
    source_domain: "incidents",
    thresholds: [{ min_value: 1, severity: "critical" }],
  },
  {
    metric_id: "check_in_denied_rate_pct",
    label: "Check-In Denied Rate (%)",
    description: "Percentage of check-in attempts that resulted in denial (denied/revoked). Denominator: total check-in entries.",
    source_domain: "check_in",
    thresholds: [{ min_value: 5, severity: "warning" }, { min_value: 15, severity: "error" }],
  },
]

export function getMetricById(metric_id: string): ReportMetricDef | undefined {
  return LIVE_METRICS.find((m) => m.metric_id === metric_id)
}

// ---------------------------------------------------------------------------
// Report row
// ---------------------------------------------------------------------------

export interface LiveDashboardMetricRow {
  metric_id: string
  label: string
  value: number
  severity: MetricSeverity
  source_domain: string
}

export function buildLiveDashboardRow(
  def: ReportMetricDef,
  value: number,
): LiveDashboardMetricRow {
  return {
    metric_id: def.metric_id,
    label: def.label,
    value,
    severity: evaluateMetricSeverity(def, value),
    source_domain: def.source_domain,
  }
}

export function buildLiveDashboard(
  values: Record<string, number>,
): LiveDashboardMetricRow[] {
  return LIVE_METRICS.map((def) => buildLiveDashboardRow(def, values[def.metric_id] ?? 0))
}

// ---------------------------------------------------------------------------
// Overall dashboard severity
// ---------------------------------------------------------------------------

export function computeDashboardSeverity(rows: readonly LiveDashboardMetricRow[]): MetricSeverity {
  const RANK: Record<MetricSeverity, number> = { ok: 0, warning: 1, error: 2, critical: 3 }
  let worst: MetricSeverity = "ok"
  for (const row of rows) {
    if (RANK[row.severity] > RANK[worst]) worst = row.severity
  }
  return worst
}
