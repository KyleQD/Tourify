import { describe, it, expect } from "vitest"
import {
  evaluatePlanMigrationReconciliation,
  buildPlanMigrationReport,
  assessPlannerLegacyItemRetirement,
  buildPlannerRetirementSummary,
  evaluateRouteMetrics,
  type PlanMigrationComparison,
  type PlannerLegacyItem,
  type RouteMetrics,
  type RouteAlertThresholds,
} from "@/lib/admin/plan-route-phase6"

// ── PLAN-602: Migration reconciliation ───────────────────────────────────────

describe("PLAN-602 – evaluatePlanMigrationReconciliation", () => {
  const cleanComparison = (): PlanMigrationComparison => ({
    tourId: "t1", orgId: "o1",
    legacyStopCount: 5, canonicalStopCount: 5, matchingStopCount: 5,
    unexplainedDifferences: [], legacyWritesStopped: true,
    comparisonRunAt: "2026-01-01T00:00:00Z",
  })

  it("reconciled=true when counts match and no differences", () => {
    const r = evaluatePlanMigrationReconciliation(cleanComparison())
    expect(r.reconciled).toBe(true)
    expect(r.canStopLegacyWrites).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it("blocks when stop counts differ", () => {
    const r = evaluatePlanMigrationReconciliation({ ...cleanComparison(), canonicalStopCount: 4 })
    expect(r.reconciled).toBe(false)
    expect(r.blockers.some(b => b.includes("mismatch"))).toBe(true)
  })

  it("blocks when unexplained differences exist", () => {
    const r = evaluatePlanMigrationReconciliation({
      ...cleanComparison(),
      unexplainedDifferences: [{ stopId: "s1", field: "date", legacyValue: "2026-06-01", canonicalValue: "2026-06-02" }],
    })
    expect(r.reconciled).toBe(false)
    expect(r.blockers.some(b => b.includes("unexplained"))).toBe(true)
  })
})

describe("PLAN-602 – buildPlanMigrationReport", () => {
  const clean = (id: string): PlanMigrationComparison => ({
    tourId: id, orgId: "o1",
    legacyStopCount: 3, canonicalStopCount: 3, matchingStopCount: 3,
    unexplainedDifferences: [], legacyWritesStopped: true,
    comparisonRunAt: "2026-01-01T00:00:00Z",
  })

  it("allReconciled=true when all comparisons reconcile", () => {
    const r = buildPlanMigrationReport([clean("t1"), clean("t2")])
    expect(r.allReconciled).toBe(true)
    expect(r.reconciled).toBe(2)
  })

  it("reports unreconciled tour IDs", () => {
    const bad: PlanMigrationComparison = { ...clean("t3"), canonicalStopCount: 2 }
    const r = buildPlanMigrationReport([clean("t1"), bad])
    expect(r.allReconciled).toBe(false)
    expect(r.unreconciledTourIds).toContain("t3")
  })
})

// ── PLAN-603: Retire old planner components ───────────────────────────────────

describe("PLAN-603 – assessPlannerLegacyItemRetirement", () => {
  const readyItem = (): PlannerLegacyItem => ({
    itemId: "i1", itemType: "component", identifier: "PlannerLegacyEditor",
    telemetryUsageLast30d: 0, featureFlagRemoved: true,
    codeDeleted: true, onlyCanonicalCommandsRemain: true,
  })

  it("canRetire=true when all conditions met", () => {
    expect(assessPlannerLegacyItemRetirement(readyItem()).canRetire).toBe(true)
  })

  it("blocks on active telemetry", () => {
    const r = assessPlannerLegacyItemRetirement({ ...readyItem(), telemetryUsageLast30d: 7 })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("7 uses"))).toBe(true)
  })

  it("blocks when feature flag not removed", () => {
    expect(assessPlannerLegacyItemRetirement({ ...readyItem(), featureFlagRemoved: false }).canRetire).toBe(false)
  })

  it("blocks when code not deleted", () => {
    expect(assessPlannerLegacyItemRetirement({ ...readyItem(), codeDeleted: false }).canRetire).toBe(false)
  })

  it("blocks when non-canonical commands remain", () => {
    expect(assessPlannerLegacyItemRetirement({ ...readyItem(), onlyCanonicalCommandsRemain: false }).canRetire).toBe(false)
  })
})

describe("PLAN-603 – buildPlannerRetirementSummary", () => {
  const make = (id: string, ready: boolean): PlannerLegacyItem => ({
    itemId: id, itemType: "write_path", identifier: id,
    telemetryUsageLast30d: ready ? 0 : 3, featureFlagRemoved: ready,
    codeDeleted: ready, onlyCanonicalCommandsRemain: ready,
  })

  it("allClear=true when all items ready", () => {
    const r = buildPlannerRetirementSummary([make("a", true), make("b", true)])
    expect(r.allClear).toBe(true)
  })

  it("allClear=false when any item blocked", () => {
    const r = buildPlannerRetirementSummary([make("a", true), make("b", false)])
    expect(r.allClear).toBe(false)
    expect(r.blocked).toBe(1)
  })
})

// ── ROUTE-601: Route metrics and alerting ────────────────────────────────────

describe("ROUTE-601 – evaluateRouteMetrics", () => {
  const healthyMetrics = (): RouteMetrics => ({
    orgId: "o1", tourId: "t1",
    calculationErrorRate: 0, providerLatencyP95Ms: 500, providerCostPerCall: 100,
    overrideRatePct: 5, unresolvedConflictCount: 0, staleLegCount: 0,
    lastSuccessfulRecomputeAt: "2026-01-01T00:00:00Z",
  })

  const thresholds: RouteAlertThresholds = {
    maxCalculationErrorRate: 2, maxProviderLatencyP95Ms: 2000, maxProviderCostPerCall: 500,
    maxOverrideRatePct: 20, maxUnresolvedConflicts: 0, maxStaleLegCount: 5,
    maxMinutesSinceRecompute: 60,
  }

  it("produces no alerts for healthy metrics", () => {
    const alerts = evaluateRouteMetrics(healthyMetrics(), thresholds, "2026-01-01T00:30:00Z")
    expect(alerts).toHaveLength(0)
  })

  it("raises critical alert on calculation error rate breach", () => {
    const alerts = evaluateRouteMetrics({ ...healthyMetrics(), calculationErrorRate: 5 }, thresholds, "2026-01-01T00:30:00Z")
    expect(alerts.some(a => a.alertType === "calculation_error" && a.severity === "critical")).toBe(true)
  })

  it("raises warning on provider latency breach", () => {
    const alerts = evaluateRouteMetrics({ ...healthyMetrics(), providerLatencyP95Ms: 2500 }, thresholds, "2026-01-01T00:30:00Z")
    expect(alerts.some(a => a.alertType === "provider_latency_high")).toBe(true)
  })

  it("raises critical alert on unresolved conflicts", () => {
    const alerts = evaluateRouteMetrics({ ...healthyMetrics(), unresolvedConflictCount: 2 }, thresholds, "2026-01-01T00:30:00Z")
    expect(alerts.some(a => a.alertType === "unresolved_conflict" && a.severity === "critical")).toBe(true)
  })

  it("raises warning when last recompute is overdue", () => {
    // 90 min later, threshold is 60
    const alerts = evaluateRouteMetrics(healthyMetrics(), thresholds, "2026-01-01T01:30:00Z")
    expect(alerts.some(a => a.alertType === "last_recompute_overdue")).toBe(true)
  })

  it("raises warning on stale legs", () => {
    const alerts = evaluateRouteMetrics({ ...healthyMetrics(), staleLegCount: 10 }, thresholds, "2026-01-01T00:30:00Z")
    expect(alerts.some(a => a.alertType === "stale_legs")).toBe(true)
  })

  it("raises warning on high override rate", () => {
    const alerts = evaluateRouteMetrics({ ...healthyMetrics(), overrideRatePct: 25 }, thresholds, "2026-01-01T00:30:00Z")
    expect(alerts.some(a => a.alertType === "override_rate_high")).toBe(true)
  })
})
