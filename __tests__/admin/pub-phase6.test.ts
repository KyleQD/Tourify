import { describe, it, expect } from "vitest"
import {
  evaluatePublicationSlo,
  buildFailureInjectionSummary,
  evaluatePublicationTokenSecurity,
  evaluateWorkModeFanoutRetirement,
  type PublicationSloMetrics,
  type PublicationSloThresholds,
  type PublicationFailureInjectionResult,
  type PublicationTokenSecurityCheckResult,
  type WorkModeFanoutRetirementStatus,
} from "@/lib/admin/pub-phase6"

// ── PUB-601: Publication SLO dashboard ───────────────────────────────────────

describe("PUB-601 – evaluatePublicationSlo", () => {
  const healthyMetrics = (): PublicationSloMetrics => ({
    orgId: "o1", queueAgeP95Seconds: 5, successRatePct: 99.5,
    providerLatencyP95Ms: 400, providerErrorRatePct: 0.1, retryCount: 2,
    deadLetterCount: 0, openRatePct: 70, ackRatePct: 65,
    staleOfflineClientCount: 0, unauthorizedTokenAttempts: 0,
    measuredAt: "2026-01-01T00:00:00Z",
  })

  const thresholds: PublicationSloThresholds = {
    maxQueueAgeP95Seconds: 30, minSuccessRatePct: 99, maxProviderLatencyP95Ms: 2000,
    maxProviderErrorRatePct: 5, maxDeadLetterCount: 0, minOpenRatePct: 40,
    minAckRatePct: 40, maxStaleOfflineClientCount: 10, maxUnauthorizedTokenAttempts: 5,
  }

  it("no violations for healthy metrics", () => {
    const v = evaluatePublicationSlo(healthyMetrics(), thresholds)
    expect(v).toHaveLength(0)
  })

  it("critical violation on success rate breach", () => {
    const v = evaluatePublicationSlo({ ...healthyMetrics(), successRatePct: 95 }, thresholds)
    expect(v.some(x => x.metric === "success_rate_pct" && x.severity === "critical")).toBe(true)
  })

  it("critical violation on dead letter count", () => {
    const v = evaluatePublicationSlo({ ...healthyMetrics(), deadLetterCount: 3 }, thresholds)
    expect(v.some(x => x.metric === "dead_letter_count" && x.severity === "critical")).toBe(true)
  })

  it("critical violation on unauthorized token attempts", () => {
    const v = evaluatePublicationSlo({ ...healthyMetrics(), unauthorizedTokenAttempts: 10 }, thresholds)
    expect(v.some(x => x.metric === "unauthorized_token_attempts" && x.severity === "critical")).toBe(true)
  })

  it("warning violation on queue age breach", () => {
    const v = evaluatePublicationSlo({ ...healthyMetrics(), queueAgeP95Seconds: 60 }, thresholds)
    expect(v.some(x => x.metric === "queue_age_p95_seconds" && x.severity === "warning")).toBe(true)
  })

  it("warning violation on stale offline clients", () => {
    const v = evaluatePublicationSlo({ ...healthyMetrics(), staleOfflineClientCount: 15 }, thresholds)
    expect(v.some(x => x.metric === "stale_offline_clients")).toBe(true)
  })
})

// ── PUB-602: Failure-injection tests model ────────────────────────────────────

describe("PUB-602 – buildFailureInjectionSummary", () => {
  const allHeld = (): PublicationFailureInjectionResult[] => [
    { scenario: "database_failure", property: "no_publication_lost", held: true },
    { scenario: "outbox_failure", property: "no_duplicate_recipients", held: true },
    { scenario: "provider_failure", property: "no_false_success", held: true },
    { scenario: "offline_package_failure", property: "no_audience_content_leak", held: true },
  ]

  it("allPropertiesHeld=true when all held", () => {
    const r = buildFailureInjectionSummary(allHeld())
    expect(r.allPropertiesHeld).toBe(true)
    expect(r.passed).toBe(4)
    expect(r.failed).toBe(0)
  })

  it("allPropertiesHeld=false when any not held", () => {
    const results = allHeld()
    results[2] = { scenario: "provider_failure", property: "no_false_success", held: false }
    const r = buildFailureInjectionSummary(results)
    expect(r.allPropertiesHeld).toBe(false)
    expect(r.failedItems).toHaveLength(1)
  })
})

// ── PUB-603: Token/security review ────────────────────────────────────────────

describe("PUB-603 – evaluatePublicationTokenSecurity", () => {
  const allPassed = (): PublicationTokenSecurityCheckResult[] => [
    { check: "enumeration_resistance", passed: true, severity: "blocker" },
    { check: "replay_rejection", passed: true, severity: "blocker" },
    { check: "referrer_leakage_absent", passed: true, severity: "high" },
    { check: "cache_headers_correct", passed: true, severity: "medium" },
    { check: "brute_force_throttled", passed: true, severity: "blocker" },
    { check: "passcode_throttled", passed: true, severity: "blocker" },
    { check: "revocation_effective", passed: true, severity: "blocker" },
    { check: "download_expectation_set", passed: true, severity: "medium" },
    { check: "child_asset_scoped", passed: true, severity: "high" },
  ]

  it("releasable=true when all checks pass", () => {
    const r = evaluatePublicationTokenSecurity(allPassed())
    expect(r.releasable).toBe(true)
    expect(r.allPassed).toBe(true)
  })

  it("releasable=false when a blocker fails", () => {
    const results = allPassed()
    results[0] = { check: "enumeration_resistance", passed: false, severity: "blocker" }
    const r = evaluatePublicationTokenSecurity(results)
    expect(r.releasable).toBe(false)
    expect(r.blockers).toHaveLength(1)
  })

  it("releasable=false when a high check fails", () => {
    const results = allPassed()
    results[2] = { check: "referrer_leakage_absent", passed: false, severity: "high" }
    const r = evaluatePublicationTokenSecurity(results)
    expect(r.releasable).toBe(false)
    expect(r.highs).toHaveLength(1)
  })

  it("releasable=true when only medium checks fail", () => {
    const results = allPassed()
    results[3] = { check: "cache_headers_correct", passed: false, severity: "medium" }
    const r = evaluatePublicationTokenSecurity(results)
    expect(r.releasable).toBe(true)
    expect(r.allPassed).toBe(false)
  })
})

// ── PUB-604: Retire legacy Work Mode fanout ───────────────────────────────────

describe("PUB-604 – evaluateWorkModeFanoutRetirement", () => {
  const ready = (): WorkModeFanoutRetirementStatus => ({
    canonicalAssignmentsComplete: true,
    canonicalDeliveriesComplete: true,
    legacyInsertsRemoved: true,
    statusOnlyPublishPathRemoved: true,
    comparisonReportApproved: true,
  })

  it("canRetire=true when all conditions met", () => {
    const r = evaluateWorkModeFanoutRetirement(ready())
    expect(r.canRetire).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it("blocks when canonical assignments not complete", () => {
    const r = evaluateWorkModeFanoutRetirement({ ...ready(), canonicalAssignmentsComplete: false })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("Canonical assignments"))).toBe(true)
  })

  it("blocks when legacy inserts not removed", () => {
    const r = evaluateWorkModeFanoutRetirement({ ...ready(), legacyInsertsRemoved: false })
    expect(r.canRetire).toBe(false)
  })

  it("blocks when status-only publish path not removed", () => {
    const r = evaluateWorkModeFanoutRetirement({ ...ready(), statusOnlyPublishPathRemoved: false })
    expect(r.canRetire).toBe(false)
  })
})
