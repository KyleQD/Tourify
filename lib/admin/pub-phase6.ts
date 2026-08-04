/**
 * pub-phase6.ts — PUB-601..604
 *
 * Phase 6 publication: SLO dashboard, failure-injection model,
 * token/security review, and legacy Work Mode fanout retirement.
 *
 * Pure domain logic only. No Supabase imports. No mocks.
 */

// ─────────────────────────────────────────────────────────────────────────────
// PUB-601 — Publication SLO dashboard
// ─────────────────────────────────────────────────────────────────────────────

export interface PublicationSloMetrics {
  orgId: string;
  queueAgeP95Seconds: number;
  successRatePct: number;
  providerLatencyP95Ms: number;
  providerErrorRatePct: number;
  retryCount: number;
  deadLetterCount: number;
  openRatePct: number;
  ackRatePct: number;
  staleOfflineClientCount: number;
  unauthorizedTokenAttempts: number;
  measuredAt: string;
}

export interface PublicationSloThresholds {
  maxQueueAgeP95Seconds: number;
  minSuccessRatePct: number;
  maxProviderLatencyP95Ms: number;
  maxProviderErrorRatePct: number;
  maxDeadLetterCount: number;
  minOpenRatePct: number;
  minAckRatePct: number;
  maxStaleOfflineClientCount: number;
  maxUnauthorizedTokenAttempts: number;
}

export interface PublicationSloViolation {
  metric: string;
  actual: number;
  threshold: number;
  severity: "warning" | "critical";
}

export function evaluatePublicationSlo(
  metrics: PublicationSloMetrics,
  thresholds: PublicationSloThresholds,
): PublicationSloViolation[] {
  const violations: PublicationSloViolation[] = [];

  const check = (
    metric: string,
    actual: number,
    threshold: number,
    exceedIsViolation: boolean,
    severity: "warning" | "critical",
  ) => {
    const violated = exceedIsViolation ? actual > threshold : actual < threshold;
    if (violated) violations.push({ metric, actual, threshold, severity });
  };

  check("queue_age_p95_seconds", metrics.queueAgeP95Seconds, thresholds.maxQueueAgeP95Seconds, true, "warning");
  check("success_rate_pct", metrics.successRatePct, thresholds.minSuccessRatePct, false, "critical");
  check("provider_latency_p95_ms", metrics.providerLatencyP95Ms, thresholds.maxProviderLatencyP95Ms, true, "warning");
  check("provider_error_rate_pct", metrics.providerErrorRatePct, thresholds.maxProviderErrorRatePct, true, "critical");
  check("dead_letter_count", metrics.deadLetterCount, thresholds.maxDeadLetterCount, true, "critical");
  check("open_rate_pct", metrics.openRatePct, thresholds.minOpenRatePct, false, "warning");
  check("ack_rate_pct", metrics.ackRatePct, thresholds.minAckRatePct, false, "warning");
  check("stale_offline_clients", metrics.staleOfflineClientCount, thresholds.maxStaleOfflineClientCount, true, "warning");
  check("unauthorized_token_attempts", metrics.unauthorizedTokenAttempts, thresholds.maxUnauthorizedTokenAttempts, true, "critical");

  return violations;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUB-602 — Failure-injection tests model
// ─────────────────────────────────────────────────────────────────────────────

export type PublicationFailureScenario =
  | "database_failure"
  | "outbox_failure"
  | "provider_failure"
  | "offline_package_failure";

export type PublicationFailureProperty =
  | "no_publication_lost"
  | "no_duplicate_recipients"
  | "no_false_success"
  | "no_audience_content_leak";

export interface PublicationFailureInjectionResult {
  scenario: PublicationFailureScenario;
  property: PublicationFailureProperty;
  held: boolean;
  notes?: string;
}

export function buildFailureInjectionSummary(results: PublicationFailureInjectionResult[]): {
  totalChecks: number;
  passed: number;
  failed: number;
  allPropertiesHeld: boolean;
  failedItems: PublicationFailureInjectionResult[];
} {
  const failed = results.filter(r => !r.held);
  return {
    totalChecks: results.length,
    passed: results.filter(r => r.held).length,
    failed: failed.length,
    allPropertiesHeld: failed.length === 0,
    failedItems: failed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUB-603 — Token/security review
// ─────────────────────────────────────────────────────────────────────────────

export type PublicationTokenSecurityCheck =
  | "enumeration_resistance"
  | "replay_rejection"
  | "referrer_leakage_absent"
  | "cache_headers_correct"
  | "brute_force_throttled"
  | "passcode_throttled"
  | "revocation_effective"
  | "download_expectation_set"
  | "child_asset_scoped";

export interface PublicationTokenSecurityCheckResult {
  check: PublicationTokenSecurityCheck;
  passed: boolean;
  finding?: string;
  severity: "blocker" | "high" | "medium";
}

export function evaluatePublicationTokenSecurity(
  results: PublicationTokenSecurityCheckResult[],
): { allPassed: boolean; blockers: PublicationTokenSecurityCheckResult[]; highs: PublicationTokenSecurityCheckResult[]; releasable: boolean } {
  const blockers = results.filter(r => !r.passed && r.severity === "blocker");
  const highs = results.filter(r => !r.passed && r.severity === "high");
  return {
    allPassed: results.every(r => r.passed),
    blockers,
    highs,
    releasable: blockers.length === 0 && highs.length === 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUB-604 — Retire legacy Work Mode fanout
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkModeFanoutRetirementStatus {
  /** All canonical assignments are present and complete */
  canonicalAssignmentsComplete: boolean;
  /** All canonical deliveries match expected recipients */
  canonicalDeliveriesComplete: boolean;
  /** Legacy insert code paths have been removed */
  legacyInsertsRemoved: boolean;
  /** Status-only publish path (non-canonical) has been removed */
  statusOnlyPublishPathRemoved: boolean;
  comparisonReportApproved: boolean;
}

export function evaluateWorkModeFanoutRetirement(status: WorkModeFanoutRetirementStatus): {
  canRetire: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (!status.canonicalAssignmentsComplete) blockers.push("Canonical assignments not complete");
  if (!status.canonicalDeliveriesComplete) blockers.push("Canonical deliveries not complete");
  if (!status.legacyInsertsRemoved) blockers.push("Legacy inserts not removed");
  if (!status.statusOnlyPublishPathRemoved) blockers.push("Status-only publish path not removed");
  if (!status.comparisonReportApproved) blockers.push("Comparison report not approved");
  return { canRetire: blockers.length === 0, blockers };
}
