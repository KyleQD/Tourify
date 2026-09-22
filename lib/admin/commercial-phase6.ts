/**
 * commercial-phase6.ts
 * Phase 6 — Commercial operations observability and retirement
 * Tasks: TIX-601..603, FIN-601..604, VEND-601, CONT-601..602
 *
 * Pure domain logic — no Supabase imports.
 */

// ─── Shared primitives ───────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

export interface DomainAlert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: string;
  message: string;
  context: Record<string, unknown>;
  raisedAt: string; // ISO
  resolvedAt?: string;
  owner?: string;
}

// ─── TIX-601: Migrate/reconcile legacy ticketing data ────────────────────────

export interface TicketingReconciliationReport {
  orgId: string;
  eventId: string;
  legacyCount: number;
  canonicalCount: number;
  legacyFinancialTotal: number; // minor units
  canonicalFinancialTotal: number;
  currency: string;
  withinTolerance: boolean;
  tolerancePct: number;
  unresolvedRecords: Array<{ legacyId: string; reason: string }>;
  legacyWritesStoppedAt?: string; // ISO — feature flag cutover
  generatedAt: string;
}

export function buildTicketingReconciliationReport(input: {
  orgId: string;
  eventId: string;
  legacyCount: number;
  canonicalCount: number;
  legacyTotal: number;
  canonicalTotal: number;
  currency: string;
  tolerancePct: number;
  unresolvedRecords: Array<{ legacyId: string; reason: string }>;
  legacyWritesStoppedAt?: string;
  generatedAt: string;
}): TicketingReconciliationReport {
  const diff = Math.abs(input.legacyTotal - input.canonicalTotal);
  const base = Math.max(input.legacyTotal, 1);
  const withinTolerance =
    input.legacyCount === input.canonicalCount &&
    diff / base <= input.tolerancePct / 100;
  return {
    orgId: input.orgId,
    eventId: input.eventId,
    legacyCount: input.legacyCount,
    canonicalCount: input.canonicalCount,
    legacyFinancialTotal: input.legacyTotal,
    canonicalFinancialTotal: input.canonicalTotal,
    currency: input.currency,
    withinTolerance,
    tolerancePct: input.tolerancePct,
    unresolvedRecords: input.unresolvedRecords,
    legacyWritesStoppedAt: input.legacyWritesStoppedAt,
    generatedAt: input.generatedAt,
  };
}

// ─── TIX-602: Ticketing security/load review ─────────────────────────────────

export type TixSecurityCheckCategory =
  | "oversell_race"
  | "idor"
  | "promo_abuse"
  | "scanner_forgery_replay"
  | "offline_duplication"
  | "refund_privilege"
  | "webhook_attack"
  | "high_volume_scan_sale";

export interface TixSecurityCheckResult {
  category: TixSecurityCheckCategory;
  passed: boolean;
  finding?: string;
  severity?: AlertSeverity;
}

export interface TixSecurityReview {
  reviewId: string;
  reviewedAt: string;
  checks: TixSecurityCheckResult[];
  openFindings: TixSecurityCheckResult[];
  allCriticalClosed: boolean;
}

export function buildTixSecurityReview(
  reviewId: string,
  checks: TixSecurityCheckResult[],
  reviewedAt: string
): TixSecurityReview {
  const openFindings = checks.filter((c) => !c.passed);
  const allCriticalClosed = openFindings.every((c) => c.severity !== "critical");
  return { reviewId, reviewedAt, checks, openFindings, allCriticalClosed };
}

// ─── TIX-603: Retire old routes/tables/policies ───────────────────────────────

export interface TixRetirementStatus {
  legacyRouteUsage: number; // requests/hour from telemetry
  historicalReadsPreserved: boolean;
  permissivePoliciesAbsent: boolean;
  adminUiUsesCanonical: boolean;
  canRetire: boolean;
  blockers: string[];
}

export function evaluateTixRetirement(input: {
  legacyRouteUsage: number;
  historicalReadsPreserved: boolean;
  permissivePoliciesAbsent: boolean;
  adminUiUsesCanonical: boolean;
}): TixRetirementStatus {
  const blockers: string[] = [];
  if (input.legacyRouteUsage > 0)
    blockers.push(`Legacy route still receiving ${input.legacyRouteUsage} req/h`);
  if (!input.historicalReadsPreserved) blockers.push("Historical reads not preserved");
  if (!input.permissivePoliciesAbsent) blockers.push("Permissive policies still present");
  if (!input.adminUiUsesCanonical) blockers.push("Admin UI not fully on canonical model");
  return {
    ...input,
    canRetire: blockers.length === 0,
    blockers,
  };
}

// ─── FIN-601: Reconciliation jobs/dashboard ───────────────────────────────────

export type FinReconciliationMismatchStatus = "open" | "under_review" | "resolved";

export interface FinReconciliationMismatch {
  id: string;
  type: string; // e.g. "invoice_total", "fx_converted_amount"
  date: string;
  currency: string;
  eventId?: string;
  providerId?: string;
  sourceTotal: number; // minor units
  financeEntryTotal: number;
  variance: number;
  owner?: string;
  status: FinReconciliationMismatchStatus;
  evidence?: string;
  silentAdjustmentAllowed: false; // invariant — never silently adjust
}

export function createFinReconciliationMismatch(input: {
  id: string;
  type: string;
  date: string;
  currency: string;
  sourceTotal: number;
  financeEntryTotal: number;
  eventId?: string;
  providerId?: string;
}): FinReconciliationMismatch {
  return {
    ...input,
    variance: input.financeEntryTotal - input.sourceTotal,
    status: "open",
    silentAdjustmentAllowed: false,
  };
}

export function resolveFinMismatch(
  mismatch: FinReconciliationMismatch,
  owner: string,
  evidence: string
): FinReconciliationMismatch {
  return { ...mismatch, owner, evidence, status: "resolved" };
}

// ─── FIN-602: Accounting export adapter ──────────────────────────────────────

export interface AccountingExportLine {
  accountCode: string;
  vendorId?: string;
  projectId?: string;
  taxCode?: string;
  currency: string;
  amountMinorUnits: number;
  description: string;
  sourceReference: string; // stable canonical ID
}

export interface AccountingExportBatch {
  batchId: string;
  schemaVersion: string;
  orgId: string;
  period: string; // YYYY-MM
  generatedAt: string;
  externalReference?: string;
  status: "pending" | "exported" | "failed";
  lines: AccountingExportLine[];
  /** Idempotency: same batchId must not be inserted twice */
  checksum: string;
}

export function buildAccountingExportBatch(
  batchId: string,
  orgId: string,
  period: string,
  lines: AccountingExportLine[],
  generatedAt: string
): AccountingExportBatch {
  const checksum = [batchId, orgId, period, lines.length].join("|");
  return {
    batchId,
    schemaVersion: "1.0",
    orgId,
    period,
    generatedAt,
    status: "pending",
    lines,
    checksum,
  };
}

export function markAccountingExportExported(
  batch: AccountingExportBatch,
  externalReference: string
): AccountingExportBatch {
  return { ...batch, status: "exported", externalReference };
}

// ─── FIN-603: Finance observability ──────────────────────────────────────────

export type FinAlertCategory =
  | "unauthorized_attempt"
  | "failed_posting"
  | "failed_export"
  | "stale_fx"
  | "approval_backlog"
  | "unmatched_invoice"
  | "overdue_cash_advance"
  | "unsettled_completed_show"
  | "reconciliation_variance";

export interface FinObservabilityAlert extends DomainAlert {
  finCategory: FinAlertCategory;
  orgId: string;
}

export function buildFinAlert(
  id: string,
  orgId: string,
  finCategory: FinAlertCategory,
  severity: AlertSeverity,
  message: string,
  context: Record<string, unknown>,
  raisedAt: string
): FinObservabilityAlert {
  return {
    id,
    orgId,
    finCategory,
    severity,
    status: "open",
    category: finCategory,
    message,
    context,
    raisedAt,
  };
}

// ─── FIN-604: Migrate/retire legacy finance paths ────────────────────────────

export interface FinRetirementChecklist {
  rowCountReconciled: boolean;
  totalsCurrencyReconciled: boolean;
  oldWritesStopped: boolean;
  permissivePoliciesRemoved: boolean;
  rawIdUxRemoved: boolean;
  retentionPlanApproved: boolean;
  historicalAccessApproved: boolean;
  canRetire: boolean;
  blockers: string[];
}

export function evaluateFinRetirement(input: {
  rowCountReconciled: boolean;
  totalsCurrencyReconciled: boolean;
  oldWritesStopped: boolean;
  permissivePoliciesRemoved: boolean;
  rawIdUxRemoved: boolean;
  retentionPlanApproved: boolean;
  historicalAccessApproved: boolean;
}): FinRetirementChecklist {
  const blockers: string[] = [];
  if (!input.rowCountReconciled) blockers.push("Row count not reconciled");
  if (!input.totalsCurrencyReconciled) blockers.push("Totals/currency not reconciled");
  if (!input.oldWritesStopped) blockers.push("Old writes still active");
  if (!input.permissivePoliciesRemoved) blockers.push("Permissive policies still present");
  if (!input.rawIdUxRemoved) blockers.push("Raw ID UX still exposed");
  if (!input.retentionPlanApproved) blockers.push("Retention plan not approved");
  if (!input.historicalAccessApproved) blockers.push("Historical access plan not approved");
  return { ...input, canRetire: blockers.length === 0, blockers };
}

// ─── VEND-601: Vendor/contract observability ─────────────────────────────────

export type VendorAlertCategory =
  | "expiring_compliance_doc"
  | "expiring_contract"
  | "unanswered_rfp"
  | "expired_quote"
  | "stalled_approval"
  | "stalled_signature"
  | "overdue_obligation"
  | "delivery_variance"
  | "invoice_variance"
  | "provider_failure";

export interface VendorObservabilityAlert extends DomainAlert {
  vendorCategory: VendorAlertCategory;
  orgId: string;
  vendorId?: string;
  contractId?: string;
  daysUntilExpiry?: number;
}

export function buildVendorAlert(
  id: string,
  orgId: string,
  vendorCategory: VendorAlertCategory,
  severity: AlertSeverity,
  message: string,
  context: Record<string, unknown>,
  raisedAt: string
): VendorObservabilityAlert {
  return {
    id,
    orgId,
    vendorCategory,
    severity,
    status: "open",
    category: vendorCategory,
    message,
    context,
    raisedAt,
  };
}

export function scanVendorAlerts(input: {
  orgId: string;
  complianceDocExpiringWithin30Days: Array<{ vendorId: string; docType: string; expiresAt: string }>;
  contractsExpiringWithin60Days: Array<{ contractId: string; expiresAt: string }>;
  unansweredRfpOlderThan7Days: Array<{ rfpId: string; createdAt: string }>;
  expiredQuotes: Array<{ quoteId: string }>;
  stalledApprovalsOlderThan48h: Array<{ itemId: string; type: string }>;
  overduObligations: Array<{ obligationId: string; dueAt: string }>;
  providerFailures: Array<{ providerId: string; failureAt: string }>;
  now: string;
}): VendorObservabilityAlert[] {
  const alerts: VendorObservabilityAlert[] = [];
  const { orgId } = input;

  for (const doc of input.complianceDocExpiringWithin30Days) {
    alerts.push(
      buildVendorAlert(
        `vend-comp-${doc.vendorId}`,
        orgId,
        "expiring_compliance_doc",
        "warning",
        `Compliance doc ${doc.docType} expires soon`,
        { vendorId: doc.vendorId, expiresAt: doc.expiresAt },
        input.now
      )
    );
  }
  for (const c of input.contractsExpiringWithin60Days) {
    alerts.push(
      buildVendorAlert(
        `vend-ctr-${c.contractId}`,
        orgId,
        "expiring_contract",
        "warning",
        "Contract expiring within 60 days",
        { contractId: c.contractId, expiresAt: c.expiresAt },
        input.now
      )
    );
  }
  for (const rfp of input.unansweredRfpOlderThan7Days) {
    alerts.push(
      buildVendorAlert(
        `vend-rfp-${rfp.rfpId}`,
        orgId,
        "unanswered_rfp",
        "info",
        "RFP unanswered for >7 days",
        { rfpId: rfp.rfpId },
        input.now
      )
    );
  }
  for (const q of input.expiredQuotes) {
    alerts.push(
      buildVendorAlert(`vend-quote-${q.quoteId}`, orgId, "expired_quote", "info", "Quote expired", { quoteId: q.quoteId }, input.now)
    );
  }
  for (const a of input.stalledApprovalsOlderThan48h) {
    alerts.push(
      buildVendorAlert(`vend-appr-${a.itemId}`, orgId, "stalled_approval", "warning", `Stalled ${a.type} approval`, { itemId: a.itemId }, input.now)
    );
  }
  for (const o of input.overduObligations) {
    alerts.push(
      buildVendorAlert(`vend-obl-${o.obligationId}`, orgId, "overdue_obligation", "critical", "Overdue obligation", { obligationId: o.obligationId, dueAt: o.dueAt }, input.now)
    );
  }
  for (const p of input.providerFailures) {
    alerts.push(
      buildVendorAlert(`vend-prov-${p.providerId}`, orgId, "provider_failure", "critical", "Provider failure", { providerId: p.providerId, failureAt: p.failureAt }, input.now)
    );
  }
  return alerts;
}

// ─── CONT-601: Document security review ──────────────────────────────────────

export type ContDocSecurityCheckCategory =
  | "cross_org_file_id"
  | "signed_url_expiry"
  | "malware_type_spoof"
  | "token_provider_webhook"
  | "redaction_projection"
  | "deleted_member_access"
  | "retention_legal_hold";

export interface ContDocSecurityCheckResult {
  category: ContDocSecurityCheckCategory;
  passed: boolean;
  finding?: string;
  severity?: AlertSeverity;
}

export interface ContDocSecurityReview {
  reviewId: string;
  reviewedAt: string;
  checks: ContDocSecurityCheckResult[];
  openFindings: ContDocSecurityCheckResult[];
  allCriticalClosed: boolean;
}

export function buildContDocSecurityReview(
  reviewId: string,
  checks: ContDocSecurityCheckResult[],
  reviewedAt: string
): ContDocSecurityReview {
  const openFindings = checks.filter((c) => !c.passed);
  const allCriticalClosed = openFindings.every((c) => c.severity !== "critical");
  return { reviewId, reviewedAt, checks, openFindings, allCriticalClosed };
}

// ─── CONT-602: Migration and contract-shell cutover ───────────────────────────

export interface ContMigrationStatus {
  orgId: string;
  legacyVendorContractRecordsTotal: number;
  mappedToCanonical: number;
  explicitlyMarkedLegacy: number;
  orphanWrites: number;
  placeholderWrites: number;
  canonicalWorkspaceRouteActive: boolean;
  canCutover: boolean;
  blockers: string[];
}

export function evaluateContMigration(input: {
  orgId: string;
  legacyVendorContractRecordsTotal: number;
  mappedToCanonical: number;
  explicitlyMarkedLegacy: number;
  orphanWrites: number;
  placeholderWrites: number;
  canonicalWorkspaceRouteActive: boolean;
}): ContMigrationStatus {
  const blockers: string[] = [];
  const accounted = input.mappedToCanonical + input.explicitlyMarkedLegacy;
  if (accounted < input.legacyVendorContractRecordsTotal)
    blockers.push(
      `${input.legacyVendorContractRecordsTotal - accounted} records unaccounted for`
    );
  if (input.orphanWrites > 0) blockers.push(`${input.orphanWrites} orphan writes`);
  if (input.placeholderWrites > 0) blockers.push(`${input.placeholderWrites} placeholder writes`);
  if (!input.canonicalWorkspaceRouteActive) blockers.push("Canonical workspace route not active");
  return { ...input, canCutover: blockers.length === 0, blockers };
}
