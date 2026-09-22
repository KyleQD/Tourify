import { describe, it, expect } from "vitest"
import {
  buildReportFreshnessView,
  buildDataQualityAlert,
  evaluateReportingBudget,
  evaluateClientAggregationRetirement,
  createExportJob,
  retryExportJob,
  completeExportJob,
  expireExportJob,
  validateExportValue,
  buildTourBook,
  validateIcsFeedAccess,
  buildIcsEvent,
  type ReportSourceWatermark,
  type ExportJob,
  type TourBookSection,
  type IcsFeedConfig,
} from "@/lib/admin/rep-exp-phase6"

// ── REP-601: Reporting freshness/reconciliation UI ───────────────────────────

describe("REP-601 – buildReportFreshnessView", () => {
  const freshSource = (id: string): ReportSourceWatermark => ({
    sourceId: id, sourceName: id, lastCompletedAt: "2026-01-01T00:00:00Z",
    watermarkAt: "2026-01-01T00:00:00Z", isStale: false, isPartial: false,
    completenessPercent: 100,
  })

  it("allFresh=true when no stale or partial sources", () => {
    const view = buildReportFreshnessView("r1", [freshSource("s1"), freshSource("s2")], "2026-01-01T01:00:00Z")
    expect(view.allFresh).toBe(true)
    expect(view.staleSourceCount).toBe(0)
    expect(view.partialSourceCount).toBe(0)
  })

  it("allFresh=false and counts stale sources", () => {
    const stale: ReportSourceWatermark = { ...freshSource("s2"), isStale: true }
    const view = buildReportFreshnessView("r1", [freshSource("s1"), stale], "2026-01-01T01:00:00Z")
    expect(view.allFresh).toBe(false)
    expect(view.staleSourceCount).toBe(1)
  })

  it("allFresh=false and counts partial sources", () => {
    const partial: ReportSourceWatermark = { ...freshSource("s3"), isPartial: true, completenessPercent: 60 }
    const view = buildReportFreshnessView("r1", [partial], "2026-01-01T01:00:00Z")
    expect(view.allFresh).toBe(false)
    expect(view.partialSourceCount).toBe(1)
  })

  it("returns all sources unchanged", () => {
    const src = freshSource("s1")
    const view = buildReportFreshnessView("r1", [src], "2026-01-01T00:00:00Z")
    expect(view.sources).toHaveLength(1)
    expect(view.sources[0].sourceId).toBe("s1")
  })
})

// ── REP-602: Data-quality monitors ───────────────────────────────────────────

describe("REP-602 – buildDataQualityAlert", () => {
  it("creates an open alert with correct fields", () => {
    const alert = buildDataQualityAlert("a1", "org-1", "orphan_record", "ticketing", "Orphaned ticket", "2026-01-01T00:00:00Z", "rec-99")
    expect(alert.status).toBe("open")
    expect(alert.issueType).toBe("orphan_record")
    expect(alert.recordId).toBe("rec-99")
    expect(alert.domain).toBe("ticketing")
  })

  it("works without optional recordId", () => {
    const alert = buildDataQualityAlert("a2", "org-1", "stale_projection", "finance", "Stale", "2026-01-01T00:00:00Z")
    expect(alert.recordId).toBeUndefined()
  })
})

// ── REP-603: Performance budgets ─────────────────────────────────────────────

describe("REP-603 – evaluateReportingBudget", () => {
  const budget = {
    reportType: "tour_summary", queryP50Ms: 200, queryP95Ms: 800,
    renderP95Ms: 1000, fileSizeKb: 500, queueWaitP95Ms: 5000,
  }

  it("passes when all measurements are within budget", () => {
    const r = evaluateReportingBudget(budget, { ...budget, measuredAt: "2026-01-01T00:00:00Z" })
    expect(r.passes).toBe(true)
    expect(r.violations).toHaveLength(0)
  })

  it("fails and reports queryP95 violation", () => {
    const r = evaluateReportingBudget(budget, { ...budget, queryP95Ms: 900, measuredAt: "2026-01-01T00:00:00Z" })
    expect(r.passes).toBe(false)
    expect(r.violations.some(v => v.includes("queryP95"))).toBe(true)
  })

  it("fails on fileSize violation", () => {
    const r = evaluateReportingBudget(budget, { ...budget, fileSizeKb: 600, measuredAt: "2026-01-01T00:00:00Z" })
    expect(r.passes).toBe(false)
    expect(r.violations.some(v => v.includes("fileSize"))).toBe(true)
  })
})

// ── REP-604: Retire duplicated client aggregation ────────────────────────────

describe("REP-604 – evaluateClientAggregationRetirement", () => {
  const ready = () => ({
    formulaId: "f1", usesGovernedReadModel: true,
    oldFormulaRemoved: true, fanoutRemoved: true,
    comparisonReportMatches: true, tolerancePct: 1,
  })

  it("canRetire=true when all conditions met", () => {
    const r = evaluateClientAggregationRetirement(ready())
    expect(r.canRetire).toBe(true)
    expect(r.blockers).toHaveLength(0)
  })

  it("blocks when not using governed read model", () => {
    const r = evaluateClientAggregationRetirement({ ...ready(), usesGovernedReadModel: false })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("governed read model"))).toBe(true)
  })

  it("blocks when comparison report mismatches", () => {
    const r = evaluateClientAggregationRetirement({ ...ready(), comparisonReportMatches: false })
    expect(r.canRetire).toBe(false)
  })

  it("blocks when old formula not removed", () => {
    const r = evaluateClientAggregationRetirement({ ...ready(), oldFormulaRemoved: false })
    expect(r.canRetire).toBe(false)
  })
})

// ── EXP-601: Export job service ───────────────────────────────────────────────

describe("EXP-601 – createExportJob", () => {
  const input = {
    jobId: "job-1", orgId: "org-1", requestedBy: "user-1", capability: "can_export",
    filter: { tourId: "t1" }, schemaVersion: "1.0.0", audienceClass: "admin",
    idempotencyKey: "idem-1", createdAt: "2026-01-01T00:00:00Z",
  }

  it("creates job in queued status", () => {
    const job = createExportJob(input)
    expect(job.status).toBe("queued")
    expect(job.retryCount).toBe(0)
    expect(job.maxRetries).toBe(3)
  })

  it("sets auditEntry", () => {
    const job = createExportJob(input)
    expect(job.auditEntry).toMatch(/export/)
  })
})

describe("EXP-601 – retryExportJob", () => {
  const baseJob = (): ExportJob => ({
    ...createExportJob({
      jobId: "j1", orgId: "o1", requestedBy: "u1", capability: "c",
      filter: {}, schemaVersion: "1", audienceClass: "admin",
      idempotencyKey: "k1", createdAt: "2026-01-01T00:00:00Z",
    }),
  })

  it("increments retryCount and sets status=retrying", () => {
    const result = retryExportJob(baseJob())
    expect(result).not.toHaveProperty("error")
    const job = result as ExportJob
    expect(job.retryCount).toBe(1)
    expect(job.status).toBe("retrying")
  })

  it("returns error when max retries exceeded", () => {
    const job = { ...baseJob(), retryCount: 3 }
    const result = retryExportJob(job)
    expect(result).toHaveProperty("error")
  })
})

describe("EXP-601 – completeExportJob / expireExportJob", () => {
  const job = createExportJob({
    jobId: "j2", orgId: "o1", requestedBy: "u1", capability: "c",
    filter: {}, schemaVersion: "1", audienceClass: "admin",
    idempotencyKey: "k2", createdAt: "2026-01-01T00:00:00Z",
  })

  it("completeExportJob sets status=completed and fileUrl", () => {
    const done = completeExportJob(job, "https://files/j2.csv", "2026-02-01T00:00:00Z", "2026-01-05T00:00:00Z")
    expect(done.status).toBe("completed")
    expect(done.fileUrl).toBe("https://files/j2.csv")
  })

  it("expireExportJob marks expired when past expiresAt", () => {
    const done = completeExportJob(job, "https://files/j2.csv", "2026-01-10T00:00:00Z", "2026-01-05T00:00:00Z")
    const expired = expireExportJob(done, "2026-01-11T00:00:00Z")
    expect(expired.status).toBe("expired")
    expect(expired.fileUrl).toBeUndefined()
  })

  it("expireExportJob keeps job if not yet expired", () => {
    const done = completeExportJob(job, "https://files/j2.csv", "2026-12-31T00:00:00Z", "2026-01-05T00:00:00Z")
    const notExpired = expireExportJob(done, "2026-01-01T00:00:00Z")
    expect(notExpired.status).toBe("completed")
  })
})

// ── EXP-602: Versioned CSV/XLSX schemas ──────────────────────────────────────

describe("EXP-602 – validateExportValue", () => {
  it("returns valid for a normal string", () => {
    const r = validateExportValue("hello", { name: "col", type: "string", nullable: false })
    expect(r.valid).toBe(true)
    expect(r.sanitized).toBe("hello")
  })

  it("prefixes formula-injection strings with tab", () => {
    for (const dangerous of ["=SUM(A1)", "+1", "-1", "@test"]) {
      const r = validateExportValue(dangerous, { name: "col", type: "string", nullable: false })
      expect(r.valid).toBe(true)
      expect((r.sanitized as string).startsWith("\t")).toBe(true)
    }
  })

  it("returns error for null on non-nullable column", () => {
    const r = validateExportValue(null, { name: "amount", type: "number", nullable: false })
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/required/)
  })

  it("returns valid for null on nullable column", () => {
    const r = validateExportValue(null, { name: "notes", type: "string", nullable: true })
    expect(r.valid).toBe(true)
  })
})

// ── EXP-603: Web/PDF tour book ────────────────────────────────────────────────

describe("EXP-603 – buildTourBook", () => {
  const makeSection = (key: TourBookSection["key"], authorized: boolean, hasContent: boolean): TourBookSection => ({
    key, title: key, audienceClass: "crew_only", authorized, hasContent,
    overflowHandled: true, emptyStateHandled: true, errorStateHandled: true,
  })

  it("includes only authorized sections with content in TOC", () => {
    const sections = [
      makeSection("itinerary", true, true),
      makeSection("contacts", true, false),
      makeSection("travel", false, true),
    ]
    const book = buildTourBook("tour-1", sections, "America/Chicago", "https://pub/link", "2026-01-01T00:00:00Z")
    expect(book.tableOfContents).toHaveLength(1)
    expect(book.tableOfContents[0].key).toBe("itinerary")
  })

  it("sets stable checksum based on tourId and sections", () => {
    const sections = [makeSection("itinerary", true, true)]
    const book = buildTourBook("tour-1", sections, "America/New_York", "https://pub/x", "2026-01-01T00:00:00Z")
    expect(book.checksum).toContain("tour-1")
    expect(book.checksum).toContain("itinerary")
  })

  it("sets accessibleWebEquivalent=true", () => {
    const book = buildTourBook("t1", [], "UTC", "https://pub/x", "2026-01-01T00:00:00Z")
    expect(book.accessibleWebEquivalent).toBe(true)
  })
})

// ── EXP-604: Harden ICS/feed exports ─────────────────────────────────────────

describe("EXP-604 – validateIcsFeedAccess", () => {
  const activeFeed = (): IcsFeedConfig => ({
    feedId: "feed-1", scopedToken: "tok-1", orgId: "org-1",
    audienceClass: "crew", revoked: false,
  })

  it("allows access for active non-expired feed", () => {
    const r = validateIcsFeedAccess(activeFeed(), "2026-01-01T00:00:00Z")
    expect(r.allowed).toBe(true)
  })

  it("denies revoked feed", () => {
    const r = validateIcsFeedAccess({ ...activeFeed(), revoked: true }, "2026-01-01T00:00:00Z")
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("feed_token_revoked")
  })

  it("denies expired feed", () => {
    const r = validateIcsFeedAccess(
      { ...activeFeed(), expiresAt: "2025-12-31T23:59:59Z" },
      "2026-01-01T00:00:00Z",
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("feed_token_expired")
  })
})

describe("EXP-604 – buildIcsEvent", () => {
  it("generates stable UID from source id and orgId", () => {
    const ev = buildIcsEvent({ id: "ev-1", title: "Show Night", startsAt: "2026-06-01T20:00:00Z", endsAt: "2026-06-01T23:00:00Z", audienceClass: "crew" }, 1, "org-1")
    expect(ev.uid).toBe("ev-1@org-1.tourify")
    expect(ev.sequence).toBe(1)
    expect(ev.status).toBe("confirmed")
  })
})
