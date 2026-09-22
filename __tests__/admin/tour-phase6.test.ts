import { describe, it, expect } from "vitest"
import {
  buildTourSummaryCacheKeyString,
  evaluateCacheEntryFreshness,
  shouldRebuildTourSummary,
  evaluatePortfolioBudget,
  evaluateTourLifecycleE2ESuite,
  assessTourLegacyPathRetirement,
  buildTourRetirementSummary,
  type TourSummaryCacheKey,
  type TourSummaryCacheEntry,
  type PortfolioPerformanceBudget,
  type TourLifecycleE2ESuiteEntry,
  type TourLegacyPathItem,
} from "@/lib/admin/tour-phase6"

// ── TOUR-601: Materialize/cache summary read model ───────────────────────────

describe("TOUR-601 – buildTourSummaryCacheKeyString", () => {
  it("produces deterministic key including org, tour, access class, and version", () => {
    const key: TourSummaryCacheKey = { orgId: "org-1", tourId: "t1", accessClass: "admin", version: 3 }
    const k = buildTourSummaryCacheKeyString(key)
    expect(k).toBe("tour_summary:org-1:t1:admin:v3")
  })

  it("different access class produces different key", () => {
    const admin = buildTourSummaryCacheKeyString({ orgId: "o1", tourId: "t1", accessClass: "admin", version: 1 })
    const pub = buildTourSummaryCacheKeyString({ orgId: "o1", tourId: "t1", accessClass: "public", version: 1 })
    expect(admin).not.toBe(pub)
  })
})

describe("TOUR-601 – evaluateCacheEntryFreshness", () => {
  const makeEntry = (builtAt: string): TourSummaryCacheEntry => ({
    key: { orgId: "o1", tourId: "t1", accessClass: "admin", version: 1 },
    builtAt, freshnessSloBreach: false, isFallbackRebuild: false,
  })

  it("fresh=true when entry is new", () => {
    const entry = makeEntry("2026-01-01T00:00:00Z")
    const { fresh, ageSeconds } = evaluateCacheEntryFreshness(entry, "2026-01-01T00:00:05Z", 30)
    expect(fresh).toBe(true)
    expect(ageSeconds).toBeCloseTo(5, 0)
  })

  it("fresh=false when age exceeds maxAgeSeconds", () => {
    const entry = makeEntry("2026-01-01T00:00:00Z")
    const { fresh } = evaluateCacheEntryFreshness(entry, "2026-01-01T00:01:00Z", 30)
    expect(fresh).toBe(false)
  })
})

describe("TOUR-601 – shouldRebuildTourSummary", () => {
  const freshEntry = (): TourSummaryCacheEntry => ({
    key: { orgId: "o1", tourId: "t1", accessClass: "admin", version: 5 },
    builtAt: "2026-01-01T00:00:00Z", freshnessSloBreach: false, isFallbackRebuild: false,
  })

  it("rebuild=true when no cache entry", () => {
    const r = shouldRebuildTourSummary({ cachedEntry: null, expectedVersion: 5, nowIso: "2026-01-01T00:00:05Z", maxAgeSeconds: 60 })
    expect(r.rebuild).toBe(true)
    expect(r.reason).toBe("no_cache_entry")
  })

  it("rebuild=true when entry is stale", () => {
    const r = shouldRebuildTourSummary({ cachedEntry: freshEntry(), expectedVersion: 5, nowIso: "2026-01-01T01:00:00Z", maxAgeSeconds: 30 })
    expect(r.rebuild).toBe(true)
    expect(r.reason).toBe("entry_stale")
  })

  it("rebuild=true when version is behind", () => {
    const r = shouldRebuildTourSummary({ cachedEntry: freshEntry(), expectedVersion: 6, nowIso: "2026-01-01T00:00:05Z", maxAgeSeconds: 60 })
    expect(r.rebuild).toBe(true)
    expect(r.reason).toBe("version_behind")
  })

  it("rebuild=false when cache is valid", () => {
    const r = shouldRebuildTourSummary({ cachedEntry: freshEntry(), expectedVersion: 5, nowIso: "2026-01-01T00:00:05Z", maxAgeSeconds: 60 })
    expect(r.rebuild).toBe(false)
    expect(r.reason).toBe("cache_valid")
  })
})

// ── TOUR-602: Portfolio performance budget ────────────────────────────────────

describe("TOUR-602 – evaluatePortfolioBudget", () => {
  const budget: PortfolioPerformanceBudget = {
    queryP50Ms: 200, queryP95Ms: 800, renderP95Ms: 1200,
    interactionP95Ms: 100, bundleKb: 350, datasetSize: 500,
  }

  it("passes when all measurements within budget", () => {
    const r = evaluatePortfolioBudget(budget, {
      ...budget, measuredAt: "2026-01-01T00:00:00Z", datasetSize: 500,
    })
    expect(r.passes).toBe(true)
    expect(r.violations).toHaveLength(0)
  })

  it("fails on queryP95 violation", () => {
    const r = evaluatePortfolioBudget(budget, { ...budget, queryP95Ms: 900, datasetSize: 500, measuredAt: "2026-01-01T00:00:00Z" })
    expect(r.passes).toBe(false)
    expect(r.violations.some(v => v.includes("queryP95"))).toBe(true)
  })

  it("fails on bundle size violation", () => {
    const r = evaluatePortfolioBudget(budget, { ...budget, bundleKb: 400, datasetSize: 500, measuredAt: "2026-01-01T00:00:00Z" })
    expect(r.passes).toBe(false)
    expect(r.violations.some(v => v.includes("bundle"))).toBe(true)
  })

  it("reports dataset size on result", () => {
    const r = evaluatePortfolioBudget(budget, { ...budget, datasetSize: 5000, measuredAt: "2026-01-01T00:00:00Z" })
    expect(r.datasetSize).toBe(5000)
  })
})

// ── TOUR-603: Lifecycle E2E suite ─────────────────────────────────────────────

describe("TOUR-603 – evaluateTourLifecycleE2ESuite", () => {
  const allPassing = (): TourLifecycleE2ESuiteEntry[] => [
    { scenario: "create_through_settled", status: "passing" },
    { scenario: "create_through_archived", status: "passing" },
    { scenario: "role_variants", status: "passing" },
    { scenario: "concurrent_editors", status: "passing" },
    { scenario: "failed_dependencies", status: "passing" },
    { scenario: "cancellation", status: "passing" },
    { scenario: "rollback", status: "passing" },
  ]

  it("allPassing=true and coverageComplete=true when all scenarios pass", () => {
    const r = evaluateTourLifecycleE2ESuite(allPassing())
    expect(r.allPassing).toBe(true)
    expect(r.coverageComplete).toBe(true)
    expect(r.failing).toHaveLength(0)
    expect(r.pending).toHaveLength(0)
  })

  it("allPassing=false when a scenario is failing", () => {
    const entries = allPassing()
    entries[0] = { scenario: "create_through_settled", status: "failing", failureReason: "Timeout" }
    const r = evaluateTourLifecycleE2ESuite(entries)
    expect(r.allPassing).toBe(false)
    expect(r.failing).toHaveLength(1)
  })

  it("coverageComplete=false when a required scenario is missing", () => {
    const entries = allPassing().filter(e => e.scenario !== "rollback")
    const r = evaluateTourLifecycleE2ESuite(entries)
    expect(r.coverageComplete).toBe(false)
  })

  it("allPassing=false when a scenario is pending", () => {
    const entries = allPassing()
    entries[2] = { scenario: "role_variants", status: "pending" }
    const r = evaluateTourLifecycleE2ESuite(entries)
    expect(r.allPassing).toBe(false)
    expect(r.pending).toHaveLength(1)
  })
})

// ── TOUR-604: Retire legacy tour paths ───────────────────────────────────────

describe("TOUR-604 – assessTourLegacyPathRetirement", () => {
  const readyItem = (): TourLegacyPathItem => ({
    pathId: "p1", pathType: "api_route", identifier: "/api/tours/legacy",
    telemetryUsageLast30d: 0, compatibilityReadsReconciled: true,
    flagRemoved: true, codeDeleted: true, migrationReportApproved: true,
  })

  it("canRetire=true when all conditions met", () => {
    expect(assessTourLegacyPathRetirement(readyItem()).canRetire).toBe(true)
  })

  it("blocks when telemetry shows usage", () => {
    const r = assessTourLegacyPathRetirement({ ...readyItem(), telemetryUsageLast30d: 12 })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("12 calls"))).toBe(true)
  })

  it("blocks when compatibility reads not reconciled", () => {
    const r = assessTourLegacyPathRetirement({ ...readyItem(), compatibilityReadsReconciled: false })
    expect(r.canRetire).toBe(false)
  })

  it("blocks when code not deleted", () => {
    const r = assessTourLegacyPathRetirement({ ...readyItem(), codeDeleted: false })
    expect(r.canRetire).toBe(false)
  })

  it("blocks when migration report not approved", () => {
    const r = assessTourLegacyPathRetirement({ ...readyItem(), migrationReportApproved: false })
    expect(r.canRetire).toBe(false)
  })
})

describe("TOUR-604 – buildTourRetirementSummary", () => {
  const makeItem = (id: string, ready: boolean): TourLegacyPathItem => ({
    pathId: id, pathType: "api_route", identifier: id,
    telemetryUsageLast30d: ready ? 0 : 1,
    compatibilityReadsReconciled: ready, flagRemoved: ready,
    codeDeleted: ready, migrationReportApproved: ready,
  })

  it("allClear=true when all items can retire", () => {
    const r = buildTourRetirementSummary([makeItem("a", true), makeItem("b", true)])
    expect(r.allClear).toBe(true)
    expect(r.readyToRetire).toBe(2)
    expect(r.blocked).toBe(0)
  })

  it("allClear=false when any item is blocked", () => {
    const r = buildTourRetirementSummary([makeItem("a", true), makeItem("b", false)])
    expect(r.allClear).toBe(false)
    expect(r.blocked).toBe(1)
  })
})
