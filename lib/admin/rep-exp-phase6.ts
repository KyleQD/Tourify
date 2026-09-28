/**
 * rep-exp-phase6.ts
 * Phase 6 — Reporting, Exports, and Analytics
 * Tasks: REP-601..604, EXP-601..604
 *
 * Pure domain logic — no Supabase imports.
 */

// ─── REP-601: Reporting freshness/reconciliation UI ───────────────────────────

export interface ReportSourceWatermark {
  sourceId: string;
  sourceName: string;
  lastCompletedAt: string; // ISO — last full reconciliation
  watermarkAt: string; // ISO — data is complete through this point
  isStale: boolean;
  isPartial: boolean;
  completenessPercent: number; // 0–100
}

export interface ReportFreshnessView {
  reportId: string;
  generatedAt: string;
  sources: ReportSourceWatermark[];
  allFresh: boolean;
  staleSourceCount: number;
  partialSourceCount: number;
}

export function buildReportFreshnessView(
  reportId: string,
  sources: ReportSourceWatermark[],
  generatedAt: string
): ReportFreshnessView {
  const staleSourceCount = sources.filter((s) => s.isStale).length;
  const partialSourceCount = sources.filter((s) => s.isPartial).length;
  return {
    reportId,
    generatedAt,
    sources,
    allFresh: staleSourceCount === 0 && partialSourceCount === 0,
    staleSourceCount,
    partialSourceCount,
  };
}

// ─── REP-602: Data-quality monitors ──────────────────────────────────────────

export type DataQualityIssueType =
  | "orphan_record"
  | "unscoped_record"
  | "duplicate_source"
  | "negative_quantity"
  | "impossible_quantity"
  | "mismatched_totals"
  | "missing_dimension"
  | "stale_projection";

export interface DataQualityAlert {
  id: string;
  orgId: string;
  issueType: DataQualityIssueType;
  domain: string;
  recordId?: string;
  description: string;
  owner?: string;
  status: "open" | "acknowledged" | "resolved";
  detectedAt: string;
}

export function buildDataQualityAlert(
  id: string,
  orgId: string,
  issueType: DataQualityIssueType,
  domain: string,
  description: string,
  detectedAt: string,
  recordId?: string
): DataQualityAlert {
  return {
    id,
    orgId,
    issueType,
    domain,
    description,
    status: "open",
    detectedAt,
    recordId,
  };
}

// ─── REP-603: Performance budgets ────────────────────────────────────────────

export interface ReportingBudget {
  reportType: string;
  queryP50Ms: number;
  queryP95Ms: number;
  renderP95Ms: number;
  fileSizeKb: number;
  queueWaitP95Ms: number;
}

export interface ReportingBudgetMeasurement {
  reportType: string;
  queryP50Ms: number;
  queryP95Ms: number;
  renderP95Ms: number;
  fileSizeKb: number;
  queueWaitP95Ms: number;
  measuredAt: string;
}

export function evaluateReportingBudget(
  budget: ReportingBudget,
  measurement: ReportingBudgetMeasurement
): { passes: boolean; violations: string[] } {
  const violations: string[] = [];
  if (measurement.queryP50Ms > budget.queryP50Ms)
    violations.push(`queryP50 ${measurement.queryP50Ms}ms > budget ${budget.queryP50Ms}ms`);
  if (measurement.queryP95Ms > budget.queryP95Ms)
    violations.push(`queryP95 ${measurement.queryP95Ms}ms > budget ${budget.queryP95Ms}ms`);
  if (measurement.renderP95Ms > budget.renderP95Ms)
    violations.push(`renderP95 ${measurement.renderP95Ms}ms > budget ${budget.renderP95Ms}ms`);
  if (measurement.fileSizeKb > budget.fileSizeKb)
    violations.push(`fileSize ${measurement.fileSizeKb}KB > budget ${budget.fileSizeKb}KB`);
  if (measurement.queueWaitP95Ms > budget.queueWaitP95Ms)
    violations.push(`queueWaitP95 ${measurement.queueWaitP95Ms}ms > budget ${budget.queueWaitP95Ms}ms`);
  return { passes: violations.length === 0, violations };
}

// ─── REP-604: Retire duplicated client aggregation ────────────────────────────

export interface ClientAggregationRetirementStatus {
  formulaId: string;
  usesGovernedReadModel: boolean;
  oldFormulaRemoved: boolean;
  fanoutRemoved: boolean;
  comparisonReportMatches: boolean; // within approved tolerance
  tolerancePct: number;
  canRetire: boolean;
  blockers: string[];
}

export function evaluateClientAggregationRetirement(input: {
  formulaId: string;
  usesGovernedReadModel: boolean;
  oldFormulaRemoved: boolean;
  fanoutRemoved: boolean;
  comparisonReportMatches: boolean;
  tolerancePct: number;
}): ClientAggregationRetirementStatus {
  const blockers: string[] = [];
  if (!input.usesGovernedReadModel) blockers.push("UI not consuming governed read model");
  if (!input.comparisonReportMatches)
    blockers.push(`Comparison report mismatch outside ${input.tolerancePct}% tolerance`);
  if (!input.oldFormulaRemoved) blockers.push("Old formula not removed");
  if (!input.fanoutRemoved) blockers.push("Old fanout not removed");
  return { ...input, canRetire: blockers.length === 0, blockers };
}

// ─── EXP-601: Export job service ─────────────────────────────────────────────

export type ExportJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "expired"
  | "retrying";

export interface ExportJob {
  jobId: string;
  orgId: string;
  requestedBy: string;
  capability: string; // required capability to export
  filter: Record<string, unknown>;
  schemaVersion: string;
  audienceClass: string;
  status: ExportJobStatus;
  idempotencyKey: string;
  snapshotInputsAt: string;
  fileUrl?: string;
  fileExpiresAt?: string;
  retryCount: number;
  maxRetries: number;
  auditEntry: string; // reference to audit log
  accessLogEntry?: string;
  createdAt: string;
  completedAt?: string;
}

export function createExportJob(input: {
  jobId: string;
  orgId: string;
  requestedBy: string;
  capability: string;
  filter: Record<string, unknown>;
  schemaVersion: string;
  audienceClass: string;
  idempotencyKey: string;
  createdAt: string;
}): ExportJob {
  return {
    ...input,
    status: "queued",
    snapshotInputsAt: input.createdAt,
    retryCount: 0,
    maxRetries: 3,
    auditEntry: `audit:export:${input.jobId}`,
  };
}

export function retryExportJob(job: ExportJob): ExportJob | { error: string } {
  if (job.retryCount >= job.maxRetries)
    return { error: `Max retries (${job.maxRetries}) reached` };
  return { ...job, status: "retrying", retryCount: job.retryCount + 1 };
}

export function completeExportJob(
  job: ExportJob,
  fileUrl: string,
  fileExpiresAt: string,
  completedAt: string
): ExportJob {
  return {
    ...job,
    status: "completed",
    fileUrl,
    fileExpiresAt,
    completedAt,
    accessLogEntry: `access:export:${job.jobId}`,
  };
}

export function expireExportJob(job: ExportJob, now: string): ExportJob {
  if (!job.fileExpiresAt) return job;
  if (new Date(now) >= new Date(job.fileExpiresAt)) {
    return { ...job, status: "expired", fileUrl: undefined };
  }
  return job;
}

// ─── EXP-602: Versioned CSV/XLSX schemas ─────────────────────────────────────

export interface ExportColumnDef {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "currency";
  unit?: string;
  timezone?: string;
  currencyIso?: string;
  nullable: boolean;
}

export interface ExportSchema {
  schemaId: string;
  schemaVersion: string;
  exportType: string;
  columns: ExportColumnDef[];
  backwardCompatible: boolean; // columns only added, not removed
  formulaInjectionPrevented: boolean; // columns prefixed/sanitized
}

export function validateExportValue(
  value: unknown,
  col: ExportColumnDef
): { valid: boolean; sanitized: unknown; error?: string } {
  if (value === null || value === undefined) {
    if (!col.nullable) return { valid: false, sanitized: null, error: `${col.name} is required` };
    return { valid: true, sanitized: null };
  }
  // Prevent formula injection: strings starting with =, +, -, @ are prefixed with a tab
  if (typeof value === "string" && /^[=+\-@]/.test(value)) {
    return { valid: true, sanitized: `\t${value}` };
  }
  return { valid: true, sanitized: value };
}

// ─── EXP-603: Web/PDF tour book ───────────────────────────────────────────────

export type TourBookSectionKey =
  | "itinerary"
  | "contacts"
  | "travel"
  | "lodging"
  | "day_sheets"
  | "advances"
  | "maps"
  | "vendor_info"
  | "emergency";

export interface TourBookSection {
  key: TourBookSectionKey;
  title: string;
  audienceClass: string; // e.g. "crew_only", "public"
  authorized: boolean;
  hasContent: boolean;
  overflowHandled: boolean; // pagination/truncation implemented
  emptyStateHandled: boolean;
  errorStateHandled: boolean;
}

export interface TourBook {
  tourId: string;
  version: string;
  checksum: string;
  publicationLink: string;
  sections: TourBookSection[];
  tableOfContents: Array<{ key: TourBookSectionKey; title: string; pageRef: string }>;
  localTimeContext: string; // IANA timezone
  accessibleWebEquivalent: boolean;
  generatedAt: string;
}

export function buildTourBook(
  tourId: string,
  sections: TourBookSection[],
  localTimeContext: string,
  publicationLink: string,
  generatedAt: string
): TourBook {
  const authorizedSections = sections.filter((s) => s.authorized && s.hasContent);
  const toc = authorizedSections.map((s, i) => ({
    key: s.key,
    title: s.title,
    pageRef: `page-${i + 1}`,
  }));
  const version = `1.0.${authorizedSections.length}`;
  const checksum = [tourId, version, authorizedSections.map((s) => s.key).join(",")].join("|");
  return {
    tourId,
    version,
    checksum,
    publicationLink,
    sections,
    tableOfContents: toc,
    localTimeContext,
    accessibleWebEquivalent: true,
    generatedAt,
  };
}

// ─── EXP-604: Harden ICS/feed exports ────────────────────────────────────────

export interface IcsEventRecord {
  uid: string; // stable deterministic UID
  summary: string;
  dtstart: string; // UTC ISO
  dtend: string;
  sequence: number; // increment on update
  status: "confirmed" | "cancelled" | "tentative";
  audienceClass: string;
  accessLogEntry: string;
}

export interface IcsFeedConfig {
  feedId: string;
  scopedToken: string;
  orgId: string;
  audienceClass: string;
  revoked: boolean;
  expiresAt?: string;
}

export function validateIcsFeedAccess(
  config: IcsFeedConfig,
  now: string
): { allowed: boolean; reason: string } {
  if (config.revoked) return { allowed: false, reason: "feed_token_revoked" };
  if (config.expiresAt && new Date(now) >= new Date(config.expiresAt))
    return { allowed: false, reason: "feed_token_expired" };
  return { allowed: true, reason: "ok" };
}

export function buildIcsEvent(
  source: { id: string; title: string; startsAt: string; endsAt: string; audienceClass: string },
  sequenceNumber: number,
  orgId: string
): IcsEventRecord {
  // Stable UID: org + source ID
  const uid = `${source.id}@${orgId}.tourify`;
  return {
    uid,
    summary: source.title,
    dtstart: source.startsAt,
    dtend: source.endsAt,
    sequence: sequenceNumber,
    status: "confirmed",
    audienceClass: source.audienceClass,
    accessLogEntry: `ics:${uid}:${sequenceNumber}`,
  };
}
