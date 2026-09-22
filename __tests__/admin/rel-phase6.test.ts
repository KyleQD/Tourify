import { describe, it, expect } from "vitest"
import {
  evaluatePerformanceBudget,
  auditFanoutPage,
  buildWcagReviewSummary,
  buildProductionDashboard,
  evaluateBackupRestoreExercise,
  evaluateMigrationRollback,
  buildPenTestReport,
  summarizeLoadTests,
  validateRunbook,
  computeGaReadiness,
  identifyLegacyCodeToRemove,
  type PerformanceBudgetTarget,
  type PerformanceBudgetMeasurement,
  type WcagCheckResult,
  type ProductionSlo,
  type ProductionAlertRule,
  type PenTestFinding,
  type LoadTestResult,
  type OperationalRunbook,
  type GaChecklistItem,
  type LegacyCodeItem,
} from "@/lib/admin/rel-phase6"

// ── REL-601: Performance budgets ──────────────────────────────────────────────

describe("REL-601 – evaluatePerformanceBudget", () => {
  const target: PerformanceBudgetTarget = { metric: "api_p95_ms", p50: 200, p95: 800, unit: "ms" }

  it("within_budget when both measures under budget", () => {
    const m: PerformanceBudgetMeasurement = { metric: "api_p95_ms", p50: 150, p95: 700, unit: "ms", measuredAt: "2026-01-01T00:00:00Z" }
    expect(evaluatePerformanceBudget(target, m).status).toBe("within_budget")
  })

  it("exceeded when p95 over budget", () => {
    const m: PerformanceBudgetMeasurement = { metric: "api_p95_ms", p50: 150, p95: 900, unit: "ms", measuredAt: "2026-01-01T00:00:00Z" }
    const r = evaluatePerformanceBudget(target, m)
    expect(r.status).toBe("exceeded")
    expect(r.violations.some(v => v.includes("p95"))).toBe(true)
  })

  it("at_risk when only p50 is over budget", () => {
    const m: PerformanceBudgetMeasurement = { metric: "api_p95_ms", p50: 250, p95: 700, unit: "ms", measuredAt: "2026-01-01T00:00:00Z" }
    expect(evaluatePerformanceBudget(target, m).status).toBe("at_risk")
  })

  it("exceeded on maxValue breach", () => {
    const t: PerformanceBudgetTarget = { metric: "bundle_kb", maxValue: 300, unit: "KB" }
    const m: PerformanceBudgetMeasurement = { metric: "bundle_kb", measuredValue: 400, unit: "KB", measuredAt: "2026-01-01T00:00:00Z" }
    expect(evaluatePerformanceBudget(t, m).status).toBe("exceeded")
  })
})

// ── REL-602: Refactor high-fanout pages ───────────────────────────────────────

describe("REL-602 – auditFanoutPage", () => {
  it("meetsRequestBudget=true when requestCountAfter <= budget", () => {
    const r = auditFanoutPage({ pageName: "command-center", requestCountBefore: 20, requestCountAfter: 3, bundleKbBefore: 400, bundleKbAfter: 200, usesBff: true, usesDegradedState: true, requestBudget: 5, bundleBudgetKb: 250 })
    expect(r.meetsRequestBudget).toBe(true)
    expect(r.meetsBundleBudget).toBe(true)
  })

  it("meetsRequestBudget=false when over budget", () => {
    const r = auditFanoutPage({ pageName: "tour-list", requestCountBefore: 15, requestCountAfter: 10, bundleKbBefore: 300, bundleKbAfter: 300, usesBff: false, usesDegradedState: false, requestBudget: 5, bundleBudgetKb: 250 })
    expect(r.meetsRequestBudget).toBe(false)
    expect(r.meetsBundleBudget).toBe(false)
  })
})

// ── REL-603: WCAG 2.2 AA review ───────────────────────────────────────────────

describe("REL-603 – buildWcagReviewSummary", () => {
  it("passed=true when no blockers", () => {
    const checks: WcagCheckResult[] = [
      { checkType: "keyboard_navigation", flow: "admin_tour_list", passed: true },
      { checkType: "color_contrast", flow: "admin_tour_list", passed: true },
    ]
    const r = buildWcagReviewSummary(checks, "2026-01-01T00:00:00Z")
    expect(r.passed).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it("passed=false when a blocker check fails", () => {
    const checks: WcagCheckResult[] = [
      { checkType: "screen_reader", flow: "worker_day_sheet", passed: false, severity: "blocker" },
      { checkType: "color_contrast", flow: "worker_day_sheet", passed: true },
    ]
    const r = buildWcagReviewSummary(checks, "2026-01-01T00:00:00Z")
    expect(r.passed).toBe(false)
    expect(r.blockers).toHaveLength(1)
  })

  it("passed=true when only minor issues", () => {
    const checks: WcagCheckResult[] = [
      { checkType: "mobile_touch", flow: "external_advance", passed: false, severity: "minor" },
    ]
    const r = buildWcagReviewSummary(checks, "2026-01-01T00:00:00Z")
    expect(r.passed).toBe(true)
    expect(r.minors).toHaveLength(1)
  })
})

// ── REL-604: Production dashboards/alerts ────────────────────────────────────

describe("REL-604 – buildProductionDashboard", () => {
  const slo: ProductionSlo = { name: "api_success_rate", target: 0.999, window: "24h", owner: "team-platform", runbookUrl: "https://runbook/api" }
  const activeRule: ProductionAlertRule = { alertId: "a1", sloName: "api_success_rate", condition: "< 99.9%", severity: "page", owner: "team-platform", active: true }

  it("allSlosCovered and allAlertRulesActive when fully wired", () => {
    const d = buildProductionDashboard("d1", [slo], [activeRule], "2026-01-01T00:00:00Z")
    expect(d.allSlosCovered).toBe(true)
    expect(d.allAlertRulesActive).toBe(true)
  })

  it("allSlosCovered=false when an SLO has no matching active rule", () => {
    const d = buildProductionDashboard("d1", [slo, { ...slo, name: "orphan_slo" }], [activeRule], "2026-01-01T00:00:00Z")
    expect(d.allSlosCovered).toBe(false)
  })
})

// ── REL-605: Backup/restore exercise ─────────────────────────────────────────

describe("REL-605 – evaluateBackupRestoreExercise", () => {
  const base = { exerciseId: "ex1", exercisedAt: "2026-01-01T00:00:00Z", rpoTargetMinutes: 15, rtoTargetMinutes: 60, actualRpoMinutes: 5, actualRtoMinutes: 30, relationalConsistencyVerified: true, fileConsistencyVerified: true, publicationConsistencyVerified: true, tenantIsolationVerified: true }

  it("passed=true when all targets met and consistency verified", () => {
    expect(evaluateBackupRestoreExercise(base).passed).toBe(true)
  })

  it("passed=false when RPO exceeds target", () => {
    const r = evaluateBackupRestoreExercise({ ...base, actualRpoMinutes: 20 })
    expect(r.passed).toBe(false)
    expect(r.failures.some(f => f.includes("RPO"))).toBe(true)
  })

  it("passed=false when tenant isolation not verified", () => {
    const r = evaluateBackupRestoreExercise({ ...base, tenantIsolationVerified: false })
    expect(r.passed).toBe(false)
  })
})

// ── REL-606: Migration rollback/forward-fix exercise ────────────────────────

describe("REL-606 – evaluateMigrationRollback", () => {
  const base = { exerciseId: "ex1", exercisedAt: "2026-01-01T00:00:00Z", migrationId: "m1", rollbackSucceeded: true, tenantIsolationMaintained: true, noLostRecords: true, noDuplicateSideEffects: true, forwardFixRehearsal: true }

  it("passed=true when all checks succeed", () => {
    expect(evaluateMigrationRollback(base).passed).toBe(true)
  })

  it("passed=false when rollback did not succeed", () => {
    expect(evaluateMigrationRollback({ ...base, rollbackSucceeded: false }).passed).toBe(false)
  })

  it("passed=false when records were lost", () => {
    const r = evaluateMigrationRollback({ ...base, noLostRecords: false })
    expect(r.passed).toBe(false)
    expect(r.issues.some(i => i.includes("Records"))).toBe(true)
  })
})

// ── REL-607: Security review/pen test ────────────────────────────────────────

describe("REL-607 – buildPenTestReport", () => {
  const finding = (severity: PenTestFinding["severity"], resolved: boolean): PenTestFinding => ({
    id: "f1", category: "idor_rls", severity, description: "test", resolved, resolvedAt: resolved ? "2026-01-01T00:00:00Z" : undefined,
  })

  it("meetsReleasePolicy=true when all critical/high resolved", () => {
    const r = buildPenTestReport("r1", [finding("critical", true), finding("medium", false)], "2026-01-01T00:00:00Z")
    expect(r.meetsReleasePolicy).toBe(true)
  })

  it("meetsReleasePolicy=false when unresolved critical", () => {
    const r = buildPenTestReport("r1", [finding("critical", false)], "2026-01-01T00:00:00Z")
    expect(r.meetsReleasePolicy).toBe(false)
    expect(r.openCriticalOrHigh).toHaveLength(1)
  })
})

// ── REL-608: Load/soak/fault tests ───────────────────────────────────────────

describe("REL-608 – summarizeLoadTests", () => {
  const passed = (scenario: LoadTestResult["scenario"]): LoadTestResult => ({ scenario, passedSlo: true, passedRecovery: true, details: "ok" })
  const failed = (scenario: LoadTestResult["scenario"]): LoadTestResult => ({ scenario, passedSlo: false, passedRecovery: true, details: "slo breach" })

  it("allPassed=true when all scenarios pass", () => {
    expect(summarizeLoadTests([passed("portfolio_scale"), passed("ticket_scanning")]).allPassed).toBe(true)
  })

  it("reports failed scenarios", () => {
    const r = summarizeLoadTests([passed("portfolio_scale"), failed("publication_fanout")])
    expect(r.allPassed).toBe(false)
    expect(r.failedScenarios).toContain("publication_fanout")
  })
})

// ── REL-609: Operational runbooks ────────────────────────────────────────────

describe("REL-609 – validateRunbook", () => {
  const valid = (): OperationalRunbook => ({
    topic: "migration", title: "Migration Runbook", owner: "ops-team",
    lastTestedAt: "2026-01-01T00:00:00Z", steps: ["Step 1", "Step 2"], escalationPath: "pagerduty://ops",
  })

  it("returns no errors for valid runbook", () => {
    expect(validateRunbook(valid())).toHaveLength(0)
  })

  it("errors when steps are empty", () => {
    expect(validateRunbook({ ...valid(), steps: [] }).some(e => e.includes("steps"))).toBe(true)
  })

  it("errors when no owner", () => {
    expect(validateRunbook({ ...valid(), owner: "" }).some(e => e.includes("owner"))).toBe(true)
  })

  it("errors when no escalation path", () => {
    expect(validateRunbook({ ...valid(), escalationPath: "" }).some(e => e.includes("escalation"))).toBe(true)
  })
})

// ── REL-610: Pilot and GA checklist ──────────────────────────────────────────

describe("REL-610 – computeGaReadiness", () => {
  const item = (id: string, complete: boolean): GaChecklistItem => ({
    id, category: "feature_flags", description: "test", complete,
    signedOffBy: complete ? "lead" : undefined, signedOffAt: complete ? "2026-01-01T00:00:00Z" : undefined,
  })

  it("ready=true when all items complete", () => {
    const r = computeGaReadiness([item("a", true), item("b", true)])
    expect(r.ready).toBe(true)
    expect(r.signedOffCount).toBe(2)
  })

  it("ready=false with pending items", () => {
    const r = computeGaReadiness([item("a", true), item("b", false)])
    expect(r.ready).toBe(false)
    expect(r.pendingItems).toHaveLength(1)
  })
})

// ── REL-611: Delete dead/legacy code ─────────────────────────────────────────

describe("REL-611 – identifyLegacyCodeToRemove", () => {
  const makeItem = (path: string, usage: number, reconciled: boolean, removed: boolean): LegacyCodeItem => ({
    path, description: "legacy", telemetryUsage: usage, reconciledSafe: reconciled, removed,
  })

  it("safeToRemove when usage=0 and reconciledSafe=true", () => {
    const r = identifyLegacyCodeToRemove([makeItem("lib/old.ts", 0, true, false)])
    expect(r.safeToRemove).toHaveLength(1)
    expect(r.blocked).toHaveLength(0)
  })

  it("blocked when usage > 0", () => {
    const r = identifyLegacyCodeToRemove([makeItem("lib/active.ts", 5, true, false)])
    expect(r.safeToRemove).toHaveLength(0)
    expect(r.blocked).toHaveLength(1)
  })

  it("blocked when not reconciledSafe", () => {
    const r = identifyLegacyCodeToRemove([makeItem("lib/unreconciled.ts", 0, false, false)])
    expect(r.blocked).toHaveLength(1)
  })

  it("skips already removed items", () => {
    const r = identifyLegacyCodeToRemove([makeItem("lib/removed.ts", 0, true, true)])
    expect(r.safeToRemove).toHaveLength(0)
    expect(r.blocked).toHaveLength(0)
  })
})
