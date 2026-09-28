/**
 * travel-log-phase6.ts — TRAVEL-601, TRAVEL-602, LOG-601, LOG-602, LOG-603
 *
 * Phase 6 travel/logistics:
 *  TRAVEL-601: Logistics SLO/alerts
 *  TRAVEL-602: Travel migration/reconciliation
 *  LOG-601: Logistics metrics
 *  LOG-602: Logistics operational alerts
 *  LOG-603: Logistics migration/retirement
 *
 * Pure domain logic only. No Supabase imports. No mocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TRAVEL-601 — Logistics SLO/alerts
// ─────────────────────────────────────────────────────────────────────────────

export type TravelSloAlertType =
  | "missing_next_72h_segments"
  | "missing_next_72h_rooms"
  | "capacity_conflict"
  | "stale_confirmation"
  | "delay_impact"
  | "import_failure"
  | "notification_failure";

export interface TravelSloMetrics {
  orgId: string;
  tourId: string;
  missingSegmentsNext72h: number;
  missingRoomsNext72h: number;
  capacityConflictCount: number;
  staleConfirmationCount: number;
  delayImpactCount: number;
  importFailureCount: number;
  notificationFailureCount: number;
}

export interface TravelSloThresholds {
  maxMissingSegmentsNext72h: number;
  maxMissingRoomsNext72h: number;
  maxCapacityConflicts: number;
  maxStaleConfirmations: number;
  maxDelayImpacts: number;
  maxImportFailures: number;
  maxNotificationFailures: number;
}

export interface TravelSloAlert {
  alertType: TravelSloAlertType;
  tourId: string;
  orgId: string;
  severity: "warning" | "critical";
  actual: number;
}

export function evaluateTravelSlo(
  metrics: TravelSloMetrics,
  thresholds: TravelSloThresholds,
): TravelSloAlert[] {
  const alerts: TravelSloAlert[] = [];
  const base = { tourId: metrics.tourId, orgId: metrics.orgId };

  const add = (alertType: TravelSloAlertType, actual: number, threshold: number, severity: "warning" | "critical") => {
    if (actual > threshold) alerts.push({ ...base, alertType, severity, actual });
  };

  add("missing_next_72h_segments", metrics.missingSegmentsNext72h, thresholds.maxMissingSegmentsNext72h, "critical");
  add("missing_next_72h_rooms", metrics.missingRoomsNext72h, thresholds.maxMissingRoomsNext72h, "critical");
  add("capacity_conflict", metrics.capacityConflictCount, thresholds.maxCapacityConflicts, "critical");
  add("stale_confirmation", metrics.staleConfirmationCount, thresholds.maxStaleConfirmations, "warning");
  add("delay_impact", metrics.delayImpactCount, thresholds.maxDelayImpacts, "warning");
  add("import_failure", metrics.importFailureCount, thresholds.maxImportFailures, "critical");
  add("notification_failure", metrics.notificationFailureCount, thresholds.maxNotificationFailures, "critical");

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRAVEL-602 — Travel migration/reconciliation
// ─────────────────────────────────────────────────────────────────────────────

export interface TravelMigrationComparison {
  orgId: string;
  tourId: string;
  legacyFlightCount: number;
  canonicalFlightCount: number;
  legacyLodgingCount: number;
  canonicalLodgingCount: number;
  unscopedRecordCount: number;
  oldWritesPoliciesRetired: boolean;
  comparisonRunAt: string;
}

export function evaluateTravelMigration(comparison: TravelMigrationComparison): {
  reconciled: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (comparison.legacyFlightCount !== comparison.canonicalFlightCount)
    blockers.push(`Flight count mismatch: legacy=${comparison.legacyFlightCount} canonical=${comparison.canonicalFlightCount}`);
  if (comparison.legacyLodgingCount !== comparison.canonicalLodgingCount)
    blockers.push(`Lodging count mismatch: legacy=${comparison.legacyLodgingCount} canonical=${comparison.canonicalLodgingCount}`);
  if (comparison.unscopedRecordCount > 0)
    blockers.push(`${comparison.unscopedRecordCount} unscoped record(s) unresolved`);
  if (!comparison.oldWritesPoliciesRetired)
    blockers.push("Old write policies not retired");
  return { reconciled: blockers.length === 0, blockers };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG-601 — Logistics metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface LogisticsMetricsSnapshot {
  orgId: string;
  tourId: string;
  unresolvedCriticalTaskCount: number;
  lateTaskCount: number;
  blockedTaskCount: number;
  manifestCompletenessPercent: number;  // 0–100
  scanExceptionCount: number;
  mealCapacityViolations: number;
  roomCapacityViolations: number;
  equipmentCapacityViolations: number;
  lastFreshnessCheck: string; // ISO
}

export interface LogisticsMetricsThresholds {
  maxUnresolvedCriticalTasks: number;
  maxLateTasks: number;
  maxBlockedTasks: number;
  minManifestCompletenessPercent: number;
  maxScanExceptions: number;
  maxCapacityViolations: number;
}

export interface LogisticsMetricViolation {
  metric: string;
  actual: number;
  threshold: number;
  severity: "warning" | "critical";
}

export function evaluateLogisticsMetrics(
  snapshot: LogisticsMetricsSnapshot,
  thresholds: LogisticsMetricsThresholds,
): LogisticsMetricViolation[] {
  const violations: LogisticsMetricViolation[] = [];

  const check = (metric: string, actual: number, threshold: number, exceed: boolean, severity: "warning" | "critical") => {
    const violated = exceed ? actual > threshold : actual < threshold;
    if (violated) violations.push({ metric, actual, threshold, severity });
  };

  check("unresolved_critical_tasks", snapshot.unresolvedCriticalTaskCount, thresholds.maxUnresolvedCriticalTasks, true, "critical");
  check("late_tasks", snapshot.lateTaskCount, thresholds.maxLateTasks, true, "warning");
  check("blocked_tasks", snapshot.blockedTaskCount, thresholds.maxBlockedTasks, true, "warning");
  check("manifest_completeness_pct", snapshot.manifestCompletenessPercent, thresholds.minManifestCompletenessPercent, false, "warning");
  check("scan_exceptions", snapshot.scanExceptionCount, thresholds.maxScanExceptions, true, "warning");
  check("meal_capacity_violations", snapshot.mealCapacityViolations, thresholds.maxCapacityViolations, true, "critical");
  check("room_capacity_violations", snapshot.roomCapacityViolations, thresholds.maxCapacityViolations, true, "critical");
  check("equipment_capacity_violations", snapshot.equipmentCapacityViolations, thresholds.maxCapacityViolations, true, "warning");

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG-602 — Operational alerts
// ─────────────────────────────────────────────────────────────────────────────

export type LogisticsOperationalAlertType =
  | "missing_equipment_upcoming"
  | "late_equipment"
  | "unreturned_rental"
  | "meal_headcount_deadline"
  | "unresolved_map_approval"
  | "failed_publication";

export interface LogisticsOperationalAlert {
  alertType: LogisticsOperationalAlertType;
  tourId: string;
  orgId: string;
  responsibleOwner?: string;
  dueAt?: string;
  severity: "warning" | "critical";
}

export function buildLogisticsAlerts(input: {
  orgId: string;
  tourId: string;
  missingEquipmentCount: number;
  lateEquipmentCount: number;
  unreturnedRentalCount: number;
  mealHeadcountDeadlineBreached: boolean;
  unresolvedMapApprovalCount: number;
  failedPublicationCount: number;
}): LogisticsOperationalAlert[] {
  const alerts: LogisticsOperationalAlert[] = [];
  const base = { tourId: input.tourId, orgId: input.orgId };

  if (input.missingEquipmentCount > 0)
    alerts.push({ ...base, alertType: "missing_equipment_upcoming", severity: "critical" });
  if (input.lateEquipmentCount > 0)
    alerts.push({ ...base, alertType: "late_equipment", severity: "critical" });
  if (input.unreturnedRentalCount > 0)
    alerts.push({ ...base, alertType: "unreturned_rental", severity: "warning" });
  if (input.mealHeadcountDeadlineBreached)
    alerts.push({ ...base, alertType: "meal_headcount_deadline", severity: "warning" });
  if (input.unresolvedMapApprovalCount > 0)
    alerts.push({ ...base, alertType: "unresolved_map_approval", severity: "warning" });
  if (input.failedPublicationCount > 0)
    alerts.push({ ...base, alertType: "failed_publication", severity: "critical" });

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOG-603 — Logistics migration/retirement
// ─────────────────────────────────────────────────────────────────────────────

export interface LogisticsMigrationRecord {
  taskId: string;
  wasDomainFact: boolean;  // true = was a logistics task representing a domain record
  linkedToCanonical: boolean;
  historyPreserved: boolean;
  duplicateCategoryRemoved: boolean;
  oldWriteRetired: boolean;
}

export function evaluateLogisticsMigrationRecord(record: LogisticsMigrationRecord): {
  migrated: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (record.wasDomainFact && !record.linkedToCanonical) blockers.push("Not linked to canonical domain record");
  if (!record.historyPreserved) blockers.push("History not preserved");
  if (!record.duplicateCategoryRemoved) blockers.push("Duplicate category not removed");
  if (!record.oldWriteRetired) blockers.push("Old write path not retired");
  return { migrated: blockers.length === 0, blockers };
}

export function buildLogisticsMigrationSummary(records: LogisticsMigrationRecord[]): {
  total: number;
  migrated: number;
  pending: number;
  allMigrated: boolean;
} {
  const results = records.map(evaluateLogisticsMigrationRecord);
  const migrated = results.filter(r => r.migrated).length;
  return { total: records.length, migrated, pending: records.length - migrated, allMigrated: migrated === records.length };
}
