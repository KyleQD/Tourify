/**
 * tour-phase6.ts — TOUR-601..604
 *
 * Phase 6 tour portfolio: read-model caching, performance budgets,
 * E2E lifecycle suite model, and legacy retirement.
 *
 * Pure domain logic only. No Supabase imports. No mocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TOUR-601 — Materialize/cache summary read model
// ─────────────────────────────────────────────────────────────────────────────

export type TourSummaryAccessClass = "admin" | "collaborator" | "public";

export interface TourSummaryCacheKey {
  orgId: string;
  tourId: string;
  accessClass: TourSummaryAccessClass;
  /** Monotonic version from tour_summary events */
  version: number;
}

export interface TourSummaryCacheEntry {
  key: TourSummaryCacheKey;
  builtAt: string; // ISO
  freshnessSloBreach: boolean;
  /** True if this entry was produced by a fallback full-rebuild */
  isFallbackRebuild: boolean;
}

/** Build the deterministic cache key string used for lookup. */
export function buildTourSummaryCacheKeyString(key: TourSummaryCacheKey): string {
  return `tour_summary:${key.orgId}:${key.tourId}:${key.accessClass}:v${key.version}`;
}

/**
 * Evaluate whether the cached entry is within the SLO freshness window.
 * @param maxAgeSeconds Maximum permitted age before it's considered breached
 */
export function evaluateCacheEntryFreshness(
  entry: TourSummaryCacheEntry,
  nowIso: string,
  maxAgeSeconds: number,
): { fresh: boolean; ageSeconds: number } {
  const ageMs = new Date(nowIso).getTime() - new Date(entry.builtAt).getTime();
  const ageSeconds = ageMs / 1000;
  return { fresh: ageSeconds <= maxAgeSeconds, ageSeconds };
}

/**
 * Determine whether a rebuild is required.
 * Rebuilds are needed when: no cache entry exists, entry is stale, or version
 * is behind the expected version.
 */
export function shouldRebuildTourSummary(input: {
  cachedEntry: TourSummaryCacheEntry | null;
  expectedVersion: number;
  nowIso: string;
  maxAgeSeconds: number;
}): { rebuild: boolean; reason: string } {
  if (!input.cachedEntry) return { rebuild: true, reason: "no_cache_entry" };

  const { fresh } = evaluateCacheEntryFreshness(input.cachedEntry, input.nowIso, input.maxAgeSeconds);
  if (!fresh) return { rebuild: true, reason: "entry_stale" };

  if (input.cachedEntry.key.version < input.expectedVersion) {
    return { rebuild: true, reason: "version_behind" };
  }

  return { rebuild: false, reason: "cache_valid" };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUR-602 — Establish portfolio performance budget
// ─────────────────────────────────────────────────────────────────────────────

export interface PortfolioPerformanceBudget {
  queryP50Ms: number;
  queryP95Ms: number;
  renderP95Ms: number;
  interactionP95Ms: number;
  bundleKb: number;
  /** Test dataset size used to establish the budget */
  datasetSize: 500 | 5000;
}

export interface PortfolioPerformanceMeasurement {
  queryP50Ms: number;
  queryP95Ms: number;
  renderP95Ms: number;
  interactionP95Ms: number;
  bundleKb: number;
  datasetSize: number;
  measuredAt: string;
}

export interface PortfolioBudgetResult {
  passes: boolean;
  violations: string[];
  datasetSize: number;
}

export function evaluatePortfolioBudget(
  budget: PortfolioPerformanceBudget,
  measurement: PortfolioPerformanceMeasurement,
): PortfolioBudgetResult {
  const violations: string[] = [];
  if (measurement.queryP50Ms > budget.queryP50Ms)
    violations.push(`queryP50 ${measurement.queryP50Ms}ms > budget ${budget.queryP50Ms}ms`);
  if (measurement.queryP95Ms > budget.queryP95Ms)
    violations.push(`queryP95 ${measurement.queryP95Ms}ms > budget ${budget.queryP95Ms}ms`);
  if (measurement.renderP95Ms > budget.renderP95Ms)
    violations.push(`renderP95 ${measurement.renderP95Ms}ms > budget ${budget.renderP95Ms}ms`);
  if (measurement.interactionP95Ms > budget.interactionP95Ms)
    violations.push(`interactionP95 ${measurement.interactionP95Ms}ms > budget ${budget.interactionP95Ms}ms`);
  if (measurement.bundleKb > budget.bundleKb)
    violations.push(`bundle ${measurement.bundleKb}KB > budget ${budget.bundleKb}KB`);
  return { passes: violations.length === 0, violations, datasetSize: measurement.datasetSize };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUR-603 — Complete lifecycle E2E suite model
// ─────────────────────────────────────────────────────────────────────────────

export type TourLifecycleE2EScenario =
  | "create_through_settled"
  | "create_through_archived"
  | "role_variants"
  | "concurrent_editors"
  | "failed_dependencies"
  | "cancellation"
  | "rollback";

export type TourLifecycleE2EStatus = "pending" | "passing" | "failing" | "skipped";

export interface TourLifecycleE2ESuiteEntry {
  scenario: TourLifecycleE2EScenario;
  status: TourLifecycleE2EStatus;
  lastRunAt?: string;
  failureReason?: string;
}

export interface TourLifecycleE2ESuiteResult {
  entries: TourLifecycleE2ESuiteEntry[];
  allPassing: boolean;
  failing: TourLifecycleE2ESuiteEntry[];
  pending: TourLifecycleE2ESuiteEntry[];
  coverageComplete: boolean;
}

const REQUIRED_SCENARIOS: TourLifecycleE2EScenario[] = [
  "create_through_settled",
  "create_through_archived",
  "role_variants",
  "concurrent_editors",
  "failed_dependencies",
  "cancellation",
  "rollback",
];

export function evaluateTourLifecycleE2ESuite(
  entries: TourLifecycleE2ESuiteEntry[],
): TourLifecycleE2ESuiteResult {
  const failing = entries.filter(e => e.status === "failing");
  const pending = entries.filter(e => e.status === "pending");
  const allPassing = failing.length === 0 && pending.length === 0;
  const coveredScenarios = new Set(entries.map(e => e.scenario));
  const coverageComplete = REQUIRED_SCENARIOS.every(s => coveredScenarios.has(s));
  return { entries, allPassing, failing, pending, coverageComplete };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUR-604 — Retire legacy tour UI/API paths
// ─────────────────────────────────────────────────────────────────────────────

export interface TourLegacyPathItem {
  pathId: string;
  pathType: "api_route" | "ui_page" | "policy" | "code_module" | "feature_flag";
  identifier: string;
  telemetryUsageLast30d: number;
  compatibilityReadsReconciled: boolean;
  flagRemoved: boolean;
  codeDeleted: boolean;
  migrationReportApproved: boolean;
}

export interface TourLegacyRetirementReadiness {
  pathId: string;
  canRetire: boolean;
  blockers: string[];
}

export function assessTourLegacyPathRetirement(
  item: TourLegacyPathItem,
): TourLegacyRetirementReadiness {
  const blockers: string[] = [];
  if (item.telemetryUsageLast30d > 0)
    blockers.push(`Usage telemetry: ${item.telemetryUsageLast30d} calls in last 30d`);
  if (!item.compatibilityReadsReconciled)
    blockers.push("Compatibility reads not reconciled");
  if (!item.flagRemoved)
    blockers.push("Feature flag not removed");
  if (!item.codeDeleted)
    blockers.push("Code not deleted");
  if (!item.migrationReportApproved)
    blockers.push("Migration report not approved");
  return { pathId: item.pathId, canRetire: blockers.length === 0, blockers };
}

export function buildTourRetirementSummary(items: TourLegacyPathItem[]): {
  total: number;
  readyToRetire: number;
  blocked: number;
  allClear: boolean;
} {
  const assessments = items.map(assessTourLegacyPathRetirement);
  const readyToRetire = assessments.filter(a => a.canRetire).length;
  const blocked = assessments.filter(a => !a.canRetire).length;
  return { total: items.length, readyToRetire, blocked, allClear: blocked === 0 };
}
