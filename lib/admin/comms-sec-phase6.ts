/**
 * comms-sec-phase6.ts
 * Phase 6 — Communications, Calendar, and Security assurance
 * Tasks: CAL-601, COMMS-601..603, SEC-601..605
 *
 * Pure domain logic — no Supabase imports.
 */

// ─── Shared ───────────────────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved";

// ─── CAL-601: Calendar freshness/SLO monitoring ───────────────────────────────

export type CalSourceType =
  | "tour_events"
  | "logistics_tasks"
  | "shifts"
  | "travel"
  | "lodging"
  | "meetings"
  | "external_feed";

export interface CalSourceHealth {
  sourceType: CalSourceType;
  orgId: string;
  lagSeconds: number;
  lastSuccessAt: string;
  errorCount: number;
  queryLatencyMs: number;
  feedTokenFailures: number;
  invalidTimezoneEvents: number;
  syncErrors: number;
  clientErrors: number;
  alertsRaised: string[]; // alert IDs
}

export interface CalFreshnessAlert {
  id: string;
  orgId: string;
  sourceType: CalSourceType;
  alertType:
    | "lag_exceeded"
    | "query_latency_exceeded"
    | "feed_token_failure"
    | "invalid_timezone"
    | "sync_error"
    | "client_error";
  severity: AlertSeverity;
  message: string;
  raisedAt: string;
}

export function evaluateCalSourceHealth(
  health: CalSourceHealth,
  thresholds: {
    maxLagSeconds: number;
    maxQueryLatencyMs: number;
    feedTokenFailureThreshold: number;
  },
  now: string
): CalFreshnessAlert[] {
  const alerts: CalFreshnessAlert[] = [];
  const base = { orgId: health.orgId, sourceType: health.sourceType, raisedAt: now };
  if (health.lagSeconds > thresholds.maxLagSeconds) {
    alerts.push({ id: `cal-lag-${health.sourceType}`, ...base, alertType: "lag_exceeded", severity: "warning", message: `Source lag ${health.lagSeconds}s exceeds ${thresholds.maxLagSeconds}s` });
  }
  if (health.queryLatencyMs > thresholds.maxQueryLatencyMs) {
    alerts.push({ id: `cal-latency-${health.sourceType}`, ...base, alertType: "query_latency_exceeded", severity: "warning", message: `Query latency ${health.queryLatencyMs}ms exceeds ${thresholds.maxQueryLatencyMs}ms` });
  }
  if (health.feedTokenFailures >= thresholds.feedTokenFailureThreshold) {
    alerts.push({ id: `cal-token-${health.sourceType}`, ...base, alertType: "feed_token_failure", severity: "critical", message: `${health.feedTokenFailures} feed token failures` });
  }
  if (health.invalidTimezoneEvents > 0) {
    alerts.push({ id: `cal-tz-${health.sourceType}`, ...base, alertType: "invalid_timezone", severity: "warning", message: `${health.invalidTimezoneEvents} events with invalid timezone` });
  }
  if (health.syncErrors > 0) {
    alerts.push({ id: `cal-sync-${health.sourceType}`, ...base, alertType: "sync_error", severity: "warning", message: `${health.syncErrors} sync errors` });
  }
  if (health.clientErrors > 0) {
    alerts.push({ id: `cal-client-${health.sourceType}`, ...base, alertType: "client_error", severity: "info", message: `${health.clientErrors} client errors` });
  }
  return alerts;
}

// ─── COMMS-601: Delivery observability ───────────────────────────────────────

export type CommsDeliveryMetricType =
  | "queue_age_seconds"
  | "provider_failure_count"
  | "suppression_consent_count"
  | "duplicate_prevention_count"
  | "open_rate_pct"
  | "ack_rate_pct"
  | "escalation_backlog"
  | "dead_letter_count";

export interface CommsDeliveryMetric {
  metricType: CommsDeliveryMetricType;
  orgId: string;
  value: number;
  threshold?: number;
  isActionable: boolean;
  measuredAt: string;
}

export function evaluateCommsDeliveryMetric(
  metric: CommsDeliveryMetric,
  thresholds: Partial<Record<CommsDeliveryMetricType, number>>
): { alert: boolean; severity: AlertSeverity; message: string } {
  const threshold = thresholds[metric.metricType];
  if (threshold === undefined) return { alert: false, severity: "info", message: "No threshold configured" };

  const exceeded = metric.value > threshold;
  const lowIsGood = metric.metricType === "open_rate_pct" || metric.metricType === "ack_rate_pct";
  const actuallyBad = lowIsGood ? metric.value < threshold : exceeded;

  if (!actuallyBad) return { alert: false, severity: "info", message: "Within threshold" };

  const isCritical =
    metric.metricType === "dead_letter_count" ||
    metric.metricType === "provider_failure_count" ||
    metric.metricType === "escalation_backlog";
  return {
    alert: true,
    severity: isCritical ? "critical" : "warning",
    message: `${metric.metricType} = ${metric.value} (threshold: ${threshold})`,
  };
}

// ─── COMMS-602: Notification fatigue rules ────────────────────────────────────

export type NotificationCategory = "critical" | "standard" | "low_value";

export interface NotificationFatigueResult {
  recipientId: string;
  category: NotificationCategory;
  wouldSend: boolean;
  suppressedByBurst: boolean;
  suppressedByDigest: boolean;
  suppressedByDedup: boolean;
  suppressedByQuietHour: boolean;
  escalated: boolean;
  reason: string;
}

export interface NotificationFatiguePolicy {
  burstWindowMs: number;
  maxBurstCount: number;
  digestWindowMs: number;
  digestCategories: NotificationCategory[];
  quietHourStart: number; // 0-23 local hour
  quietHourEnd: number;
  criticalBypassesAll: boolean;
}

export const DEFAULT_FATIGUE_POLICY: NotificationFatiguePolicy = {
  burstWindowMs: 5 * 60 * 1000, // 5 min
  maxBurstCount: 3,
  digestWindowMs: 60 * 60 * 1000, // 1 hr
  digestCategories: ["low_value"],
  quietHourStart: 22,
  quietHourEnd: 7,
  criticalBypassesAll: true,
};

export function evaluateNotificationFatigue(input: {
  recipientId: string;
  category: NotificationCategory;
  localHour: number;
  recentCountInBurstWindow: number;
  recentCountInDigestWindow: number;
  isDuplicate: boolean;
  policy: NotificationFatiguePolicy;
}): NotificationFatigueResult {
  const { category, policy } = input;

  // Critical always passes through if policy says so
  if (category === "critical" && policy.criticalBypassesAll) {
    return {
      recipientId: input.recipientId,
      category,
      wouldSend: true,
      suppressedByBurst: false,
      suppressedByDigest: false,
      suppressedByDedup: false,
      suppressedByQuietHour: false,
      escalated: false,
      reason: "critical_bypass",
    };
  }

  const suppressedByDedup = input.isDuplicate;
  const suppressedByBurst = input.recentCountInBurstWindow >= policy.maxBurstCount;
  const suppressedByDigest = policy.digestCategories.includes(category);
  const inQuietHour =
    policy.quietHourStart > policy.quietHourEnd
      ? input.localHour >= policy.quietHourStart || input.localHour < policy.quietHourEnd
      : input.localHour >= policy.quietHourStart && input.localHour < policy.quietHourEnd;
  const suppressedByQuietHour = inQuietHour && category !== "critical";

  const wouldSend =
    !suppressedByDedup && !suppressedByBurst && !suppressedByDigest && !suppressedByQuietHour;

  const reason = !wouldSend
    ? [
        suppressedByDedup && "dedupe",
        suppressedByBurst && "burst",
        suppressedByDigest && "digest",
        suppressedByQuietHour && "quiet_hour",
      ]
        .filter(Boolean)
        .join("+")
    : "approved";

  return {
    recipientId: input.recipientId,
    category,
    wouldSend,
    suppressedByBurst,
    suppressedByDigest,
    suppressedByDedup,
    suppressedByQuietHour,
    escalated: false,
    reason,
  };
}

// ─── COMMS-603: Retire duplicate delivery paths ────────────────────────────────

export type DeliveryPathType =
  | "work_mode"
  | "inbox"
  | "event_group"
  | "domain_notification"
  | "legacy_fire_and_forget";

export interface DeliveryPathAudit {
  pathType: DeliveryPathType;
  usesCanonicalAudience: boolean;
  usesCanonicalDeliveryStatus: boolean;
  legacyFireAndForgetWritesRemoved: boolean;
  canRetire: boolean;
  blockers: string[];
}

export function auditDeliveryPath(input: {
  pathType: DeliveryPathType;
  usesCanonicalAudience: boolean;
  usesCanonicalDeliveryStatus: boolean;
  legacyFireAndForgetWritesRemoved: boolean;
}): DeliveryPathAudit {
  const blockers: string[] = [];
  if (!input.usesCanonicalAudience) blockers.push("Does not use canonical audience");
  if (!input.usesCanonicalDeliveryStatus) blockers.push("Does not use canonical delivery status");
  if (!input.legacyFireAndForgetWritesRemoved) blockers.push("Legacy fire-and-forget writes not removed");
  return { ...input, canRetire: blockers.length === 0, blockers };
}

// ─── SEC-601: Automated RLS matrix in CI ─────────────────────────────────────

export type RlsPersona = "anon" | "org_a_admin" | "org_a_member" | "org_b_admin" | "revoked_member" | "service_role";

export interface RlsMatrixCase {
  table: string;
  action: "select" | "insert" | "update" | "delete";
  persona: RlsPersona;
  expectedResult: "allowed" | "denied";
}

export interface RlsMatrixResult {
  table: string;
  action: string;
  persona: RlsPersona;
  expected: "allowed" | "denied";
  actual: "allowed" | "denied";
  passed: boolean;
}

export function buildRlsMatrixSummary(results: RlsMatrixResult[]): {
  totalCases: number;
  passed: number;
  failed: number;
  crossOrgLeaks: RlsMatrixResult[];
  validAccessFailures: RlsMatrixResult[];
  allPassed: boolean;
} {
  const failed = results.filter((r) => !r.passed);
  const crossOrgLeaks = failed.filter(
    (r) => r.expected === "denied" && r.actual === "allowed" && r.persona.startsWith("org_b")
  );
  const validAccessFailures = failed.filter(
    (r) => r.expected === "allowed" && r.actual === "denied"
  );
  return {
    totalCases: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: failed.length,
    crossOrgLeaks,
    validAccessFailures,
    allPassed: failed.length === 0,
  };
}

// ─── SEC-602: Authorization observability ────────────────────────────────────

export type AuthObservabilityAlertType =
  | "denied_spike"
  | "context_mismatch"
  | "service_role_usage"
  | "policy_error"
  | "audit_write_failure";

export interface AuthObservabilityMetric {
  alertType: AuthObservabilityAlertType;
  orgId: string;
  count: number;
  windowMinutes: number;
  threshold: number;
  containsPii: false; // invariant — never log PII/secrets
  raisedAt: string;
}

export function evaluateAuthMetric(
  metric: AuthObservabilityMetric
): { alert: boolean; severity: "critical" | "warning" | "info" } {
  if (metric.count <= metric.threshold) return { alert: false, severity: "info" };
  const critical =
    metric.alertType === "audit_write_failure" || metric.alertType === "policy_error";
  return { alert: true, severity: critical ? "critical" : "warning" };
}

// ─── SEC-603: Security review / pen test ─────────────────────────────────────

export type SecPenTestArea =
  | "idor"
  | "privilege_escalation"
  | "token_leakage"
  | "bulk_export_bypass"
  | "race_conditions"
  | "webhook_replay"
  | "stored_file_access";

export type SecFindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface SecPenTestFinding {
  area: SecPenTestArea;
  severity: SecFindingSeverity;
  description: string;
  resolved: boolean;
}

export interface SecPenTestReview {
  reviewId: string;
  reviewedAt: string;
  findings: SecPenTestFinding[];
  unresolvedCriticalOrHigh: SecPenTestFinding[];
  releasable: boolean;
}

export function buildSecPenTestReview(
  reviewId: string,
  findings: SecPenTestFinding[],
  reviewedAt: string
): SecPenTestReview {
  const unresolvedCriticalOrHigh = findings.filter(
    (f) => !f.resolved && (f.severity === "critical" || f.severity === "high")
  );
  return {
    reviewId,
    reviewedAt,
    findings,
    unresolvedCriticalOrHigh,
    releasable: unresolvedCriticalOrHigh.length === 0,
  };
}

// ─── SEC-604: Access review workflow ─────────────────────────────────────────

export interface OrgMemberAccessRecord {
  memberId: string;
  role: string;
  entityGrants: Array<{ entityType: string; entityId: string; grantedAt: string; expiresAt?: string }>;
  externalShares: Array<{ shareId: string; shareType: string; expiresAt?: string }>;
  recentPrivilegedActions: Array<{ action: string; performedAt: string }>;
}

export interface AccessReviewDecision {
  memberId: string;
  decision: "retain" | "revoke" | "downgrade";
  reason?: string;
  decidedBy: string;
  decidedAt: string;
}

export function buildAccessReviewSummary(
  orgId: string,
  members: OrgMemberAccessRecord[],
  decisions: AccessReviewDecision[]
): {
  orgId: string;
  totalMembers: number;
  reviewed: number;
  revokeOrDowngrade: AccessReviewDecision[];
  pendingReview: OrgMemberAccessRecord[];
} {
  const reviewedIds = new Set(decisions.map((d) => d.memberId));
  const pendingReview = members.filter((m) => !reviewedIds.has(m.memberId));
  const revokeOrDowngrade = decisions.filter(
    (d) => d.decision === "revoke" || d.decision === "downgrade"
  );
  return {
    orgId,
    totalMembers: members.length,
    reviewed: decisions.length,
    revokeOrDowngrade,
    pendingReview,
  };
}

// ─── SEC-605: Data-retention controls ────────────────────────────────────────

export type RetentionDomain =
  | "audit"
  | "finance"
  | "tickets"
  | "contracts"
  | "personnel"
  | "incidents"
  | "uploaded_documents";

export interface RetentionPolicy {
  domain: RetentionDomain;
  retainForDays: number;
  deletionMethod: "hard_delete" | "soft_delete" | "archive";
  legalHoldSupported: boolean;
  tested: boolean;
}

export interface RetentionEligibleRecord {
  id: string;
  domain: RetentionDomain;
  createdAt: string;
  legalHold: boolean;
}

export function evaluateRetentionEligibility(
  record: RetentionEligibleRecord,
  policy: RetentionPolicy,
  now: string
): { eligible: boolean; reason: string } {
  if (record.legalHold) return { eligible: false, reason: "legal_hold" };
  const ageMs = new Date(now).getTime() - new Date(record.createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < policy.retainForDays)
    return {
      eligible: false,
      reason: `Retain for ${policy.retainForDays}d; age is ${Math.floor(ageDays)}d`,
    };
  return { eligible: true, reason: "retention_period_elapsed" };
}
