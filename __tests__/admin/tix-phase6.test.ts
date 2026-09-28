import { describe, it, expect } from "vitest"
import {
  buildTicketingReconciliationRow,
  canRetireEventLegacyData,
  runTicketingSecurityChecklist,
  assessRetirementReadiness,
  buildRetirementSummary,
  type TicketingMigrationStatus,
  type TicketingRetirementItem,
} from "@/lib/admin/tix-phase6"

// ── TIX-601: Migrate/reconcile legacy data ───────────────────────────────────

describe("TIX-601 – buildTicketingReconciliationRow", () => {
  it("marks within_tolerance when counts match and revenue is exact", () => {
    const row = buildTicketingReconciliationRow("org-1", "ev-1", "USD", 100, 100, 50000, 50000, 1)
    expect(row.delta_sold).toBe(0)
    expect(row.delta_revenue_minor).toBe(0)
    expect(row.within_tolerance).toBe(true)
  })

  it("marks within_tolerance when revenue delta is within tolerance_pct", () => {
    // 1% of 10000 = 100; delta = 80 → within
    const row = buildTicketingReconciliationRow("org-1", "ev-1", "USD", 50, 50, 10000, 10080, 1)
    expect(row.within_tolerance).toBe(true)
  })

  it("marks out-of-tolerance when revenue delta exceeds tolerance_pct", () => {
    // 1% of 10000 = 100; delta = 200 → outside
    const row = buildTicketingReconciliationRow("org-1", "ev-1", "USD", 50, 50, 10000, 10200, 1)
    expect(row.within_tolerance).toBe(false)
  })

  it("marks out-of-tolerance when sold count differs regardless of revenue", () => {
    const row = buildTicketingReconciliationRow("org-1", "ev-1", "USD", 100, 101, 50000, 50000, 1)
    expect(row.delta_sold).toBe(1)
    expect(row.within_tolerance).toBe(false)
  })

  it("sets currency on the row", () => {
    const row = buildTicketingReconciliationRow("org-1", "ev-1", "GBP", 0, 0, 0, 0, 0)
    expect(row.currency).toBe("GBP")
  })
})

describe("TIX-601 – canRetireEventLegacyData", () => {
  const fullyReady = (): TicketingMigrationStatus => ({
    event_id: "ev-1",
    org_id: "org-1",
    legacy_writes_disabled: true,
    canonical_reads_enabled: true,
    unresolved_records: 0,
    status: "reconciled",
  })

  it("returns can_retire=true when all conditions met", () => {
    const { can_retire, blockers } = canRetireEventLegacyData(fullyReady())
    expect(can_retire).toBe(true)
    expect(blockers).toHaveLength(0)
  })

  it("blocks when legacy_writes_disabled is false", () => {
    const s = { ...fullyReady(), legacy_writes_disabled: false }
    expect(canRetireEventLegacyData(s).can_retire).toBe(false)
    expect(canRetireEventLegacyData(s).blockers).toContain("Legacy writes not yet disabled")
  })

  it("blocks when canonical_reads_enabled is false", () => {
    const s = { ...fullyReady(), canonical_reads_enabled: false }
    expect(canRetireEventLegacyData(s).can_retire).toBe(false)
  })

  it("blocks when unresolved_records > 0", () => {
    const s = { ...fullyReady(), unresolved_records: 3 }
    const { can_retire, blockers } = canRetireEventLegacyData(s)
    expect(can_retire).toBe(false)
    expect(blockers.some(b => b.includes("3 unresolved"))).toBe(true)
  })

  it("blocks when reconciliation_row is outside tolerance", () => {
    const reconciliation_row = buildTicketingReconciliationRow("org-1", "ev-1", "USD", 100, 99, 50000, 50000, 1)
    const s = { ...fullyReady(), reconciliation_row }
    expect(canRetireEventLegacyData(s).can_retire).toBe(false)
  })

  it("does not block when reconciliation_row is within tolerance", () => {
    const reconciliation_row = buildTicketingReconciliationRow("org-1", "ev-1", "USD", 100, 100, 50000, 50000, 1)
    const s = { ...fullyReady(), reconciliation_row }
    expect(canRetireEventLegacyData(s).can_retire).toBe(true)
  })
})

// ── TIX-602: Security/load review checks ────────────────────────────────────

describe("TIX-602 – runTicketingSecurityChecklist", () => {
  it("can_release=true when all checks pass", () => {
    const input = [
      { check_type: "oversell_race" as const, passed: true, severity: "blocker" as const },
      { check_type: "idor_prevention" as const, passed: true, severity: "blocker" as const },
      { check_type: "promo_abuse" as const, passed: true, severity: "high" as const },
      { check_type: "scanner_forgery_replay" as const, passed: true, severity: "blocker" as const },
      { check_type: "offline_duplication" as const, passed: true, severity: "high" as const },
      { check_type: "refund_privilege" as const, passed: true, severity: "blocker" as const },
      { check_type: "webhook_attack" as const, passed: true, severity: "blocker" as const },
      { check_type: "high_volume_scan" as const, passed: true, severity: "medium" as const },
    ]
    const r = runTicketingSecurityChecklist(input)
    expect(r.can_release).toBe(true)
    expect(r.has_blockers).toBe(false)
    expect(r.has_high).toBe(false)
    expect(r.checks).toHaveLength(8)
  })

  it("can_release=false when a blocker check fails", () => {
    const r = runTicketingSecurityChecklist([
      { check_type: "oversell_race" as const, passed: false, severity: "blocker" as const },
    ])
    expect(r.can_release).toBe(false)
    expect(r.has_blockers).toBe(true)
  })

  it("can_release=false when a high check fails", () => {
    const r = runTicketingSecurityChecklist([
      { check_type: "promo_abuse" as const, passed: false, severity: "high" as const },
    ])
    expect(r.can_release).toBe(false)
    expect(r.has_high).toBe(true)
  })

  it("can_release=true when only medium checks fail", () => {
    const r = runTicketingSecurityChecklist([
      { check_type: "high_volume_scan" as const, passed: false, severity: "medium" as const },
    ])
    expect(r.can_release).toBe(true)
    expect(r.has_blockers).toBe(false)
    expect(r.has_high).toBe(false)
  })

  it("attaches correct descriptions to each check type", () => {
    const r = runTicketingSecurityChecklist([
      { check_type: "scanner_forgery_replay" as const, passed: true, severity: "blocker" as const },
    ])
    expect(r.checks[0].description).toMatch(/scan/i)
  })
})

// ── TIX-603: Retire old routes/tables/policies ───────────────────────────────

describe("TIX-603 – assessRetirementReadiness", () => {
  const readyItem = (): TicketingRetirementItem => ({
    item_id: "i1", item_type: "route", identifier: "/api/legacy-tickets",
    current_usage_count: 0, canonical_replacement: "/api/admin/tickets",
    historical_reads_preserved: true, permissive_policy_absent: true,
    status: "ready",
  })

  it("ready=true when all conditions met", () => {
    expect(assessRetirementReadiness(readyItem()).ready).toBe(true)
  })

  it("blocks when current_usage_count > 0", () => {
    const item = { ...readyItem(), current_usage_count: 5 }
    const r = assessRetirementReadiness(item)
    expect(r.ready).toBe(false)
    expect(r.blockers.some(b => b.includes("5 active usage"))).toBe(true)
  })

  it("blocks when historical_reads_preserved is false", () => {
    const item = { ...readyItem(), historical_reads_preserved: false }
    expect(assessRetirementReadiness(item).ready).toBe(false)
  })

  it("blocks when permissive_policy_absent is false", () => {
    const item = { ...readyItem(), permissive_policy_absent: false }
    expect(assessRetirementReadiness(item).ready).toBe(false)
  })
})

describe("TIX-603 – buildRetirementSummary", () => {
  it("counts statuses correctly and sets all_retired=true when all retired", () => {
    const items: TicketingRetirementItem[] = [
      { item_id: "a", item_type: "route", identifier: "r1", current_usage_count: 0, canonical_replacement: "c1", historical_reads_preserved: true, permissive_policy_absent: true, status: "retired" },
      { item_id: "b", item_type: "table", identifier: "t1", current_usage_count: 0, canonical_replacement: "c2", historical_reads_preserved: true, permissive_policy_absent: true, status: "retired" },
    ]
    const s = buildRetirementSummary(items)
    expect(s.total).toBe(2)
    expect(s.retired).toBe(2)
    expect(s.all_retired).toBe(true)
  })

  it("all_retired=false when any item is not retired", () => {
    const items: TicketingRetirementItem[] = [
      { item_id: "a", item_type: "route", identifier: "r1", current_usage_count: 0, canonical_replacement: "c1", historical_reads_preserved: true, permissive_policy_absent: true, status: "retired" },
      { item_id: "b", item_type: "rls_policy", identifier: "p1", current_usage_count: 2, canonical_replacement: "c2", historical_reads_preserved: false, permissive_policy_absent: false, status: "blocked" },
    ]
    const s = buildRetirementSummary(items)
    expect(s.all_retired).toBe(false)
    expect(s.retired).toBe(1)
    expect(s.blocked).toBe(1)
  })

  it("counts pending and ready separately", () => {
    const make = (status: TicketingRetirementItem["status"], id: string): TicketingRetirementItem => ({
      item_id: id, item_type: "job", identifier: id, current_usage_count: 0,
      canonical_replacement: "c", historical_reads_preserved: true, permissive_policy_absent: true, status,
    })
    const items = [make("pending", "a"), make("ready", "b"), make("ready", "c")]
    const s = buildRetirementSummary(items)
    expect(s.pending).toBe(1)
    expect(s.ready).toBe(2)
    expect(s.all_retired).toBe(false)
  })
})
