/**
 * REP-001 — governed KPI catalog and legacy metric-family coverage.
 *
 * This is definition metadata only. A catalog entry never makes a legacy
 * client-side formula authoritative; legacy/conflicting entries remain
 * explicitly flagged until their owning REP task converges the read model.
 */

import {
  REPORTING_CONSUMERS,
  type ReportingConsumer,
} from "@/lib/admin/reporting-consumer-inventory";
import type { AdminCapability } from "@/lib/auth/admin-capabilities";

export type KpiGovernanceStatus = "governed" | "planned" | "legacy_conflict";
export type KpiSourceVersionMode = "live_as_of" | "immutable_version" | "consumer_defined";
export type KpiGovernanceFlag =
  | "duplicate_candidate"
  | "conflicting_definition"
  | "failure_as_empty"
  | "mock_source"
  | "partial_org_scope"
  | "missing_org_scope"
  | "unclassified_access"
  | "unclassified_currency"
  | "unclassified_time_zone";

export interface KpiCatalogEntry {
  kpiId: string;
  name: string;
  domain: string;
  businessQuestion: string;
  formula: string;
  dimensions: readonly string[];
  inclusionRules: readonly string[];
  exclusionRules: readonly string[];
  sourceEntities: readonly string[];
  sourceStatuses: readonly string[];
  grain: string;
  unit: string;
  currency: string;
  timeZone: string;
  freshnessSloMinutes: number | null;
  sourceVersionMode: KpiSourceVersionMode;
  productOwner: string;
  dataOwner: string;
  requiredCapabilities: readonly AdminCapability[];
  degradedBehavior: "unavailable" | "partial" | "stale";
  reconciliationTest: string;
  consumers: readonly string[];
  governanceStatus: KpiGovernanceStatus;
  governanceFlags: readonly KpiGovernanceFlag[];
  conflictGroup: string | null;
}

export const KPI_CATALOG_TEMPLATE_FIELDS = [
  "kpiId",
  "name",
  "domain",
  "businessQuestion",
  "formula",
  "dimensions",
  "inclusionRules",
  "exclusionRules",
  "sourceEntities",
  "sourceStatuses",
  "grain",
  "unit",
  "currency",
  "timeZone",
  "freshnessSloMinutes",
  "sourceVersionMode",
  "productOwner",
  "dataOwner",
  "requiredCapabilities",
  "degradedBehavior",
  "reconciliationTest",
  "consumers",
  "governanceStatus",
  "governanceFlags",
  "conflictGroup",
] as const satisfies readonly (keyof KpiCatalogEntry)[];

const canonicalDefaults = {
  dimensions: ["acting_org_id", "tour_id"],
  exclusionRules: ["Rows outside the verified acting organization are always excluded"],
  sourceVersionMode: "live_as_of",
  freshnessSloMinutes: 5,
  productOwner: "admin-product",
  dataOwner: "reporting-data",
  degradedBehavior: "unavailable",
  governanceStatus: "planned",
  governanceFlags: [],
  conflictGroup: null,
} as const;

export const CANONICAL_KPI_CATALOG: readonly KpiCatalogEntry[] = [
  {
    ...canonicalDefaults,
    kpiId: "tour.readiness_blocker_count",
    name: "Open tour readiness blockers",
    domain: "tour",
    businessQuestion: "How many unresolved blockers prevent the tour from progressing or publishing?",
    formula: "count(distinct readiness_evaluation.rule_id) where severity = blocker and resolved_at is null",
    inclusionRules: ["Latest persisted readiness evaluation for each in-scope stop or tour"],
    sourceEntities: ["tour readiness evaluations", "readiness rule catalog"],
    sourceStatuses: ["open", "blocked"],
    grain: "organization/tour",
    unit: "count",
    currency: "not_applicable",
    timeZone: "not_applicable",
    requiredCapabilities: ["tour.view"],
    reconciliationTest: "Recount latest persisted blocker rule IDs and compare exactly by tour",
    consumers: ["REP-QUERY-TOUR-CMD-SUMMARY"],
  },
  {
    ...canonicalDefaults,
    kpiId: "tour.unacked_publications",
    name: "Overdue required publication acknowledgements",
    domain: "publication",
    businessQuestion: "How many required recipients have not acknowledged the active publication by deadline?",
    formula: "count(required evaluated recipients without a valid acknowledgement where acknowledgement_due_at < as_of)",
    inclusionRules: ["Active, non-retracted publication snapshots and evaluated required recipients"],
    sourceEntities: ["admin_publication_snapshots", "admin_publication_recipients", "admin_publication_acknowledgements"],
    sourceStatuses: ["committed", "published", "required", "unacknowledged"],
    grain: "organization/tour/publication",
    unit: "count",
    currency: "not_applicable",
    timeZone: "UTC comparison; display in acting account time zone",
    requiredCapabilities: ["tour.view"],
    reconciliationTest: "Anti-join required evaluated recipients to valid acknowledgements at the same snapshot version",
    consumers: ["REP-QUERY-TOUR-CMD-SUMMARY"],
  },
  {
    ...canonicalDefaults,
    kpiId: "route.unresolved_conflicts",
    name: "Unresolved route conflicts",
    domain: "logistics",
    businessQuestion: "How many current route constraints require an operator decision?",
    formula: "count(open route constraint conflicts on the current plan version)",
    inclusionRules: ["Current canonical tour-plan version and active route legs"],
    sourceEntities: ["tour_plans", "tour_route_legs", "route_constraint_conflicts"],
    sourceStatuses: ["open", "blocked"],
    grain: "organization/tour",
    unit: "count",
    currency: "not_applicable",
    timeZone: "leg-local input normalized to UTC",
    requiredCapabilities: ["logistics.view"],
    reconciliationTest: "Re-evaluate the current route policy and compare conflict identity/status exactly",
    consumers: ["REP-DASH-LOGISTICS", "REP-QUERY-TOUR-CMD-SUMMARY"],
  },
  {
    ...canonicalDefaults,
    kpiId: "workforce.uncovered_shifts",
    name: "Uncovered shifts",
    domain: "workforce",
    businessQuestion: "How many published or scheduled shifts have no active assignment?",
    formula: "count(active shifts in window with zero accepted active assignments)",
    inclusionRules: ["Non-cancelled shifts in the selected tour/event/date window"],
    sourceEntities: ["staff_shifts", "shift_assignments"],
    sourceStatuses: ["scheduled", "published", "accepted"],
    grain: "organization/tour/event/day",
    unit: "count",
    currency: "not_applicable",
    timeZone: "event local time with stored UTC instants",
    requiredCapabilities: ["workforce.view"],
    reconciliationTest: "Anti-join active shifts to accepted non-revoked assignments and compare by event/day",
    consumers: ["REP-CARD-ANALYTICS-PERF", "REP-QUERY-TOUR-CMD-SUMMARY"],
  },
  {
    ...canonicalDefaults,
    kpiId: "advance.overdue_sections",
    name: "Overdue advancing sections",
    domain: "advance",
    businessQuestion: "How many required advance sections are past due without approval?",
    formula: "count(required sections where due_at < as_of and status not in approved, waived)",
    inclusionRules: ["Required sections on active events in the selected scope"],
    sourceEntities: ["advance_sections", "advance_section_approvals"],
    sourceStatuses: ["required", "in_progress", "submitted", "approved", "waived"],
    grain: "organization/tour/event",
    unit: "count",
    currency: "not_applicable",
    timeZone: "event local deadline with stored UTC instant",
    requiredCapabilities: ["event.view"],
    reconciliationTest: "Compare required section deadlines with latest approval/waiver state",
    consumers: ["REP-DASH-CMD-CENTER"],
  },
  {
    ...canonicalDefaults,
    kpiId: "ticketing.scan_reconcile_gap",
    name: "Ticket scan reconciliation gap",
    domain: "ticketing",
    businessQuestion: "How many issued admissions are not explained by scan, refund, void, transfer, or approved hold state?",
    formula: "issued admissions - valid scans - refunded - voided - transferred-out - active approved holds",
    inclusionRules: ["Canonical inventory ledger entries for the selected event/version"],
    exclusionRules: [...canonicalDefaults.exclusionRules, "Provider totals without canonical reconciliation are excluded"],
    sourceEntities: ["ticket_inventory_ledger", "admission_scans", "ticket_refunds", "ticket_transfers"],
    sourceStatuses: ["issued", "scanned", "refunded", "voided", "transferred", "held"],
    grain: "organization/tour/event/inventory bucket",
    unit: "count",
    currency: "not_applicable",
    timeZone: "event local display; UTC event time",
    requiredCapabilities: ["ticketing.view"],
    reconciliationTest: "Sum the immutable inventory ledger by disposition and compare gap exactly",
    consumers: ["REP-DASH-TICKETING", "REP-CARD-TIX-OVERVIEW"],
  },
  {
    ...canonicalDefaults,
    kpiId: "finance.budget_variance_pct",
    name: "Approved budget variance",
    domain: "finance",
    businessQuestion: "How far do posted actuals differ from the approved budget in reporting currency?",
    formula: "(posted_actual_reporting_amount - approved_budget_reporting_amount) / nullif(approved_budget_reporting_amount, 0)",
    inclusionRules: ["Latest approved immutable budget version and posted, non-reversed actual ledger entries"],
    exclusionRules: [...canonicalDefaults.exclusionRules, "Zero budget denominator returns unavailable, never zero percent"],
    sourceEntities: ["budget_versions", "budget_lines", "finance_ledger", "fx_rate_snapshots"],
    sourceStatuses: ["approved", "posted", "reversed"],
    grain: "organization/tour/department/category",
    unit: "percent",
    currency: "organization reporting currency using persisted FX snapshot",
    timeZone: "organization reporting period time zone",
    requiredCapabilities: ["finance.view"],
    degradedBehavior: "partial",
    reconciliationTest: "Recompute budget and actual totals from immutable source versions and compare within currency minor-unit tolerance",
    consumers: ["REP-DASH-FINANCES", "REP-CARD-FIN-OVERVIEW"],
  },
  {
    ...canonicalDefaults,
    kpiId: "contract.overdue_obligations",
    name: "Overdue contract obligations",
    domain: "vendors",
    businessQuestion: "How many active executed-contract obligations are overdue and unresolved?",
    formula: "count(active obligations where due_at < as_of and status not in fulfilled, waived)",
    inclusionRules: ["Obligations from active executed canonical contract versions"],
    sourceEntities: ["contracts", "contract_versions", "contract_obligations"],
    sourceStatuses: ["executed", "active", "open", "fulfilled", "waived"],
    grain: "organization/tour/event/vendor/contract",
    unit: "count",
    currency: "not_applicable unless obligation amount dimension is separately authorized",
    timeZone: "contract-defined deadline time zone, otherwise organization time zone",
    requiredCapabilities: ["contract.view"],
    reconciliationTest: "Compare active executed versions to obligation due/status history with no mutable-version mixing",
    consumers: ["REP-QUERY-TOUR-CMD-SUMMARY"],
  },
];

function legacyKpiId(consumerId: string) {
  return `legacy.${consumerId.toLowerCase().replaceAll("_", "-")}`;
}

function duplicateReplacementCounts() {
  const counts = new Map<string, number>();
  for (const consumer of REPORTING_CONSUMERS) {
    const group = consumer.canonicalReplacement.trim().toLowerCase();
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return counts;
}

function governanceFlags(consumer: ReportingConsumer, replacementCounts: Map<string, number>) {
  const flags: KpiGovernanceFlag[] = [
    "conflicting_definition",
    "unclassified_access",
    "unclassified_currency",
    "unclassified_time_zone",
  ];
  if ((replacementCounts.get(consumer.canonicalReplacement.trim().toLowerCase()) ?? 0) > 1)
    flags.push("duplicate_candidate");
  if (consumer.failureBehavior === "empty") flags.push("failure_as_empty");
  if (consumer.failureBehavior === "mock") flags.push("mock_source");
  if (consumer.orgFilter === "partial") flags.push("partial_org_scope");
  if (consumer.orgFilter === "no" || consumer.orgFilter === "n/a") flags.push("missing_org_scope");
  return flags;
}

const replacementCounts = duplicateReplacementCounts();

export const LEGACY_KPI_CATALOG: readonly KpiCatalogEntry[] = REPORTING_CONSUMERS.map(
  (consumer) => ({
    kpiId: legacyKpiId(consumer.id),
    name: consumer.surface,
    domain: "legacy-reporting",
    businessQuestion: `What does the legacy reporting consumer ${consumer.id} currently present?`,
    formula: consumer.formula,
    dimensions: ["consumer_defined"],
    inclusionRules: ["Inherited from legacy consumer; not yet governed"],
    exclusionRules: ["Unknown until canonical replacement task documents source semantics"],
    sourceEntities: [consumer.source],
    sourceStatuses: ["consumer_defined"],
    grain: "consumer_defined",
    unit: "consumer_defined",
    currency: "consumer_defined",
    timeZone: "consumer_defined",
    freshnessSloMinutes: null,
    sourceVersionMode: "consumer_defined",
    productOwner: consumer.owner,
    dataOwner: consumer.owner,
    requiredCapabilities: [],
    degradedBehavior: consumer.failureBehavior === "degraded" ? "partial" : "unavailable",
    reconciliationTest: `Blocked: reconcile ${consumer.id} to ${consumer.canonicalReplacement} before release`,
    consumers: [consumer.id],
    governanceStatus: "legacy_conflict",
    governanceFlags: governanceFlags(consumer, replacementCounts),
    conflictGroup: consumer.canonicalReplacement,
  }),
);

export const KPI_CATALOG: readonly KpiCatalogEntry[] = [
  ...CANONICAL_KPI_CATALOG,
  ...LEGACY_KPI_CATALOG,
];

export type KpiCatalogIssueCode =
  | "duplicate_kpi_id"
  | "uncovered_reporting_consumer"
  | "unflagged_legacy_metric"
  | "incomplete_template";

export interface KpiCatalogIssue {
  code: KpiCatalogIssueCode;
  subject: string;
  detail: string;
}

export function validateKpiCatalog(
  catalog: readonly KpiCatalogEntry[] = KPI_CATALOG,
  consumers: readonly ReportingConsumer[] = REPORTING_CONSUMERS,
): KpiCatalogIssue[] {
  const issues: KpiCatalogIssue[] = [];
  const ids = new Set<string>();
  for (const entry of catalog) {
    if (ids.has(entry.kpiId))
      issues.push({ code: "duplicate_kpi_id", subject: entry.kpiId, detail: "KPI IDs must be globally unique" });
    ids.add(entry.kpiId);
    for (const field of KPI_CATALOG_TEMPLATE_FIELDS) {
      if (!(field in entry))
        issues.push({ code: "incomplete_template", subject: entry.kpiId, detail: `Missing ${field}` });
    }
    if (entry.governanceStatus === "legacy_conflict" && entry.governanceFlags.length === 0)
      issues.push({ code: "unflagged_legacy_metric", subject: entry.kpiId, detail: "Legacy/conflicting metrics require explicit governance flags" });
  }
  const coveredConsumers = new Set(catalog.flatMap((entry) => [...entry.consumers]));
  for (const consumer of consumers) {
    if (!coveredConsumers.has(consumer.id))
      issues.push({ code: "uncovered_reporting_consumer", subject: consumer.id, detail: "Every inventoried reporting consumer requires a KPI catalog record" });
  }
  return issues;
}

export function kpiCatalogStats() {
  return {
    total: KPI_CATALOG.length,
    canonical: CANONICAL_KPI_CATALOG.length,
    legacyConflict: LEGACY_KPI_CATALOG.length,
    flaggedDuplicateCandidates: LEGACY_KPI_CATALOG.filter((entry) => entry.governanceFlags.includes("duplicate_candidate")).length,
  };
}
