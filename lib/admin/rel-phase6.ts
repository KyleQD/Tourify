/**
 * rel-phase6.ts
 * Phase 6 — QA, Observability, Migrations, and Deployment
 * Tasks: REL-601..611
 *
 * Pure domain logic — no Supabase imports.
 */

// ─── Shared ───────────────────────────────────────────────────────────────────

export type BudgetStatus = "within_budget" | "at_risk" | "exceeded";

// ─── REL-601: Performance budgets ────────────────────────────────────────────

export interface PerformanceBudgetTarget {
  metric: string; // e.g. "api_p95_ms", "page_lcp_ms", "bundle_kb"
  p50?: number;
  p95?: number;
  maxValue?: number;
  unit: string;
}

export interface PerformanceBudgetMeasurement {
  metric: string;
  p50?: number;
  p95?: number;
  measuredValue?: number;
  unit: string;
  measuredAt: string;
}

export interface PerformanceBudgetResult {
  metric: string;
  target: PerformanceBudgetTarget;
  measurement: PerformanceBudgetMeasurement;
  status: BudgetStatus;
  violations: string[];
}

export function evaluatePerformanceBudget(
  target: PerformanceBudgetTarget,
  measurement: PerformanceBudgetMeasurement
): PerformanceBudgetResult {
  const violations: string[] = [];
  if (target.p50 !== undefined && measurement.p50 !== undefined && measurement.p50 > target.p50)
    violations.push(`p50 ${measurement.p50}${target.unit} exceeds budget ${target.p50}${target.unit}`);
  if (target.p95 !== undefined && measurement.p95 !== undefined && measurement.p95 > target.p95)
    violations.push(`p95 ${measurement.p95}${target.unit} exceeds budget ${target.p95}${target.unit}`);
  if (target.maxValue !== undefined && measurement.measuredValue !== undefined && measurement.measuredValue > target.maxValue)
    violations.push(`${measurement.measuredValue}${target.unit} exceeds max ${target.maxValue}${target.unit}`);
  const status: BudgetStatus =
    violations.length === 0
      ? "within_budget"
      : violations.some((v) => v.includes("p95") || v.includes("max"))
      ? "exceeded"
      : "at_risk";
  return { metric: target.metric, target, measurement, status, violations };
}

// ─── REL-602: Refactor high-fanout pages ─────────────────────────────────────

export interface FanoutPageAudit {
  pageName: string;
  requestCountBefore: number;
  requestCountAfter: number;
  bundleKbBefore: number;
  bundleKbAfter: number;
  usesBff: boolean;
  usesDegradedState: boolean;
  meetsRequestBudget: boolean;
  meetsBundleBudget: boolean;
}

export function auditFanoutPage(input: {
  pageName: string;
  requestCountBefore: number;
  requestCountAfter: number;
  bundleKbBefore: number;
  bundleKbAfter: number;
  usesBff: boolean;
  usesDegradedState: boolean;
  requestBudget: number;
  bundleBudgetKb: number;
}): FanoutPageAudit {
  return {
    pageName: input.pageName,
    requestCountBefore: input.requestCountBefore,
    requestCountAfter: input.requestCountAfter,
    bundleKbBefore: input.bundleKbBefore,
    bundleKbAfter: input.bundleKbAfter,
    usesBff: input.usesBff,
    usesDegradedState: input.usesDegradedState,
    meetsRequestBudget: input.requestCountAfter <= input.requestBudget,
    meetsBundleBudget: input.bundleKbAfter <= input.bundleBudgetKb,
  };
}

// ─── REL-603: WCAG 2.2 AA review ─────────────────────────────────────────────

export type WcagCheckType =
  | "automated_scan"
  | "keyboard_navigation"
  | "screen_reader"
  | "focus_management"
  | "color_contrast"
  | "zoom_200pct"
  | "error_identification"
  | "table_headers"
  | "dialog_accessibility"
  | "mobile_touch";

export interface WcagCheckResult {
  checkType: WcagCheckType;
  flow: string; // e.g. "admin_tour_list", "worker_day_sheet", "external_advance"
  passed: boolean;
  finding?: string;
  severity?: "blocker" | "minor";
}

export interface WcagReviewSummary {
  reviewedAt: string;
  checks: WcagCheckResult[];
  blockers: WcagCheckResult[];
  minors: WcagCheckResult[];
  passed: boolean;
}

export function buildWcagReviewSummary(
  checks: WcagCheckResult[],
  reviewedAt: string
): WcagReviewSummary {
  const blockers = checks.filter((c) => !c.passed && c.severity === "blocker");
  const minors = checks.filter((c) => !c.passed && c.severity === "minor");
  return { reviewedAt, checks, blockers, minors, passed: blockers.length === 0 };
}

// ─── REL-604: Production dashboards/alerts ───────────────────────────────────

export interface ProductionSlo {
  name: string;
  target: number; // e.g. 0.999 for 99.9%
  window: "1h" | "24h" | "7d" | "30d";
  owner: string;
  runbookUrl: string;
}

export interface ProductionAlertRule {
  alertId: string;
  sloName: string;
  condition: string; // human-readable
  severity: "page" | "ticket" | "info";
  owner: string;
  active: boolean;
}

export interface ProductionDashboard {
  dashboardId: string;
  slos: ProductionSlo[];
  alertRules: ProductionAlertRule[];
  createdAt: string;
  allSlosCovered: boolean;
  allAlertRulesActive: boolean;
}

export function buildProductionDashboard(
  dashboardId: string,
  slos: ProductionSlo[],
  alertRules: ProductionAlertRule[],
  createdAt: string
): ProductionDashboard {
  const allSlosCovered = slos.every((slo) =>
    alertRules.some((r) => r.sloName === slo.name && r.active)
  );
  const allAlertRulesActive = alertRules.every((r) => r.active);
  return { dashboardId, slos, alertRules, createdAt, allSlosCovered, allAlertRulesActive };
}

// ─── REL-605: Backup/restore exercise ────────────────────────────────────────

export interface BackupRestoreExercise {
  exerciseId: string;
  exercisedAt: string;
  rpoTargetMinutes: number;
  rtoTargetMinutes: number;
  actualRpoMinutes: number;
  actualRtoMinutes: number;
  relationalConsistencyVerified: boolean;
  fileConsistencyVerified: boolean;
  publicationConsistencyVerified: boolean;
  tenantIsolationVerified: boolean;
  passed: boolean;
  failures: string[];
}

export function evaluateBackupRestoreExercise(input: {
  exerciseId: string;
  exercisedAt: string;
  rpoTargetMinutes: number;
  rtoTargetMinutes: number;
  actualRpoMinutes: number;
  actualRtoMinutes: number;
  relationalConsistencyVerified: boolean;
  fileConsistencyVerified: boolean;
  publicationConsistencyVerified: boolean;
  tenantIsolationVerified: boolean;
}): BackupRestoreExercise {
  const failures: string[] = [];
  if (input.actualRpoMinutes > input.rpoTargetMinutes)
    failures.push(`RPO ${input.actualRpoMinutes}m exceeds target ${input.rpoTargetMinutes}m`);
  if (input.actualRtoMinutes > input.rtoTargetMinutes)
    failures.push(`RTO ${input.actualRtoMinutes}m exceeds target ${input.rtoTargetMinutes}m`);
  if (!input.relationalConsistencyVerified) failures.push("Relational consistency not verified");
  if (!input.fileConsistencyVerified) failures.push("File consistency not verified");
  if (!input.publicationConsistencyVerified) failures.push("Publication consistency not verified");
  if (!input.tenantIsolationVerified) failures.push("Tenant isolation not verified");
  return { ...input, passed: failures.length === 0, failures };
}

// ─── REL-606: Migration rollback/forward-fix exercise ────────────────────────

export interface MigrationRollbackExercise {
  exerciseId: string;
  exercisedAt: string;
  migrationId: string;
  rollbackSucceeded: boolean;
  tenantIsolationMaintained: boolean;
  noLostRecords: boolean;
  noDuplicateSideEffects: boolean;
  forwardFixRehearsal: boolean;
  passed: boolean;
  issues: string[];
}

export function evaluateMigrationRollback(input: {
  exerciseId: string;
  exercisedAt: string;
  migrationId: string;
  rollbackSucceeded: boolean;
  tenantIsolationMaintained: boolean;
  noLostRecords: boolean;
  noDuplicateSideEffects: boolean;
  forwardFixRehearsal: boolean;
}): MigrationRollbackExercise {
  const issues: string[] = [];
  if (!input.rollbackSucceeded) issues.push("Rollback did not succeed");
  if (!input.tenantIsolationMaintained) issues.push("Tenant isolation not maintained");
  if (!input.noLostRecords) issues.push("Records were lost");
  if (!input.noDuplicateSideEffects) issues.push("Duplicate side effects detected");
  if (!input.forwardFixRehearsal) issues.push("Forward-fix not rehearsed");
  return { ...input, passed: issues.length === 0, issues };
}

// ─── REL-607: Security review / penetration test ─────────────────────────────

export type PenTestFindingCategory =
  | "idor_rls"
  | "privilege_escalation"
  | "token_leakage"
  | "bulk_export_bypass"
  | "race_condition"
  | "webhook_replay"
  | "stored_file_access"
  | "injection";

export type PenTestFindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface PenTestFinding {
  id: string;
  category: PenTestFindingCategory;
  severity: PenTestFindingSeverity;
  description: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface PenTestReport {
  reportId: string;
  reviewedAt: string;
  findings: PenTestFinding[];
  openCriticalOrHigh: PenTestFinding[];
  meetsReleasePolicy: boolean; // all critical/high resolved
}

export function buildPenTestReport(
  reportId: string,
  findings: PenTestFinding[],
  reviewedAt: string
): PenTestReport {
  const openCriticalOrHigh = findings.filter(
    (f) => !f.resolved && (f.severity === "critical" || f.severity === "high")
  );
  return {
    reportId,
    reviewedAt,
    findings,
    openCriticalOrHigh,
    meetsReleasePolicy: openCriticalOrHigh.length === 0,
  };
}

// ─── REL-608: Load/soak/fault tests ──────────────────────────────────────────

export type LoadTestScenario =
  | "portfolio_scale"
  | "command_center"
  | "publication_fanout"
  | "ticket_scanning"
  | "notifications"
  | "exports"
  | "provider_degradation"
  | "database_degradation";

export interface LoadTestResult {
  scenario: LoadTestScenario;
  passedSlo: boolean;
  passedRecovery: boolean;
  details: string;
}

export function summarizeLoadTests(results: LoadTestResult[]): {
  allPassed: boolean;
  failedScenarios: LoadTestScenario[];
} {
  const failed = results.filter((r) => !r.passedSlo || !r.passedRecovery).map((r) => r.scenario);
  return { allPassed: failed.length === 0, failedScenarios: failed };
}

// ─── REL-609: Operational runbooks ───────────────────────────────────────────

export type RunbookTopic =
  | "auth_context"
  | "migration"
  | "rls_failure"
  | "publication_backlog"
  | "provider_outage"
  | "ticket_scan_failure"
  | "data_mismatch"
  | "compromised_token"
  | "privacy_security_incident"
  | "rollback";

export interface OperationalRunbook {
  topic: RunbookTopic;
  title: string;
  owner: string;
  lastTestedAt: string;
  steps: string[];
  escalationPath: string;
}

export function validateRunbook(runbook: OperationalRunbook): string[] {
  const errors: string[] = [];
  if (runbook.steps.length === 0) errors.push("Runbook has no steps");
  if (!runbook.owner) errors.push("Runbook has no owner");
  if (!runbook.escalationPath) errors.push("Runbook has no escalation path");
  return errors;
}

// ─── REL-610: Pilot and GA checklist ─────────────────────────────────────────

export interface GaChecklistItem {
  id: string;
  category:
    | "design_partners"
    | "data_migration"
    | "feature_flags"
    | "support_training"
    | "monitoring"
    | "rollback_threshold"
    | "incident_staffing"
    | "release_notes"
    | "legacy_cutoff";
  description: string;
  signedOffBy?: string;
  signedOffAt?: string;
  complete: boolean;
}

export function computeGaReadiness(items: GaChecklistItem[]): {
  ready: boolean;
  pendingItems: GaChecklistItem[];
  signedOffCount: number;
} {
  const pendingItems = items.filter((i) => !i.complete);
  return {
    ready: pendingItems.length === 0,
    pendingItems,
    signedOffCount: items.filter((i) => i.complete).length,
  };
}

// ─── REL-611: Delete dead/legacy code ────────────────────────────────────────

export interface LegacyCodeItem {
  path: string;
  description: string;
  telemetryUsage: number; // calls/requests in last 30 days
  reconciledSafe: boolean; // comparison showed safe to remove
  removed: boolean;
}

export function identifyLegacyCodeToRemove(items: LegacyCodeItem[]): {
  safeToRemove: LegacyCodeItem[];
  blocked: LegacyCodeItem[];
} {
  const safeToRemove = items.filter(
    (i) => !i.removed && i.telemetryUsage === 0 && i.reconciledSafe
  );
  const blocked = items.filter(
    (i) => !i.removed && (i.telemetryUsage > 0 || !i.reconciledSafe)
  );
  return { safeToRemove, blocked };
}
