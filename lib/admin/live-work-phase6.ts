/**
 * live-work-phase6.ts — LIVE-601, WORK-601..604
 *
 * Phase 6 live operations and workforce:
 *  LIVE-601: Operational observability alerts
 *  WORK-601: Attendance and actual time capture
 *  WORK-602: Payroll/time export
 *  WORK-603: Workforce SLO/alerts
 *  WORK-604: Migration and duplicate retirement
 *
 * Pure domain logic only. No Supabase imports. No mocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LIVE-601 — Operational observability
// ─────────────────────────────────────────────────────────────────────────────

export type LiveOpsAlertType =
  | "realtime_failure"
  | "stale_client"
  | "notification_backlog"
  | "overdue_critical_task"
  | "missing_acknowledgement"
  | "check_in_anomaly"
  | "unresolved_high_severity_incident";

export interface LiveOpsObservabilityMetrics {
  orgId: string;
  eventId: string;
  realtimeFailureCount: number;
  staleClientCount: number;
  notificationBacklogCount: number;
  overdueCriticalTaskCount: number;
  missingAcknowledgementCount: number;
  checkInAnomalyCount: number;
  unresolvedHighSeverityIncidents: number;
}

export interface LiveOpsAlertThresholds {
  maxRealtimeFailures: number;
  maxStaleClients: number;
  maxNotificationBacklog: number;
  maxOverdueCriticalTasks: number;
  maxMissingAcknowledgements: number;
  maxCheckInAnomalies: number;
  maxUnresolvedHighSeverityIncidents: number;
}

export interface LiveOpsAlert {
  alertType: LiveOpsAlertType;
  eventId: string;
  orgId: string;
  severity: "warning" | "critical";
  actual: number;
  threshold: number;
}

export function evaluateLiveOpsMetrics(
  metrics: LiveOpsObservabilityMetrics,
  thresholds: LiveOpsAlertThresholds,
): LiveOpsAlert[] {
  const alerts: LiveOpsAlert[] = [];
  const base = { eventId: metrics.eventId, orgId: metrics.orgId };

  const check = (
    alertType: LiveOpsAlertType,
    actual: number,
    threshold: number,
    severity: "warning" | "critical",
  ) => {
    if (actual > threshold) alerts.push({ ...base, alertType, severity, actual, threshold });
  };

  check("realtime_failure", metrics.realtimeFailureCount, thresholds.maxRealtimeFailures, "critical");
  check("stale_client", metrics.staleClientCount, thresholds.maxStaleClients, "warning");
  check("notification_backlog", metrics.notificationBacklogCount, thresholds.maxNotificationBacklog, "warning");
  check("overdue_critical_task", metrics.overdueCriticalTaskCount, thresholds.maxOverdueCriticalTasks, "critical");
  check("missing_acknowledgement", metrics.missingAcknowledgementCount, thresholds.maxMissingAcknowledgements, "warning");
  check("check_in_anomaly", metrics.checkInAnomalyCount, thresholds.maxCheckInAnomalies, "warning");
  check("unresolved_high_severity_incident", metrics.unresolvedHighSeverityIncidents, thresholds.maxUnresolvedHighSeverityIncidents, "critical");

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK-601 — Attendance and actual time capture
// ─────────────────────────────────────────────────────────────────────────────

export type AttendanceEntryType = "check_in" | "check_out" | "manual_correction";

export interface AttendanceEntry {
  entryId: string;
  shiftId: string;
  workerId: string;
  eventId: string;
  orgId: string;
  entryType: AttendanceEntryType;
  recordedAt: string;  // ISO — actual time
  /** Set for manual_correction — must have a reason */
  correctionReason?: string;
  approvedBy?: string;
  source: "online" | "offline_recovered";
  auditEntry: string;
}

export function createAttendanceEntry(input: {
  entryId: string;
  shiftId: string;
  workerId: string;
  eventId: string;
  orgId: string;
  entryType: AttendanceEntryType;
  recordedAt: string;
  correctionReason?: string;
  approvedBy?: string;
  source: "online" | "offline_recovered";
}): AttendanceEntry | { error: string } {
  if (input.entryType === "manual_correction" && !input.correctionReason) {
    return { error: "manual_correction requires correctionReason" };
  }
  if (input.entryType === "manual_correction" && !input.approvedBy) {
    return { error: "manual_correction requires approvedBy" };
  }
  return {
    ...input,
    auditEntry: `attendance:${input.entryId}:${input.entryType}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK-602 — Payroll/time export
// ─────────────────────────────────────────────────────────────────────────────

export type PayrollExportStatus = "pending" | "approved" | "exported" | "superseded";

export interface PayrollExportRecord {
  exportId: string;
  orgId: string;
  period: string;         // YYYY-MM
  schemaVersion: string;
  status: PayrollExportStatus;
  totalHours: number;
  totalCostMinorUnits: number;
  currency: string;
  workerCount: number;
  approvedBy?: string;
  approvedAt?: string;
  exportedAt?: string;
  /** Previous export for this period if superseded */
  supersedesExportId?: string;
  idempotencyKey: string;
}

export function approvePayrollExport(
  record: PayrollExportRecord,
  approvedBy: string,
  approvedAt: string,
): PayrollExportRecord | { error: string } {
  if (record.status !== "pending") return { error: `Cannot approve export in status ${record.status}` };
  return { ...record, status: "approved", approvedBy, approvedAt };
}

export function markPayrollExported(
  record: PayrollExportRecord,
  exportedAt: string,
): PayrollExportRecord | { error: string } {
  if (record.status !== "approved") return { error: `Cannot export record in status ${record.status}` };
  return { ...record, status: "exported", exportedAt };
}

export function supersedePreviousExport(
  previous: PayrollExportRecord,
  newExportId: string,
): PayrollExportRecord {
  return { ...previous, status: "superseded", supersedesExportId: newExportId };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK-603 — Workforce SLO/alerts
// ─────────────────────────────────────────────────────────────────────────────

export type WorkforceSloAlertType =
  | "uncovered_critical_role"
  | "expiring_credential"
  | "overdue_response"
  | "overdue_onboarding"
  | "notification_failure"
  | "conflict_backlog"
  | "identity_sync_failure";

export interface WorkforceSloMetrics {
  orgId: string;
  uncoveredCriticalRoleCount: number;
  expiringCredentialCount: number;
  overdueResponseCount: number;
  overdueOnboardingCount: number;
  notificationFailureCount: number;
  conflictBacklogCount: number;
  identitySyncFailureCount: number;
}

export interface WorkforceSloThresholds {
  maxUncoveredCriticalRoles: number;
  maxExpiringCredentials: number;
  maxOverdueResponses: number;
  maxOverdueOnboarding: number;
  maxNotificationFailures: number;
  maxConflictBacklog: number;
  maxIdentitySyncFailures: number;
}

export interface WorkforceSloAlert {
  alertType: WorkforceSloAlertType;
  orgId: string;
  severity: "warning" | "critical";
  actual: number;
}

export function evaluateWorkforceSlo(
  metrics: WorkforceSloMetrics,
  thresholds: WorkforceSloThresholds,
): WorkforceSloAlert[] {
  const alerts: WorkforceSloAlert[] = [];
  const add = (alertType: WorkforceSloAlertType, actual: number, threshold: number, severity: "warning" | "critical") => {
    if (actual > threshold) alerts.push({ alertType, orgId: metrics.orgId, severity, actual });
  };
  add("uncovered_critical_role", metrics.uncoveredCriticalRoleCount, thresholds.maxUncoveredCriticalRoles, "critical");
  add("expiring_credential", metrics.expiringCredentialCount, thresholds.maxExpiringCredentials, "warning");
  add("overdue_response", metrics.overdueResponseCount, thresholds.maxOverdueResponses, "warning");
  add("overdue_onboarding", metrics.overdueOnboardingCount, thresholds.maxOverdueOnboarding, "warning");
  add("notification_failure", metrics.notificationFailureCount, thresholds.maxNotificationFailures, "critical");
  add("conflict_backlog", metrics.conflictBacklogCount, thresholds.maxConflictBacklog, "warning");
  add("identity_sync_failure", metrics.identitySyncFailureCount, thresholds.maxIdentitySyncFailures, "critical");
  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK-604 — Migration and retire duplicates
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkforceMigrationStatus {
  orgId: string;
  canonicalAssignmentCount: number;
  legacyAssignmentCount: number;
  reconciledCount: number;
  unreconciledCount: number;
  legacyWritesStopped: boolean;
  compatibilityViewsRemoved: boolean;
  codeRetired: boolean;
  retentionPlanApproved: boolean;
}

export function evaluateWorkforceMigration(status: WorkforceMigrationStatus): {
  canRetire: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (status.unreconciledCount > 0)
    blockers.push(`${status.unreconciledCount} unreconciled assignment(s)`);
  if (!status.legacyWritesStopped) blockers.push("Legacy writes not stopped");
  if (!status.compatibilityViewsRemoved) blockers.push("Compatibility views not removed");
  if (!status.codeRetired) blockers.push("Legacy code not retired");
  if (!status.retentionPlanApproved) blockers.push("Retention plan not approved");
  return { canRetire: blockers.length === 0, blockers };
}
