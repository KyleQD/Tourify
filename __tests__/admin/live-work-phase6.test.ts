import { describe, it, expect } from "vitest"
import {
  evaluateLiveOpsMetrics,
  createAttendanceEntry,
  approvePayrollExport,
  markPayrollExported,
  supersedePreviousExport,
  evaluateWorkforceSlo,
  evaluateWorkforceMigration,
  type LiveOpsObservabilityMetrics,
  type LiveOpsAlertThresholds,
  type PayrollExportRecord,
  type WorkforceSloMetrics,
  type WorkforceSloThresholds,
  type WorkforceMigrationStatus,
} from "@/lib/admin/live-work-phase6"

// ── LIVE-601: Operational observability ──────────────────────────────────────

describe("LIVE-601 – evaluateLiveOpsMetrics", () => {
  const healthyMetrics = (): LiveOpsObservabilityMetrics => ({
    orgId: "o1", eventId: "ev-1",
    realtimeFailureCount: 0, staleClientCount: 0, notificationBacklogCount: 0,
    overdueCriticalTaskCount: 0, missingAcknowledgementCount: 0,
    checkInAnomalyCount: 0, unresolvedHighSeverityIncidents: 0,
  })

  const thresholds: LiveOpsAlertThresholds = {
    maxRealtimeFailures: 0, maxStaleClients: 5, maxNotificationBacklog: 10,
    maxOverdueCriticalTasks: 0, maxMissingAcknowledgements: 5,
    maxCheckInAnomalies: 3, maxUnresolvedHighSeverityIncidents: 0,
  }

  it("no alerts for healthy event", () => {
    expect(evaluateLiveOpsMetrics(healthyMetrics(), thresholds)).toHaveLength(0)
  })

  it("critical alert on realtime failure", () => {
    const alerts = evaluateLiveOpsMetrics({ ...healthyMetrics(), realtimeFailureCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "realtime_failure" && a.severity === "critical")).toBe(true)
  })

  it("critical alert on overdue critical task", () => {
    const alerts = evaluateLiveOpsMetrics({ ...healthyMetrics(), overdueCriticalTaskCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "overdue_critical_task" && a.severity === "critical")).toBe(true)
  })

  it("critical alert on unresolved high-severity incident", () => {
    const alerts = evaluateLiveOpsMetrics({ ...healthyMetrics(), unresolvedHighSeverityIncidents: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "unresolved_high_severity_incident" && a.severity === "critical")).toBe(true)
  })

  it("warning on stale clients over threshold", () => {
    const alerts = evaluateLiveOpsMetrics({ ...healthyMetrics(), staleClientCount: 6 }, thresholds)
    expect(alerts.some(a => a.alertType === "stale_client" && a.severity === "warning")).toBe(true)
  })

  it("warning on check-in anomalies", () => {
    const alerts = evaluateLiveOpsMetrics({ ...healthyMetrics(), checkInAnomalyCount: 4 }, thresholds)
    expect(alerts.some(a => a.alertType === "check_in_anomaly")).toBe(true)
  })
})

// ── WORK-601: Attendance and actual time ──────────────────────────────────────

describe("WORK-601 – createAttendanceEntry", () => {
  const base = {
    entryId: "e1", shiftId: "sh1", workerId: "w1", eventId: "ev1", orgId: "o1",
    recordedAt: "2026-06-01T20:00:00Z", source: "online" as const,
  }

  it("creates check_in entry successfully", () => {
    const r = createAttendanceEntry({ ...base, entryType: "check_in" })
    expect(r).not.toHaveProperty("error")
    const entry = r as ReturnType<typeof createAttendanceEntry> & { auditEntry: string }
    expect((entry as { auditEntry: string }).auditEntry).toMatch(/attendance/)
  })

  it("rejects manual_correction without correctionReason", () => {
    const r = createAttendanceEntry({ ...base, entryType: "manual_correction" })
    expect(r).toHaveProperty("error")
    expect((r as { error: string }).error).toMatch(/correctionReason/)
  })

  it("rejects manual_correction without approvedBy", () => {
    const r = createAttendanceEntry({ ...base, entryType: "manual_correction", correctionReason: "Wrong time" })
    expect(r).toHaveProperty("error")
    expect((r as { error: string }).error).toMatch(/approvedBy/)
  })

  it("creates manual_correction with both reason and approver", () => {
    const r = createAttendanceEntry({ ...base, entryType: "manual_correction", correctionReason: "System clock skew", approvedBy: "mgr-1" })
    expect(r).not.toHaveProperty("error")
  })
})

// ── WORK-602: Payroll/time export ─────────────────────────────────────────────

describe("WORK-602 – payroll export lifecycle", () => {
  const pendingExport = (): PayrollExportRecord => ({
    exportId: "exp-1", orgId: "o1", period: "2026-06", schemaVersion: "1.0.0",
    status: "pending", totalHours: 200, totalCostMinorUnits: 1500000, currency: "USD",
    workerCount: 10, idempotencyKey: "idem-1",
  })

  it("approvePayrollExport transitions to approved", () => {
    const r = approvePayrollExport(pendingExport(), "mgr-1", "2026-07-01T00:00:00Z")
    expect(r).not.toHaveProperty("error")
    expect((r as PayrollExportRecord).status).toBe("approved")
  })

  it("approvePayrollExport rejects non-pending records", () => {
    const r = approvePayrollExport({ ...pendingExport(), status: "exported" }, "mgr", "2026-07-01T00:00:00Z")
    expect(r).toHaveProperty("error")
  })

  it("markPayrollExported transitions approved to exported", () => {
    const approved = approvePayrollExport(pendingExport(), "mgr-1", "2026-07-01T00:00:00Z") as PayrollExportRecord
    const r = markPayrollExported(approved, "2026-07-02T00:00:00Z")
    expect((r as PayrollExportRecord).status).toBe("exported")
  })

  it("markPayrollExported rejects non-approved records", () => {
    const r = markPayrollExported(pendingExport(), "2026-07-02T00:00:00Z")
    expect(r).toHaveProperty("error")
  })

  it("supersedePreviousExport sets status=superseded", () => {
    const exported = markPayrollExported(approvePayrollExport(pendingExport(), "m", "2026-07-01T00:00:00Z") as PayrollExportRecord, "2026-07-02T00:00:00Z") as PayrollExportRecord
    const superseded = supersedePreviousExport(exported, "exp-2")
    expect(superseded.status).toBe("superseded")
  })
})

// ── WORK-603: Workforce SLO/alerts ────────────────────────────────────────────

describe("WORK-603 – evaluateWorkforceSlo", () => {
  const healthyMetrics = (): WorkforceSloMetrics => ({
    orgId: "o1", uncoveredCriticalRoleCount: 0, expiringCredentialCount: 0,
    overdueResponseCount: 0, overdueOnboardingCount: 0, notificationFailureCount: 0,
    conflictBacklogCount: 0, identitySyncFailureCount: 0,
  })

  const thresholds: WorkforceSloThresholds = {
    maxUncoveredCriticalRoles: 0, maxExpiringCredentials: 5, maxOverdueResponses: 10,
    maxOverdueOnboarding: 10, maxNotificationFailures: 0, maxConflictBacklog: 20,
    maxIdentitySyncFailures: 0,
  }

  it("no alerts for healthy workforce", () => {
    expect(evaluateWorkforceSlo(healthyMetrics(), thresholds)).toHaveLength(0)
  })

  it("critical on uncovered critical roles", () => {
    const alerts = evaluateWorkforceSlo({ ...healthyMetrics(), uncoveredCriticalRoleCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "uncovered_critical_role" && a.severity === "critical")).toBe(true)
  })

  it("critical on notification failure", () => {
    const alerts = evaluateWorkforceSlo({ ...healthyMetrics(), notificationFailureCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "notification_failure" && a.severity === "critical")).toBe(true)
  })

  it("critical on identity sync failure", () => {
    const alerts = evaluateWorkforceSlo({ ...healthyMetrics(), identitySyncFailureCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "identity_sync_failure" && a.severity === "critical")).toBe(true)
  })

  it("warning on expiring credentials", () => {
    const alerts = evaluateWorkforceSlo({ ...healthyMetrics(), expiringCredentialCount: 6 }, thresholds)
    expect(alerts.some(a => a.alertType === "expiring_credential" && a.severity === "warning")).toBe(true)
  })
})

// ── WORK-604: Migration and retire duplicates ─────────────────────────────────

describe("WORK-604 – evaluateWorkforceMigration", () => {
  const ready = (): WorkforceMigrationStatus => ({
    orgId: "o1", canonicalAssignmentCount: 100, legacyAssignmentCount: 100,
    reconciledCount: 100, unreconciledCount: 0, legacyWritesStopped: true,
    compatibilityViewsRemoved: true, codeRetired: true, retentionPlanApproved: true,
  })

  it("canRetire=true when all conditions met", () => {
    expect(evaluateWorkforceMigration(ready()).canRetire).toBe(true)
  })

  it("blocks on unreconciled assignments", () => {
    const r = evaluateWorkforceMigration({ ...ready(), unreconciledCount: 5 })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("5 unreconciled"))).toBe(true)
  })

  it("blocks when legacy writes not stopped", () => {
    expect(evaluateWorkforceMigration({ ...ready(), legacyWritesStopped: false }).canRetire).toBe(false)
  })

  it("blocks when compatibility views not removed", () => {
    expect(evaluateWorkforceMigration({ ...ready(), compatibilityViewsRemoved: false }).canRetire).toBe(false)
  })

  it("blocks when retention plan not approved", () => {
    expect(evaluateWorkforceMigration({ ...ready(), retentionPlanApproved: false }).canRetire).toBe(false)
  })
})
