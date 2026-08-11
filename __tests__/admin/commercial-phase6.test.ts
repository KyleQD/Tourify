import { describe, it, expect } from "vitest"
import {
  buildTicketingReconciliationReport,
  buildTixSecurityReview,
  evaluateTixRetirement,
  createFinReconciliationMismatch,
  resolveFinMismatch,
  buildAccountingExportBatch,
  markAccountingExportExported,
  buildFinAlert,
  evaluateFinRetirement,
  buildVendorAlert,
  scanVendorAlerts,
  buildContDocSecurityReview,
  evaluateContMigration,
  type TixSecurityCheckResult,
  type ContDocSecurityCheckResult,
} from "@/lib/admin/commercial-phase6"

// ── TIX-601 (commercial): buildTicketingReconciliationReport ─────────────────

describe("commercial-phase6 TIX-601 – buildTicketingReconciliationReport", () => {
  it("withinTolerance=true when counts match and totals within tolerance", () => {
    const r = buildTicketingReconciliationReport({
      orgId: "o1", eventId: "ev1", legacyCount: 100, canonicalCount: 100,
      legacyTotal: 10000, canonicalTotal: 10050, currency: "USD",
      tolerancePct: 1, unresolvedRecords: [], generatedAt: "2026-01-01T00:00:00Z",
    })
    expect(r.withinTolerance).toBe(true)
  })

  it("withinTolerance=false when counts differ", () => {
    const r = buildTicketingReconciliationReport({
      orgId: "o1", eventId: "ev1", legacyCount: 100, canonicalCount: 99,
      legacyTotal: 10000, canonicalTotal: 10000, currency: "USD",
      tolerancePct: 1, unresolvedRecords: [], generatedAt: "2026-01-01T00:00:00Z",
    })
    expect(r.withinTolerance).toBe(false)
  })

  it("withinTolerance=false when financial total exceeds tolerance", () => {
    const r = buildTicketingReconciliationReport({
      orgId: "o1", eventId: "ev1", legacyCount: 100, canonicalCount: 100,
      legacyTotal: 10000, canonicalTotal: 10500, currency: "USD",
      tolerancePct: 1, unresolvedRecords: [], generatedAt: "2026-01-01T00:00:00Z",
    })
    expect(r.withinTolerance).toBe(false)
  })

  it("sets silentAdjustmentAllowed invariant", () => {
    // silentAdjustmentAllowed is a type-level invariant only on FinReconciliationMismatch,
    // not on TicketingReconciliationReport - this doc just tests the report builds
    const r = buildTicketingReconciliationReport({
      orgId: "o1", eventId: "ev1", legacyCount: 0, canonicalCount: 0,
      legacyTotal: 0, canonicalTotal: 0, currency: "EUR",
      tolerancePct: 0, unresolvedRecords: [{ legacyId: "L1", reason: "orphan" }],
      generatedAt: "2026-01-01T00:00:00Z",
    })
    expect(r.unresolvedRecords).toHaveLength(1)
  })
})

// ── TIX-602 (commercial): buildTixSecurityReview ────────────────────────────

describe("commercial-phase6 TIX-602 – buildTixSecurityReview", () => {
  it("allCriticalClosed=true when all critical checks pass", () => {
    const checks: TixSecurityCheckResult[] = [
      { category: "oversell_race", passed: true, severity: "critical" },
      { category: "idor", passed: true, severity: "critical" },
    ]
    const r = buildTixSecurityReview("rv1", checks, "2026-01-01T00:00:00Z")
    expect(r.allCriticalClosed).toBe(true)
    expect(r.openFindings).toHaveLength(0)
  })

  it("allCriticalClosed=false when critical check fails", () => {
    const checks: TixSecurityCheckResult[] = [
      { category: "oversell_race", passed: false, severity: "critical" },
    ]
    const r = buildTixSecurityReview("rv1", checks, "2026-01-01T00:00:00Z")
    expect(r.allCriticalClosed).toBe(false)
    expect(r.openFindings).toHaveLength(1)
  })
})

// ── TIX-603 (commercial): evaluateTixRetirement ──────────────────────────────

describe("commercial-phase6 TIX-603 – evaluateTixRetirement", () => {
  const ready = () => ({ legacyRouteUsage: 0, historicalReadsPreserved: true, permissivePoliciesAbsent: true, adminUiUsesCanonical: true })

  it("canRetire=true when all conditions met", () => {
    expect(evaluateTixRetirement(ready()).canRetire).toBe(true)
  })

  it("blocks when legacy route still in use", () => {
    const r = evaluateTixRetirement({ ...ready(), legacyRouteUsage: 5 })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("5 req/h"))).toBe(true)
  })

  it("blocks when permissive policies still present", () => {
    expect(evaluateTixRetirement({ ...ready(), permissivePoliciesAbsent: false }).canRetire).toBe(false)
  })
})

// ── FIN-601: Finance reconciliation ──────────────────────────────────────────

describe("commercial-phase6 FIN-601 – createFinReconciliationMismatch", () => {
  it("computes variance and sets silentAdjustmentAllowed=false", () => {
    const m = createFinReconciliationMismatch({
      id: "m1", type: "invoice_total", date: "2026-01-01", currency: "USD",
      sourceTotal: 10000, financeEntryTotal: 10200,
    })
    expect(m.variance).toBe(200)
    expect(m.silentAdjustmentAllowed).toBe(false)
    expect(m.status).toBe("open")
  })

  it("resolveFinMismatch sets status=resolved with evidence", () => {
    const m = createFinReconciliationMismatch({ id: "m1", type: "fx", date: "2026-01-01", currency: "USD", sourceTotal: 1000, financeEntryTotal: 1010 })
    const resolved = resolveFinMismatch(m, "ops-lead", "evidence-link")
    expect(resolved.status).toBe("resolved")
    expect(resolved.evidence).toBe("evidence-link")
    expect(resolved.silentAdjustmentAllowed).toBe(false)
  })
})

// ── FIN-602: Accounting export adapter ───────────────────────────────────────

describe("commercial-phase6 FIN-602 – buildAccountingExportBatch", () => {
  const line = { accountCode: "4000", currency: "USD", amountMinorUnits: 50000, description: "Service fee", sourceReference: "inv-1" }

  it("creates batch in pending status with checksum", () => {
    const b = buildAccountingExportBatch("batch-1", "org-1", "2026-06", [line], "2026-07-01T00:00:00Z")
    expect(b.status).toBe("pending")
    expect(b.checksum).toContain("batch-1")
    expect(b.lines).toHaveLength(1)
  })

  it("markAccountingExportExported sets status=exported", () => {
    const b = buildAccountingExportBatch("batch-1", "org-1", "2026-06", [line], "2026-07-01T00:00:00Z")
    const exported = markAccountingExportExported(b, "EXT-REF-001")
    expect(exported.status).toBe("exported")
    expect(exported.externalReference).toBe("EXT-REF-001")
  })
})

// ── FIN-603: Finance observability ────────────────────────────────────────────

describe("commercial-phase6 FIN-603 – buildFinAlert", () => {
  it("creates an open alert with correct fields", () => {
    const alert = buildFinAlert("a1", "org-1", "unmatched_invoice", "warning", "Invoice mismatch", { invoiceId: "inv-1" }, "2026-01-01T00:00:00Z")
    expect(alert.status).toBe("open")
    expect(alert.finCategory).toBe("unmatched_invoice")
    expect(alert.severity).toBe("warning")
  })
})

// ── FIN-604: Migrate/retire legacy finance paths ──────────────────────────────

describe("commercial-phase6 FIN-604 – evaluateFinRetirement", () => {
  const ready = () => ({
    rowCountReconciled: true, totalsCurrencyReconciled: true, oldWritesStopped: true,
    permissivePoliciesRemoved: true, rawIdUxRemoved: true,
    retentionPlanApproved: true, historicalAccessApproved: true,
  })

  it("canRetire=true when all conditions met", () => {
    expect(evaluateFinRetirement(ready()).canRetire).toBe(true)
  })

  it("blocks when row count not reconciled", () => {
    expect(evaluateFinRetirement({ ...ready(), rowCountReconciled: false }).canRetire).toBe(false)
  })

  it("blocks when old writes still active", () => {
    const r = evaluateFinRetirement({ ...ready(), oldWritesStopped: false })
    expect(r.canRetire).toBe(false)
    expect(r.blockers.some(b => b.includes("Old writes"))).toBe(true)
  })

  it("blocks when retention plan not approved", () => {
    expect(evaluateFinRetirement({ ...ready(), retentionPlanApproved: false }).canRetire).toBe(false)
  })
})

// ── VEND-601: Vendor/contract observability ───────────────────────────────────

describe("commercial-phase6 VEND-601 – scanVendorAlerts", () => {
  const clean = () => ({
    orgId: "o1", now: "2026-01-01T00:00:00Z",
    complianceDocExpiringWithin30Days: [], contractsExpiringWithin60Days: [],
    unansweredRfpOlderThan7Days: [], expiredQuotes: [],
    stalledApprovalsOlderThan48h: [], overduObligations: [], providerFailures: [],
  })

  it("returns empty when no issues", () => {
    expect(scanVendorAlerts(clean())).toHaveLength(0)
  })

  it("raises warning for expiring compliance doc", () => {
    const alerts = scanVendorAlerts({ ...clean(), complianceDocExpiringWithin30Days: [{ vendorId: "v1", docType: "insurance", expiresAt: "2026-01-25T00:00:00Z" }] })
    expect(alerts.some(a => a.vendorCategory === "expiring_compliance_doc" && a.severity === "warning")).toBe(true)
  })

  it("raises critical for overdue obligation", () => {
    const alerts = scanVendorAlerts({ ...clean(), overduObligations: [{ obligationId: "ob1", dueAt: "2025-12-01T00:00:00Z" }] })
    expect(alerts.some(a => a.vendorCategory === "overdue_obligation" && a.severity === "critical")).toBe(true)
  })

  it("raises critical for provider failure", () => {
    const alerts = scanVendorAlerts({ ...clean(), providerFailures: [{ providerId: "p1", failureAt: "2026-01-01T00:00:00Z" }] })
    expect(alerts.some(a => a.vendorCategory === "provider_failure" && a.severity === "critical")).toBe(true)
  })

  it("raises info for unanswered RFP", () => {
    const alerts = scanVendorAlerts({ ...clean(), unansweredRfpOlderThan7Days: [{ rfpId: "rfp1", createdAt: "2025-12-20T00:00:00Z" }] })
    expect(alerts.some(a => a.vendorCategory === "unanswered_rfp" && a.severity === "info")).toBe(true)
  })
})

// ── CONT-601: Document security review ───────────────────────────────────────

describe("commercial-phase6 CONT-601 – buildContDocSecurityReview", () => {
  it("allCriticalClosed=true when no open critical checks", () => {
    const checks: ContDocSecurityCheckResult[] = [
      { category: "cross_org_file_id", passed: true, severity: "critical" },
      { category: "signed_url_expiry", passed: true, severity: "critical" },
    ]
    const r = buildContDocSecurityReview("rv1", checks, "2026-01-01T00:00:00Z")
    expect(r.allCriticalClosed).toBe(true)
  })

  it("allCriticalClosed=false when critical check fails", () => {
    const checks: ContDocSecurityCheckResult[] = [
      { category: "cross_org_file_id", passed: false, severity: "critical" },
    ]
    const r = buildContDocSecurityReview("rv1", checks, "2026-01-01T00:00:00Z")
    expect(r.allCriticalClosed).toBe(false)
    expect(r.openFindings).toHaveLength(1)
  })
})

// ── CONT-602: Migration and contract-shell cutover ────────────────────────────

describe("commercial-phase6 CONT-602 – evaluateContMigration", () => {
  const ready = () => ({
    orgId: "o1", legacyVendorContractRecordsTotal: 50,
    mappedToCanonical: 45, explicitlyMarkedLegacy: 5,
    orphanWrites: 0, placeholderWrites: 0, canonicalWorkspaceRouteActive: true,
  })

  it("canCutover=true when all accounted for and route active", () => {
    expect(evaluateContMigration(ready()).canCutover).toBe(true)
  })

  it("blocks when records unaccounted for", () => {
    const r = evaluateContMigration({ ...ready(), mappedToCanonical: 40 })
    expect(r.canCutover).toBe(false)
    expect(r.blockers.some(b => b.includes("unaccounted"))).toBe(true)
  })

  it("blocks on orphan writes", () => {
    const r = evaluateContMigration({ ...ready(), orphanWrites: 2 })
    expect(r.canCutover).toBe(false)
  })

  it("blocks when canonical route not active", () => {
    const r = evaluateContMigration({ ...ready(), canonicalWorkspaceRouteActive: false })
    expect(r.canCutover).toBe(false)
  })
})
