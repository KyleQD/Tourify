import { describe, it, expect } from "vitest"
import {
  evaluateCalSourceHealth,
  evaluateCommsDeliveryMetric,
  evaluateNotificationFatigue,
  DEFAULT_FATIGUE_POLICY,
  auditDeliveryPath,
  buildRlsMatrixSummary,
  evaluateAuthMetric,
  buildSecPenTestReview,
  buildAccessReviewSummary,
  evaluateRetentionEligibility,
  type CalSourceHealth,
  type CommsDeliveryMetric,
  type RlsMatrixResult,
  type AuthObservabilityMetric,
  type SecPenTestFinding,
  type OrgMemberAccessRecord,
  type AccessReviewDecision,
  type RetentionEligibleRecord,
  type RetentionPolicy,
} from "@/lib/admin/comms-sec-phase6"

// ── CAL-601: Calendar freshness/SLO monitoring ────────────────────────────────

describe("CAL-601 – evaluateCalSourceHealth", () => {
  const health = (): CalSourceHealth => ({
    sourceType: "tour_events", orgId: "o1",
    lagSeconds: 0, lastSuccessAt: "2026-01-01T00:00:00Z", errorCount: 0,
    queryLatencyMs: 100, feedTokenFailures: 0, invalidTimezoneEvents: 0,
    syncErrors: 0, clientErrors: 0, alertsRaised: [],
  })

  const thresholds = { maxLagSeconds: 30, maxQueryLatencyMs: 2000, feedTokenFailureThreshold: 3 }

  it("returns empty alerts for healthy source", () => {
    expect(evaluateCalSourceHealth(health(), thresholds, "2026-01-01T00:00:00Z")).toHaveLength(0)
  })

  it("raises lag_exceeded warning when lag exceeds threshold", () => {
    const alerts = evaluateCalSourceHealth({ ...health(), lagSeconds: 60 }, thresholds, "2026-01-01T00:00:00Z")
    expect(alerts.some(a => a.alertType === "lag_exceeded" && a.severity === "warning")).toBe(true)
  })

  it("raises feed_token_failure critical when failures at threshold", () => {
    const alerts = evaluateCalSourceHealth({ ...health(), feedTokenFailures: 3 }, thresholds, "2026-01-01T00:00:00Z")
    expect(alerts.some(a => a.alertType === "feed_token_failure" && a.severity === "critical")).toBe(true)
  })

  it("raises invalid_timezone warning", () => {
    const alerts = evaluateCalSourceHealth({ ...health(), invalidTimezoneEvents: 1 }, thresholds, "2026-01-01T00:00:00Z")
    expect(alerts.some(a => a.alertType === "invalid_timezone")).toBe(true)
  })

  it("raises query_latency_exceeded warning", () => {
    const alerts = evaluateCalSourceHealth({ ...health(), queryLatencyMs: 3000 }, thresholds, "2026-01-01T00:00:00Z")
    expect(alerts.some(a => a.alertType === "query_latency_exceeded")).toBe(true)
  })
})

// ── COMMS-601: Delivery observability ────────────────────────────────────────

describe("COMMS-601 – evaluateCommsDeliveryMetric", () => {
  const metric = (type: CommsDeliveryMetric["metricType"], value: number): CommsDeliveryMetric => ({
    metricType: type, orgId: "o1", value, isActionable: true, measuredAt: "2026-01-01T00:00:00Z",
  })

  it("no alert when below threshold", () => {
    const r = evaluateCommsDeliveryMetric(metric("dead_letter_count", 0), { dead_letter_count: 5 })
    expect(r.alert).toBe(false)
  })

  it("critical alert on dead_letter_count exceeding threshold", () => {
    const r = evaluateCommsDeliveryMetric(metric("dead_letter_count", 6), { dead_letter_count: 5 })
    expect(r.alert).toBe(true)
    expect(r.severity).toBe("critical")
  })

  it("critical alert on provider_failure_count exceeding threshold", () => {
    const r = evaluateCommsDeliveryMetric(metric("provider_failure_count", 10), { provider_failure_count: 5 })
    expect(r.alert).toBe(true)
    expect(r.severity).toBe("critical")
  })

  it("warning when open_rate drops below threshold", () => {
    const r = evaluateCommsDeliveryMetric(metric("open_rate_pct", 20), { open_rate_pct: 30 })
    expect(r.alert).toBe(true)
  })

  it("no alert when no threshold configured", () => {
    const r = evaluateCommsDeliveryMetric(metric("queue_age_seconds", 100), {})
    expect(r.alert).toBe(false)
  })
})

// ── COMMS-602: Notification fatigue rules ─────────────────────────────────────

describe("COMMS-602 – evaluateNotificationFatigue", () => {
  const base = {
    recipientId: "r1", localHour: 14,
    recentCountInBurstWindow: 0, recentCountInDigestWindow: 0,
    isDuplicate: false, policy: DEFAULT_FATIGUE_POLICY,
  }

  it("sends standard notification in normal conditions", () => {
    const r = evaluateNotificationFatigue({ ...base, category: "standard" })
    expect(r.wouldSend).toBe(true)
  })

  it("critical notification bypasses all suppression", () => {
    const r = evaluateNotificationFatigue({ ...base, category: "critical", localHour: 23, recentCountInBurstWindow: 10 })
    expect(r.wouldSend).toBe(true)
    expect(r.reason).toBe("critical_bypass")
  })

  it("suppresses duplicate", () => {
    const r = evaluateNotificationFatigue({ ...base, category: "standard", isDuplicate: true })
    expect(r.wouldSend).toBe(false)
    expect(r.suppressedByDedup).toBe(true)
  })

  it("suppresses during burst window", () => {
    const r = evaluateNotificationFatigue({ ...base, category: "standard", recentCountInBurstWindow: 3 })
    expect(r.wouldSend).toBe(false)
    expect(r.suppressedByBurst).toBe(true)
  })

  it("suppresses low_value during digest window", () => {
    const r = evaluateNotificationFatigue({ ...base, category: "low_value" })
    expect(r.wouldSend).toBe(false)
    expect(r.suppressedByDigest).toBe(true)
  })

  it("suppresses standard during quiet hours", () => {
    const r = evaluateNotificationFatigue({ ...base, category: "standard", localHour: 23 })
    expect(r.wouldSend).toBe(false)
    expect(r.suppressedByQuietHour).toBe(true)
  })
})

// ── COMMS-603: Retire duplicate delivery paths ────────────────────────────────

describe("COMMS-603 – auditDeliveryPath", () => {
  const ready = () => ({
    pathType: "work_mode" as const,
    usesCanonicalAudience: true,
    usesCanonicalDeliveryStatus: true,
    legacyFireAndForgetWritesRemoved: true,
  })

  it("canRetire=true when all conditions met", () => {
    expect(auditDeliveryPath(ready()).canRetire).toBe(true)
  })

  it("blocks when not using canonical audience", () => {
    const r = auditDeliveryPath({ ...ready(), usesCanonicalAudience: false })
    expect(r.canRetire).toBe(false)
  })

  it("blocks when legacy fire-and-forget writes not removed", () => {
    const r = auditDeliveryPath({ ...ready(), legacyFireAndForgetWritesRemoved: false })
    expect(r.canRetire).toBe(false)
  })
})

// ── SEC-601: Automated RLS matrix in CI ───────────────────────────────────────

describe("SEC-601 – buildRlsMatrixSummary", () => {
  it("allPassed=true when all results pass", () => {
    const results: RlsMatrixResult[] = [
      { table: "tours", action: "select", persona: "org_a_admin", expected: "allowed", actual: "allowed", passed: true },
      { table: "tours", action: "select", persona: "org_b_admin", expected: "denied", actual: "denied", passed: true },
    ]
    const r = buildRlsMatrixSummary(results)
    expect(r.allPassed).toBe(true)
    expect(r.crossOrgLeaks).toHaveLength(0)
    expect(r.validAccessFailures).toHaveLength(0)
  })

  it("detects cross-org leak (org_b reads org_a data)", () => {
    const results: RlsMatrixResult[] = [
      { table: "tours", action: "select", persona: "org_b_admin", expected: "denied", actual: "allowed", passed: false },
    ]
    const r = buildRlsMatrixSummary(results)
    expect(r.allPassed).toBe(false)
    expect(r.crossOrgLeaks).toHaveLength(1)
  })

  it("detects valid access failure", () => {
    const results: RlsMatrixResult[] = [
      { table: "tours", action: "select", persona: "org_a_admin", expected: "allowed", actual: "denied", passed: false },
    ]
    const r = buildRlsMatrixSummary(results)
    expect(r.validAccessFailures).toHaveLength(1)
  })
})

// ── SEC-602: Authorization observability ────────────────────────────────────

describe("SEC-602 – evaluateAuthMetric", () => {
  const metric = (alertType: AuthObservabilityMetric["alertType"], count: number, threshold: number): AuthObservabilityMetric => ({
    alertType, orgId: "o1", count, windowMinutes: 60, threshold, containsPii: false, raisedAt: "2026-01-01T00:00:00Z",
  })

  it("no alert when below threshold", () => {
    expect(evaluateAuthMetric(metric("denied_spike", 2, 5)).alert).toBe(false)
  })

  it("warning alert on denied_spike above threshold", () => {
    const r = evaluateAuthMetric(metric("denied_spike", 10, 5))
    expect(r.alert).toBe(true)
    expect(r.severity).toBe("warning")
  })

  it("critical alert on audit_write_failure", () => {
    const r = evaluateAuthMetric(metric("audit_write_failure", 1, 0))
    expect(r.alert).toBe(true)
    expect(r.severity).toBe("critical")
  })
})

// ── SEC-603: Security review / pen test ─────────────────────────────────────

describe("SEC-603 – buildSecPenTestReview", () => {
  const f = (severity: SecPenTestFinding["severity"], resolved: boolean): SecPenTestFinding => ({
    area: "idor", severity, description: "test", resolved,
  })

  it("releasable=true when no unresolved critical/high", () => {
    const r = buildSecPenTestReview("r1", [f("critical", true), f("high", true)], "2026-01-01T00:00:00Z")
    expect(r.releasable).toBe(true)
  })

  it("releasable=false when unresolved critical finding", () => {
    const r = buildSecPenTestReview("r1", [f("critical", false)], "2026-01-01T00:00:00Z")
    expect(r.releasable).toBe(false)
    expect(r.unresolvedCriticalOrHigh).toHaveLength(1)
  })
})

// ── SEC-604: Access review workflow ──────────────────────────────────────────

describe("SEC-604 – buildAccessReviewSummary", () => {
  const member = (id: string): OrgMemberAccessRecord => ({
    memberId: id, role: "admin", entityGrants: [], externalShares: [], recentPrivilegedActions: [],
  })
  const decision = (memberId: string, decision: AccessReviewDecision["decision"]): AccessReviewDecision => ({
    memberId, decision, decidedBy: "reviewer", decidedAt: "2026-01-01T00:00:00Z",
  })

  it("shows pending review for unreviewed members", () => {
    const r = buildAccessReviewSummary("o1", [member("m1"), member("m2")], [decision("m1", "retain")])
    expect(r.pendingReview).toHaveLength(1)
    expect(r.pendingReview[0].memberId).toBe("m2")
  })

  it("includes revoke/downgrade decisions", () => {
    const r = buildAccessReviewSummary("o1", [member("m1")], [decision("m1", "revoke")])
    expect(r.revokeOrDowngrade).toHaveLength(1)
  })
})

// ── SEC-605: Data-retention controls ─────────────────────────────────────────

describe("SEC-605 – evaluateRetentionEligibility", () => {
  const policy: RetentionPolicy = {
    domain: "audit", retainForDays: 365, deletionMethod: "hard_delete",
    legalHoldSupported: true, tested: true,
  }

  const record = (legalHold: boolean, createdAt: string): RetentionEligibleRecord => ({
    id: "r1", domain: "audit", createdAt, legalHold,
  })

  it("not eligible when under legal hold", () => {
    const r = evaluateRetentionEligibility(record(true, "2024-01-01T00:00:00Z"), policy, "2026-01-01T00:00:00Z")
    expect(r.eligible).toBe(false)
    expect(r.reason).toBe("legal_hold")
  })

  it("not eligible when retention period not elapsed", () => {
    const r = evaluateRetentionEligibility(record(false, "2025-12-01T00:00:00Z"), policy, "2026-01-01T00:00:00Z")
    expect(r.eligible).toBe(false)
    expect(r.reason).toMatch(/Retain/)
  })

  it("eligible when retention period has elapsed", () => {
    const r = evaluateRetentionEligibility(record(false, "2024-01-01T00:00:00Z"), policy, "2026-01-01T00:00:00Z")
    expect(r.eligible).toBe(true)
  })
})
