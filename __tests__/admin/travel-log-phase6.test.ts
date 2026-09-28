import { describe, it, expect } from "vitest"
import {
  evaluateTravelSlo,
  evaluateTravelMigration,
  evaluateLogisticsMetrics,
  buildLogisticsAlerts,
  evaluateLogisticsMigrationRecord,
  buildLogisticsMigrationSummary,
  type TravelSloMetrics,
  type TravelSloThresholds,
  type TravelMigrationComparison,
  type LogisticsMetricsSnapshot,
  type LogisticsMetricsThresholds,
  type LogisticsMigrationRecord,
} from "@/lib/admin/travel-log-phase6"

// ── TRAVEL-601: Logistics SLO/alerts ─────────────────────────────────────────

describe("TRAVEL-601 – evaluateTravelSlo", () => {
  const healthy = (): TravelSloMetrics => ({
    orgId: "o1", tourId: "t1",
    missingSegmentsNext72h: 0, missingRoomsNext72h: 0, capacityConflictCount: 0,
    staleConfirmationCount: 0, delayImpactCount: 0, importFailureCount: 0,
    notificationFailureCount: 0,
  })

  const thresholds: TravelSloThresholds = {
    maxMissingSegmentsNext72h: 0, maxMissingRoomsNext72h: 0, maxCapacityConflicts: 0,
    maxStaleConfirmations: 3, maxDelayImpacts: 5, maxImportFailures: 0,
    maxNotificationFailures: 0,
  }

  it("no alerts for healthy travel metrics", () => {
    expect(evaluateTravelSlo(healthy(), thresholds)).toHaveLength(0)
  })

  it("critical alert on missing 72h segments", () => {
    const alerts = evaluateTravelSlo({ ...healthy(), missingSegmentsNext72h: 2 }, thresholds)
    expect(alerts.some(a => a.alertType === "missing_next_72h_segments" && a.severity === "critical")).toBe(true)
  })

  it("critical alert on missing 72h rooms", () => {
    const alerts = evaluateTravelSlo({ ...healthy(), missingRoomsNext72h: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "missing_next_72h_rooms" && a.severity === "critical")).toBe(true)
  })

  it("critical alert on capacity conflict", () => {
    const alerts = evaluateTravelSlo({ ...healthy(), capacityConflictCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "capacity_conflict" && a.severity === "critical")).toBe(true)
  })

  it("warning on stale confirmations", () => {
    const alerts = evaluateTravelSlo({ ...healthy(), staleConfirmationCount: 5 }, thresholds)
    expect(alerts.some(a => a.alertType === "stale_confirmation" && a.severity === "warning")).toBe(true)
  })

  it("critical on import failure", () => {
    const alerts = evaluateTravelSlo({ ...healthy(), importFailureCount: 1 }, thresholds)
    expect(alerts.some(a => a.alertType === "import_failure" && a.severity === "critical")).toBe(true)
  })
})

// ── TRAVEL-602: Travel migration/reconciliation ───────────────────────────────

describe("TRAVEL-602 – evaluateTravelMigration", () => {
  const clean = (): TravelMigrationComparison => ({
    orgId: "o1", tourId: "t1",
    legacyFlightCount: 10, canonicalFlightCount: 10,
    legacyLodgingCount: 5, canonicalLodgingCount: 5,
    unscopedRecordCount: 0, oldWritesPoliciesRetired: true,
    comparisonRunAt: "2026-01-01T00:00:00Z",
  })

  it("reconciled=true when all match", () => {
    expect(evaluateTravelMigration(clean()).reconciled).toBe(true)
  })

  it("blocks on flight count mismatch", () => {
    const r = evaluateTravelMigration({ ...clean(), canonicalFlightCount: 9 })
    expect(r.reconciled).toBe(false)
    expect(r.blockers.some(b => b.includes("Flight count mismatch"))).toBe(true)
  })

  it("blocks on lodging count mismatch", () => {
    const r = evaluateTravelMigration({ ...clean(), canonicalLodgingCount: 4 })
    expect(r.reconciled).toBe(false)
  })

  it("blocks on unscoped records", () => {
    const r = evaluateTravelMigration({ ...clean(), unscopedRecordCount: 2 })
    expect(r.reconciled).toBe(false)
    expect(r.blockers.some(b => b.includes("unscoped"))).toBe(true)
  })

  it("blocks when old write policies not retired", () => {
    const r = evaluateTravelMigration({ ...clean(), oldWritesPoliciesRetired: false })
    expect(r.reconciled).toBe(false)
  })
})

// ── LOG-601: Logistics metrics ────────────────────────────────────────────────

describe("LOG-601 – evaluateLogisticsMetrics", () => {
  const healthy = (): LogisticsMetricsSnapshot => ({
    orgId: "o1", tourId: "t1",
    unresolvedCriticalTaskCount: 0, lateTaskCount: 0, blockedTaskCount: 0,
    manifestCompletenessPercent: 100, scanExceptionCount: 0,
    mealCapacityViolations: 0, roomCapacityViolations: 0, equipmentCapacityViolations: 0,
    lastFreshnessCheck: "2026-01-01T00:00:00Z",
  })

  const thresholds: LogisticsMetricsThresholds = {
    maxUnresolvedCriticalTasks: 0, maxLateTasks: 5, maxBlockedTasks: 10,
    minManifestCompletenessPercent: 90, maxScanExceptions: 3, maxCapacityViolations: 0,
  }

  it("no violations for healthy snapshot", () => {
    expect(evaluateLogisticsMetrics(healthy(), thresholds)).toHaveLength(0)
  })

  it("critical on unresolved critical tasks", () => {
    const v = evaluateLogisticsMetrics({ ...healthy(), unresolvedCriticalTaskCount: 1 }, thresholds)
    expect(v.some(x => x.metric === "unresolved_critical_tasks" && x.severity === "critical")).toBe(true)
  })

  it("warning on low manifest completeness", () => {
    const v = evaluateLogisticsMetrics({ ...healthy(), manifestCompletenessPercent: 80 }, thresholds)
    expect(v.some(x => x.metric === "manifest_completeness_pct")).toBe(true)
  })

  it("critical on meal capacity violations", () => {
    const v = evaluateLogisticsMetrics({ ...healthy(), mealCapacityViolations: 1 }, thresholds)
    expect(v.some(x => x.metric === "meal_capacity_violations" && x.severity === "critical")).toBe(true)
  })
})

// ── LOG-602: Operational alerts ───────────────────────────────────────────────

describe("LOG-602 – buildLogisticsAlerts", () => {
  const base = { orgId: "o1", tourId: "t1", missingEquipmentCount: 0, lateEquipmentCount: 0, unreturnedRentalCount: 0, mealHeadcountDeadlineBreached: false, unresolvedMapApprovalCount: 0, failedPublicationCount: 0 }

  it("returns empty array for clean state", () => {
    expect(buildLogisticsAlerts(base)).toHaveLength(0)
  })

  it("critical alert on missing equipment", () => {
    const alerts = buildLogisticsAlerts({ ...base, missingEquipmentCount: 1 })
    expect(alerts.some(a => a.alertType === "missing_equipment_upcoming" && a.severity === "critical")).toBe(true)
  })

  it("warning alert on unreturned rental", () => {
    const alerts = buildLogisticsAlerts({ ...base, unreturnedRentalCount: 2 })
    expect(alerts.some(a => a.alertType === "unreturned_rental" && a.severity === "warning")).toBe(true)
  })

  it("warning on meal headcount deadline breach", () => {
    const alerts = buildLogisticsAlerts({ ...base, mealHeadcountDeadlineBreached: true })
    expect(alerts.some(a => a.alertType === "meal_headcount_deadline")).toBe(true)
  })

  it("critical on failed publication", () => {
    const alerts = buildLogisticsAlerts({ ...base, failedPublicationCount: 1 })
    expect(alerts.some(a => a.alertType === "failed_publication" && a.severity === "critical")).toBe(true)
  })
})

// ── LOG-603: Migration/retirement ────────────────────────────────────────────

describe("LOG-603 – evaluateLogisticsMigrationRecord", () => {
  const ready = (): LogisticsMigrationRecord => ({
    taskId: "t1", wasDomainFact: true, linkedToCanonical: true,
    historyPreserved: true, duplicateCategoryRemoved: true, oldWriteRetired: true,
  })

  it("migrated=true when all conditions met", () => {
    expect(evaluateLogisticsMigrationRecord(ready()).migrated).toBe(true)
  })

  it("blocks when domain fact not linked to canonical", () => {
    const r = evaluateLogisticsMigrationRecord({ ...ready(), linkedToCanonical: false })
    expect(r.migrated).toBe(false)
  })

  it("blocks when history not preserved", () => {
    expect(evaluateLogisticsMigrationRecord({ ...ready(), historyPreserved: false }).migrated).toBe(false)
  })

  it("non-domain-fact skips canonical link check", () => {
    const r = evaluateLogisticsMigrationRecord({ ...ready(), wasDomainFact: false, linkedToCanonical: false })
    expect(r.migrated).toBe(true)
  })
})

describe("LOG-603 – buildLogisticsMigrationSummary", () => {
  const makeRecord = (id: string, ready: boolean): LogisticsMigrationRecord => ({
    taskId: id, wasDomainFact: true, linkedToCanonical: ready,
    historyPreserved: ready, duplicateCategoryRemoved: ready, oldWriteRetired: ready,
  })

  it("allMigrated=true when all records migrated", () => {
    const r = buildLogisticsMigrationSummary([makeRecord("a", true), makeRecord("b", true)])
    expect(r.allMigrated).toBe(true)
  })

  it("allMigrated=false with pending records", () => {
    const r = buildLogisticsMigrationSummary([makeRecord("a", true), makeRecord("b", false)])
    expect(r.allMigrated).toBe(false)
    expect(r.pending).toBe(1)
  })
})
