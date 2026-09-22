/**
 * plan-route-phase6.ts — PLAN-602, PLAN-603, ROUTE-601
 *
 * Phase 6 planner and routing: migration reconciliation, planner retirement,
 * and route metrics/alerting.
 *
 * Pure domain logic only. No Supabase imports. No mocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-602 — Complete migration reconciliation
// ─────────────────────────────────────────────────────────────────────────────

export interface PlanMigrationComparison {
  tourId: string;
  orgId: string;
  /** Stops sourced from legacy JSON / tour_events column */
  legacyStopCount: number;
  /** Stops in canonical tour_versions / tour_stops table */
  canonicalStopCount: number;
  /** Stops where all key fields match exactly */
  matchingStopCount: number;
  /** Mismatches with diff details */
  unexplainedDifferences: Array<{ stopId: string; field: string; legacyValue: unknown; canonicalValue: unknown }>;
  /** Legacy write path is disabled */
  legacyWritesStopped: boolean;
  comparisonRunAt: string;
}

export interface PlanMigrationReconciliationResult {
  tourId: string;
  reconciled: boolean;
  canStopLegacyWrites: boolean;
  blockers: string[];
}

export function evaluatePlanMigrationReconciliation(
  comparison: PlanMigrationComparison,
): PlanMigrationReconciliationResult {
  const blockers: string[] = [];
  if (comparison.legacyStopCount !== comparison.canonicalStopCount) {
    blockers.push(
      `Stop count mismatch: legacy=${comparison.legacyStopCount} canonical=${comparison.canonicalStopCount}`,
    );
  }
  if (comparison.unexplainedDifferences.length > 0) {
    blockers.push(`${comparison.unexplainedDifferences.length} unexplained difference(s) in fields`);
  }
  const reconciled = blockers.length === 0;
  const canStopLegacyWrites = reconciled;
  return { tourId: comparison.tourId, reconciled, canStopLegacyWrites, blockers };
}

export function buildPlanMigrationReport(comparisons: PlanMigrationComparison[]): {
  total: number;
  reconciled: number;
  unreconciled: number;
  allReconciled: boolean;
  unreconciledTourIds: string[];
} {
  const results = comparisons.map(evaluatePlanMigrationReconciliation);
  const reconciled = results.filter(r => r.reconciled).length;
  const unreconciled = results.filter(r => !r.reconciled);
  return {
    total: comparisons.length,
    reconciled,
    unreconciled: unreconciled.length,
    allReconciled: unreconciled.length === 0,
    unreconciledTourIds: unreconciled.map(r => r.tourId),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN-603 — Retire old planner components/write paths
// ─────────────────────────────────────────────────────────────────────────────

export interface PlannerLegacyItem {
  itemId: string;
  itemType: "component" | "write_path" | "feature_flag" | "api_route";
  identifier: string;
  /** Telemetry calls in last 30d */
  telemetryUsageLast30d: number;
  featureFlagRemoved: boolean;
  codeDeleted: boolean;
  onlyCanonicalCommandsRemain: boolean;
}

export function assessPlannerLegacyItemRetirement(item: PlannerLegacyItem): {
  itemId: string;
  canRetire: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (item.telemetryUsageLast30d > 0)
    blockers.push(`Telemetry still active: ${item.telemetryUsageLast30d} uses in 30d`);
  if (!item.featureFlagRemoved) blockers.push("Feature flag not removed");
  if (!item.codeDeleted) blockers.push("Dead code not deleted");
  if (!item.onlyCanonicalCommandsRemain) blockers.push("Non-canonical commands still present");
  return { itemId: item.itemId, canRetire: blockers.length === 0, blockers };
}

export function buildPlannerRetirementSummary(items: PlannerLegacyItem[]): {
  total: number;
  readyToRetire: number;
  blocked: number;
  allClear: boolean;
} {
  const assessments = items.map(assessPlannerLegacyItemRetirement);
  const readyToRetire = assessments.filter(a => a.canRetire).length;
  const blocked = assessments.filter(a => !a.canRetire).length;
  return { total: items.length, readyToRetire, blocked, allClear: blocked === 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE-601 — Add route metrics and alerting
// ─────────────────────────────────────────────────────────────────────────────

export type RouteAlertType =
  | "calculation_error"
  | "provider_latency_high"
  | "provider_cost_high"
  | "override_rate_high"
  | "unresolved_conflict"
  | "stale_legs"
  | "last_recompute_overdue";

export interface RouteMetrics {
  orgId: string;
  tourId: string;
  calculationErrorRate: number;    // errors per 100 calls
  providerLatencyP95Ms: number;
  providerCostPerCall: number;     // minor units
  overrideRatePct: number;         // % of legs with manual overrides
  unresolvedConflictCount: number;
  staleLegCount: number;           // legs not recomputed in threshold window
  lastSuccessfulRecomputeAt: string; // ISO
}

export interface RouteAlertThresholds {
  maxCalculationErrorRate: number;
  maxProviderLatencyP95Ms: number;
  maxProviderCostPerCall: number;
  maxOverrideRatePct: number;
  maxUnresolvedConflicts: number;
  maxStaleLegCount: number;
  /** Max minutes since last successful recompute */
  maxMinutesSinceRecompute: number;
}

export interface RouteAlert {
  alertType: RouteAlertType;
  tourId: string;
  orgId: string;
  message: string;
  severity: "warning" | "critical";
}

export function evaluateRouteMetrics(
  metrics: RouteMetrics,
  thresholds: RouteAlertThresholds,
  nowIso: string,
): RouteAlert[] {
  const alerts: RouteAlert[] = [];
  const base = { tourId: metrics.tourId, orgId: metrics.orgId };

  if (metrics.calculationErrorRate > thresholds.maxCalculationErrorRate)
    alerts.push({ ...base, alertType: "calculation_error", severity: "critical", message: `Error rate ${metrics.calculationErrorRate}/100 > max ${thresholds.maxCalculationErrorRate}/100` });

  if (metrics.providerLatencyP95Ms > thresholds.maxProviderLatencyP95Ms)
    alerts.push({ ...base, alertType: "provider_latency_high", severity: "warning", message: `Provider p95 ${metrics.providerLatencyP95Ms}ms > max ${thresholds.maxProviderLatencyP95Ms}ms` });

  if (metrics.providerCostPerCall > thresholds.maxProviderCostPerCall)
    alerts.push({ ...base, alertType: "provider_cost_high", severity: "warning", message: `Provider cost ${metrics.providerCostPerCall} > max ${thresholds.maxProviderCostPerCall}` });

  if (metrics.overrideRatePct > thresholds.maxOverrideRatePct)
    alerts.push({ ...base, alertType: "override_rate_high", severity: "warning", message: `Override rate ${metrics.overrideRatePct}% > max ${thresholds.maxOverrideRatePct}%` });

  if (metrics.unresolvedConflictCount > thresholds.maxUnresolvedConflicts)
    alerts.push({ ...base, alertType: "unresolved_conflict", severity: "critical", message: `${metrics.unresolvedConflictCount} unresolved conflict(s)` });

  if (metrics.staleLegCount > thresholds.maxStaleLegCount)
    alerts.push({ ...base, alertType: "stale_legs", severity: "warning", message: `${metrics.staleLegCount} stale leg(s)` });

  const minutesSinceRecompute =
    (new Date(nowIso).getTime() - new Date(metrics.lastSuccessfulRecomputeAt).getTime()) / 60000;
  if (minutesSinceRecompute > thresholds.maxMinutesSinceRecompute)
    alerts.push({ ...base, alertType: "last_recompute_overdue", severity: "warning", message: `Last recompute ${Math.floor(minutesSinceRecompute)}m ago > max ${thresholds.maxMinutesSinceRecompute}m` });

  return alerts;
}
