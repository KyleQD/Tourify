/**
 * TOUR-301 — Tour health/risk aggregation tests.
 *
 * Acceptance criteria:
 *  - Each signal has source, severity, threshold, owner, freshness, and
 *    remediation URL.
 *  - Unknown/dependency failure is not scored as healthy.
 *  - Aggregation rules: error → unhealthy; unknown → degraded; warning → at_risk;
 *    all ok → healthy; empty → degraded.
 */

import { describe, it, expect } from "vitest"
import {
  aggregateHealthStatus,
  buildTourHealthSummary,
  buildSignal,
  evaluateThreshold,
  isSignalStale,
  signalsByDomain,
  domainHealthStatus,
  type TourHealthSignal,
  type HealthSignalDomain,
} from "@/lib/admin/tour-health-aggregation"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-07-20T10:00:00.000Z"
const FRESH = "2026-07-20T09:30:00.000Z" // 30 min ago

function makeSignal(
  id: string,
  severity: TourHealthSignal["severity"],
  source: HealthSignalDomain = "route",
  overrides: Partial<TourHealthSignal> = {},
): TourHealthSignal {
  return {
    signal_id: id,
    label: `Signal ${id}`,
    source,
    severity,
    threshold: { type: "count_lte", value: 0 },
    observed_value: severity === "ok" ? 0 : severity === "unknown" ? null : 1,
    owner: source,
    evaluated_at: FRESH,
    is_stale: false,
    remediationUrl: `/admin/dashboard/tours/t1`,
    detail: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// aggregateHealthStatus
// ---------------------------------------------------------------------------

describe("aggregateHealthStatus", () => {
  it("returns 'healthy' when all signals are ok", () => {
    expect(aggregateHealthStatus([makeSignal("a", "ok"), makeSignal("b", "ok")])).toBe("healthy")
  })

  it("returns 'at_risk' when any signal is warning", () => {
    expect(aggregateHealthStatus([makeSignal("a", "ok"), makeSignal("b", "warning")])).toBe("at_risk")
  })

  it("returns 'unhealthy' when any signal is error", () => {
    expect(aggregateHealthStatus([makeSignal("a", "ok"), makeSignal("b", "error")])).toBe("unhealthy")
  })

  it("returns 'unhealthy' even if there are also warnings (error wins)", () => {
    expect(
      aggregateHealthStatus([makeSignal("a", "warning"), makeSignal("b", "error")]),
    ).toBe("unhealthy")
  })

  it("returns 'degraded' when any signal is unknown", () => {
    expect(aggregateHealthStatus([makeSignal("a", "ok"), makeSignal("b", "unknown")])).toBe("degraded")
  })

  it("returns 'degraded' for empty signal list (no data ≠ healthy)", () => {
    expect(aggregateHealthStatus([])).toBe("degraded")
  })

  it("returns 'unhealthy' when error and unknown both present (error > unknown)", () => {
    expect(
      aggregateHealthStatus([makeSignal("a", "error"), makeSignal("b", "unknown")]),
    ).toBe("unhealthy")
  })

  it("unknown is never scored as healthy even alone", () => {
    expect(aggregateHealthStatus([makeSignal("a", "unknown")])).toBe("degraded")
  })
})

// ---------------------------------------------------------------------------
// buildTourHealthSummary
// ---------------------------------------------------------------------------

describe("buildTourHealthSummary", () => {
  it("populates errors, warnings, unknown, stale buckets", () => {
    const signals = [
      makeSignal("e1", "error"),
      makeSignal("w1", "warning"),
      makeSignal("u1", "unknown"),
      makeSignal("ok1", "ok"),
    ]
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    expect(summary.errors).toHaveLength(1)
    expect(summary.warnings).toHaveLength(1)
    expect(summary.unknown).toHaveLength(1)
  })

  it("populates stale bucket", () => {
    const staleSignal = makeSignal("stale", "ok", "route", { is_stale: true })
    const summary = buildTourHealthSummary({ tourId: "t1", signals: [staleSignal] })
    expect(summary.stale).toHaveLength(1)
  })

  it("computes oldest and newest evaluation timestamps", () => {
    const signals = [
      makeSignal("a", "ok", "route", { evaluated_at: "2026-07-20T08:00:00Z" }),
      makeSignal("b", "ok", "route", { evaluated_at: "2026-07-20T09:30:00Z" }),
    ]
    const summary = buildTourHealthSummary({ tourId: "t1", signals })
    expect(summary.oldest_evaluation).toBe("2026-07-20T08:00:00Z")
    expect(summary.newest_evaluation).toBe("2026-07-20T09:30:00Z")
  })

  it("handles empty signal list gracefully", () => {
    const summary = buildTourHealthSummary({ tourId: "t1", signals: [] })
    expect(summary.status).toBe("degraded")
    expect(summary.oldest_evaluation).toBeNull()
    expect(summary.newest_evaluation).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// evaluateThreshold
// ---------------------------------------------------------------------------

describe("evaluateThreshold", () => {
  it("count_lte: ok when value <= threshold", () => {
    expect(evaluateThreshold({ type: "count_lte", value: 5 }, 3)).toBe("ok")
    expect(evaluateThreshold({ type: "count_lte", value: 5 }, 5)).toBe("ok")
  })

  it("count_lte: error when value > threshold", () => {
    expect(evaluateThreshold({ type: "count_lte", value: 5 }, 6)).toBe("error")
  })

  it("count_gte: ok when value >= threshold", () => {
    expect(evaluateThreshold({ type: "count_gte", value: 1 }, 3)).toBe("ok")
    expect(evaluateThreshold({ type: "count_gte", value: 3 }, 3)).toBe("ok")
  })

  it("count_gte: error when value < threshold", () => {
    expect(evaluateThreshold({ type: "count_gte", value: 3 }, 2)).toBe("error")
  })

  it("count_eq: ok when values match", () => {
    expect(evaluateThreshold({ type: "count_eq", value: 0 }, 0)).toBe("ok")
  })

  it("count_eq: error when values differ", () => {
    expect(evaluateThreshold({ type: "count_eq", value: 0 }, 1)).toBe("error")
  })

  it("bool_true: ok when true", () => {
    expect(evaluateThreshold({ type: "bool_true" }, true)).toBe("ok")
  })

  it("bool_true: error when false", () => {
    expect(evaluateThreshold({ type: "bool_true" }, false)).toBe("error")
  })

  it("bool_false: ok when false", () => {
    expect(evaluateThreshold({ type: "bool_false" }, false)).toBe("ok")
  })

  it("bool_false: error when true", () => {
    expect(evaluateThreshold({ type: "bool_false" }, true)).toBe("error")
  })

  it("age_minutes_lte: ok when within threshold", () => {
    expect(evaluateThreshold({ type: "age_minutes_lte", value: 60 }, 30)).toBe("ok")
  })

  it("age_minutes_lte: warning when over threshold", () => {
    expect(evaluateThreshold({ type: "age_minutes_lte", value: 60 }, 90)).toBe("warning")
  })

  it("returns unknown when observed_value is null", () => {
    expect(evaluateThreshold({ type: "count_lte", value: 0 }, null)).toBe("unknown")
  })
})

// ---------------------------------------------------------------------------
// isSignalStale
// ---------------------------------------------------------------------------

describe("isSignalStale", () => {
  it("fresh signal is not stale", () => {
    expect(isSignalStale("2026-07-20T09:30:00Z", 60, NOW)).toBe(false)
  })

  it("old signal is stale", () => {
    expect(isSignalStale("2026-07-20T08:00:00Z", 60, NOW)).toBe(true)
  })

  it("null evaluated_at is always stale", () => {
    expect(isSignalStale(null, 60, NOW)).toBe(true)
  })

  it("exactly at threshold is not stale", () => {
    // NOW is 2026-07-20T10:00:00Z, threshold 90 min → OK until 08:30
    expect(isSignalStale("2026-07-20T08:30:00Z", 90, NOW)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildSignal
// ---------------------------------------------------------------------------

describe("buildSignal", () => {
  it("builds a complete signal with severity derived from threshold", () => {
    const sig = buildSignal({
      signal_id: "route.errors",
      label: "Route errors",
      source: "route",
      owner: "route",
      threshold: { type: "count_lte", value: 0 },
      observedValue: 2,
      evaluated_at: FRESH,
      remediationUrl: "/admin/dashboard/tours/t1/route",
      nowIso: NOW,
    })
    expect(sig.severity).toBe("error")
    expect(sig.observed_value).toBe(2)
    expect(sig.is_stale).toBe(false)
    expect(sig.remediationUrl).toBeTruthy()
  })

  it("builds an unknown signal when observed_value is null", () => {
    const sig = buildSignal({
      signal_id: "plan.readiness",
      label: "Plan readiness",
      source: "plan",
      owner: "plan",
      threshold: { type: "bool_true" },
      observedValue: null,
      evaluated_at: FRESH,
      remediationUrl: "/admin/dashboard/tours/t1/plan",
      nowIso: NOW,
    })
    expect(sig.severity).toBe("unknown")
  })

  it("marks stale signal when evaluated_at is old", () => {
    const sig = buildSignal({
      signal_id: "s",
      label: "L",
      source: "system",
      owner: "system",
      threshold: { type: "count_lte", value: 0 },
      observedValue: 0,
      evaluated_at: "2026-07-20T06:00:00Z", // 4h ago
      maxAgeMinutes: 60,
      remediationUrl: "/admin",
      nowIso: NOW,
    })
    expect(sig.is_stale).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// signalsByDomain / domainHealthStatus
// ---------------------------------------------------------------------------

describe("signalsByDomain", () => {
  it("filters to matching domain", () => {
    const signals = [
      makeSignal("a", "error", "route"),
      makeSignal("b", "ok", "plan"),
    ]
    expect(signalsByDomain(signals, "route")).toHaveLength(1)
    expect(signalsByDomain(signals, "plan")).toHaveLength(1)
  })
})

describe("domainHealthStatus", () => {
  it("returns healthy when all domain signals are ok", () => {
    const signals = [makeSignal("a", "ok", "route"), makeSignal("b", "ok", "route")]
    expect(domainHealthStatus(signals, "route")).toBe("healthy")
  })

  it("returns degraded for domain with no signals", () => {
    const signals = [makeSignal("a", "ok", "plan")]
    expect(domainHealthStatus(signals, "route")).toBe("degraded")
  })

  it("returns unhealthy when domain has error signal", () => {
    const signals = [makeSignal("a", "error", "workforce")]
    expect(domainHealthStatus(signals, "workforce")).toBe("unhealthy")
  })
})
