import { describe, expect, it } from "vitest"

import {
  assertRentalStatusTransition,
  canTransitionRentalStatus,
  computeAgreementActualCost,
  computeAgreementQuotedCost,
  detectCostVariance,
  detectDamageOnReturn,
  detectDateOverlap,
  detectMissingOwners,
  detectOverdueReturn,
  RentalStatusTransitionError,
  scanRentalAlerts,
  type RentalAgreement,
  type RentalLineItem,
} from "@/lib/admin/rental-agreement"

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeLineItem(overrides: Partial<RentalLineItem> = {}): RentalLineItem {
  return {
    id: overrides.id ?? "item-1",
    catalog_item_id: overrides.catalog_item_id ?? "cat-1",
    label: overrides.label ?? "Wireless Mic Kit",
    quantity: overrides.quantity ?? 2,
    unit_cost_quoted: overrides.unit_cost_quoted ?? 150,
    unit_cost_actual: overrides.unit_cost_actual ?? null,
    currency: "USD",
    rental_start_date: overrides.rental_start_date ?? "2025-06-01",
    rental_end_date:   overrides.rental_end_date   ?? "2025-06-07",
    condition_at_pickup: overrides.condition_at_pickup ?? "good",
    condition_at_return: overrides.condition_at_return ?? null,
    condition_notes: null,
    is_returned: overrides.is_returned ?? false,
    returned_at_utc: null,
    ...overrides,
  }
}

function makeAgreement(overrides: Partial<RentalAgreement> = {}): RentalAgreement {
  return {
    id: overrides.id ?? "rnt-1",
    org_id: "org-1",
    tour_id: "tour-1",
    vendor_id: "vnd-1",
    vendor_name: "Pro Audio Rentals Inc.",
    rental_start_date: "2025-06-01",
    rental_end_date:   "2025-06-07",
    line_items: overrides.line_items ?? [makeLineItem()],
    total_cost_quoted: null,
    total_cost_actual: null,
    currency: "USD",
    deposit_amount: 200,
    deposit_paid: false,
    terms_notes: null,
    pickup: overrides.pickup ?? {
      operation: "pickup",
      location_label: "Venue Dock",
      stop_id: "stop-1",
      owner_user_id: "user-pm",
      owner_user_name: "Tour PM",
      planned_utc: "2025-06-01T09:00:00Z",
      actual_utc: null,
      notes: null,
    },
    return: overrides.return ?? {
      operation: "return",
      location_label: "Venue Dock",
      stop_id: "stop-1",
      owner_user_id: "user-pm",
      owner_user_name: "Tour PM",
      planned_utc: "2025-06-07T18:00:00Z",
      actual_utc: null,
      notes: null,
    },
    contract_id: null,
    po_number: null,
    invoice_ref: null,
    status: overrides.status ?? "approved",
    created_by_user_id: "user-1",
    created_at: "2025-05-01T00:00:00Z",
    updated_at: "2025-05-01T00:00:00Z",
    ...overrides,
  }
}

// ============================================================================
// RENT-301 — Status transitions
// ============================================================================

describe("RENT-301 rental status transitions", () => {
  it("allows draft → quoted → approved → active → returned → invoiced → reconciled", () => {
    expect(canTransitionRentalStatus("draft",     "quoted")).toBe(true)
    expect(canTransitionRentalStatus("quoted",    "approved")).toBe(true)
    expect(canTransitionRentalStatus("approved",  "active")).toBe(true)
    expect(canTransitionRentalStatus("active",    "returned")).toBe(true)
    expect(canTransitionRentalStatus("returned",  "invoiced")).toBe(true)
    expect(canTransitionRentalStatus("invoiced",  "reconciled")).toBe(true)
  })

  it("allows quoted → draft (revision)", () => {
    expect(canTransitionRentalStatus("quoted", "draft")).toBe(true)
  })

  it("allows any non-reconciled to cancel; cancelled → draft re-draft", () => {
    expect(canTransitionRentalStatus("active",    "cancelled")).toBe(true)
    expect(canTransitionRentalStatus("cancelled", "draft")).toBe(true)
  })

  it("allows invoiced → returned (dispute path)", () => {
    expect(canTransitionRentalStatus("invoiced", "returned")).toBe(true)
  })

  it("treats same-status as idempotent", () => {
    expect(canTransitionRentalStatus("active", "active")).toBe(true)
  })

  it("rejects reconciled → any (terminal)", () => {
    expect(canTransitionRentalStatus("reconciled", "active")).toBe(false)
    expect(() => assertRentalStatusTransition("reconciled", "active")).toThrow(
      RentalStatusTransitionError,
    )
  })
})

// ============================================================================
// RENT-301 — Cost helpers
// ============================================================================

describe("RENT-301 cost computation", () => {
  it("computes quoted cost from line items", () => {
    const agreement = makeAgreement({
      line_items: [
        makeLineItem({ quantity: 2, unit_cost_quoted: 150 }),
        makeLineItem({ id: "item-2", quantity: 1, unit_cost_quoted: 80 }),
      ],
    })
    expect(computeAgreementQuotedCost(agreement)).toBe(380) // 2×150 + 1×80
  })

  it("computes actual cost falling back to quoted when actual is null", () => {
    const agreement = makeAgreement({
      line_items: [
        makeLineItem({ quantity: 2, unit_cost_quoted: 150, unit_cost_actual: 160 }),
        makeLineItem({ id: "item-2", quantity: 1, unit_cost_quoted: 80, unit_cost_actual: null }),
      ],
    })
    expect(computeAgreementActualCost(agreement)).toBe(400) // 2×160 + 1×80
  })

  it("returns 0 for empty line items", () => {
    const agreement = makeAgreement({ line_items: [] })
    expect(computeAgreementQuotedCost(agreement)).toBe(0)
    expect(computeAgreementActualCost(agreement)).toBe(0)
  })
})

// ============================================================================
// RENT-302 — Date overlap detection
// ============================================================================

describe("RENT-302 date overlap", () => {
  it("detects overlapping rental periods for same catalog item", () => {
    const a = makeAgreement({
      id: "rnt-1",
      line_items: [makeLineItem({ catalog_item_id: "cat-1", rental_start_date: "2025-06-01", rental_end_date: "2025-06-10" })],
    })
    const b = makeAgreement({
      id: "rnt-2",
      line_items: [makeLineItem({ catalog_item_id: "cat-1", rental_start_date: "2025-06-08", rental_end_date: "2025-06-15" })],
    })
    const alerts = detectDateOverlap(a, b)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].code).toBe("date_overlap")
    expect(alerts[0].severity).toBe("blocking")
    expect(alerts[0].conflicting_agreement_id).toBe("rnt-2")
  })

  it("returns no alert for non-overlapping periods", () => {
    const a = makeAgreement({ id: "rnt-1", line_items: [makeLineItem({ catalog_item_id: "cat-1", rental_start_date: "2025-06-01", rental_end_date: "2025-06-07" })] })
    const b = makeAgreement({ id: "rnt-2", line_items: [makeLineItem({ catalog_item_id: "cat-1", rental_start_date: "2025-06-07", rental_end_date: "2025-06-14" })] })
    expect(detectDateOverlap(a, b)).toHaveLength(0)
  })

  it("returns no alert for different catalog items", () => {
    const a = makeAgreement({ id: "rnt-1", line_items: [makeLineItem({ catalog_item_id: "cat-1" })] })
    const b = makeAgreement({ id: "rnt-2", line_items: [makeLineItem({ catalog_item_id: "cat-2" })] })
    expect(detectDateOverlap(a, b)).toHaveLength(0)
  })

  it("returns no alert when comparing agreement with itself", () => {
    const a = makeAgreement()
    expect(detectDateOverlap(a, a)).toHaveLength(0)
  })
})

// ============================================================================
// RENT-302 — Missing owners
// ============================================================================

describe("RENT-302 missing owners", () => {
  it("flags missing pickup owner on approved agreement", () => {
    const agreement = makeAgreement({
      pickup: { operation: "pickup", location_label: "Dock", stop_id: null, owner_user_id: null, owner_user_name: null, planned_utc: null, actual_utc: null, notes: null },
    })
    const alerts = detectMissingOwners(agreement)
    expect(alerts.some((a) => a.code === "missing_pickup_owner")).toBe(true)
  })

  it("flags missing return owner on approved agreement", () => {
    const agreement = makeAgreement({
      return: { operation: "return", location_label: "Dock", stop_id: null, owner_user_id: null, owner_user_name: null, planned_utc: null, actual_utc: null, notes: null },
    })
    const alerts = detectMissingOwners(agreement)
    expect(alerts.some((a) => a.code === "missing_return_owner")).toBe(true)
  })

  it("does not flag on draft agreements", () => {
    const agreement = makeAgreement({
      status: "draft",
      pickup: { operation: "pickup", location_label: "Dock", stop_id: null, owner_user_id: null, owner_user_name: null, planned_utc: null, actual_utc: null, notes: null },
    })
    expect(detectMissingOwners(agreement)).toHaveLength(0)
  })
})

// ============================================================================
// RENT-302 — Overdue returns
// ============================================================================

describe("RENT-302 overdue return", () => {
  it("flags overdue items on active agreement past end date", () => {
    const agreement = makeAgreement({
      status: "active",
      line_items: [makeLineItem({ rental_end_date: "2025-06-07", is_returned: false })],
    })
    const alerts = detectOverdueReturn(agreement, "2025-06-10")
    expect(alerts).toHaveLength(1)
    expect(alerts[0].code).toBe("overdue_return")
    expect(alerts[0].severity).toBe("blocking")
    expect(alerts[0].should_escalate).toBe(true)
  })

  it("does not flag when all items are returned", () => {
    const agreement = makeAgreement({
      status: "active",
      line_items: [makeLineItem({ rental_end_date: "2025-06-07", is_returned: true })],
    })
    expect(detectOverdueReturn(agreement, "2025-06-10")).toHaveLength(0)
  })

  it("does not flag on non-active agreements", () => {
    const agreement = makeAgreement({ status: "returned" })
    expect(detectOverdueReturn(agreement, "2025-06-10")).toHaveLength(0)
  })

  it("does not flag when today is before end date", () => {
    const agreement = makeAgreement({
      status: "active",
      line_items: [makeLineItem({ rental_end_date: "2025-06-07", is_returned: false })],
    })
    expect(detectOverdueReturn(agreement, "2025-06-01")).toHaveLength(0)
  })
})

// ============================================================================
// RENT-302 — Damage on return
// ============================================================================

describe("RENT-302 damage on return", () => {
  it("flags damaged items returned", () => {
    const agreement = makeAgreement({
      line_items: [makeLineItem({ is_returned: true, condition_at_return: "damaged" })],
    })
    const alerts = detectDamageOnReturn(agreement)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].code).toBe("damage_on_return")
    expect(alerts[0].severity).toBe("warning")
  })

  it("flags missing items", () => {
    const agreement = makeAgreement({
      line_items: [makeLineItem({ is_returned: true, condition_at_return: "missing" })],
    })
    expect(detectDamageOnReturn(agreement)[0].code).toBe("damage_on_return")
  })

  it("does not flag good condition returns", () => {
    const agreement = makeAgreement({
      line_items: [makeLineItem({ is_returned: true, condition_at_return: "good" })],
    })
    expect(detectDamageOnReturn(agreement)).toHaveLength(0)
  })
})

// ============================================================================
// RENT-302 — Cost variance
// ============================================================================

describe("RENT-302 cost variance", () => {
  it("flags variance exceeding threshold", () => {
    const agreement = makeAgreement({
      // quoted: 2 × 150 = 300; actual: 2 × 180 = 360 → 20% over
      line_items: [makeLineItem({ quantity: 2, unit_cost_quoted: 150, unit_cost_actual: 180 })],
    })
    const alerts = detectCostVariance(agreement, 10)
    expect(alerts).toHaveLength(1)
    expect(alerts[0].code).toBe("cost_variance")
  })

  it("does not flag when under threshold", () => {
    const agreement = makeAgreement({
      // quoted: 300; actual: 309 → 3% over
      line_items: [makeLineItem({ quantity: 2, unit_cost_quoted: 150, unit_cost_actual: 154.5 })],
    })
    expect(detectCostVariance(agreement, 10)).toHaveLength(0)
  })

  it("sets should_escalate when variance is > 2× threshold", () => {
    const agreement = makeAgreement({
      // quoted: 300; actual: 420 → 40% over (> 20% = 2×10%)
      line_items: [makeLineItem({ quantity: 2, unit_cost_quoted: 150, unit_cost_actual: 210 })],
    })
    const alerts = detectCostVariance(agreement, 10)
    expect(alerts[0].should_escalate).toBe(true)
  })

  it("does not flag when quoted is zero (no baseline)", () => {
    const agreement = makeAgreement({
      line_items: [makeLineItem({ unit_cost_quoted: 0, unit_cost_actual: 100 })],
    })
    expect(detectCostVariance(agreement)).toHaveLength(0)
  })
})

// ============================================================================
// RENT-302 — Full scan
// ============================================================================

describe("RENT-302 scanRentalAlerts", () => {
  it("returns clean result when no issues", () => {
    const agreement = makeAgreement({ status: "active" })
    const result = scanRentalAlerts(agreement, [agreement], "2025-06-01")
    expect(result.blocking_count).toBe(0)
    expect(result.warning_count).toBe(0)
    expect(result.needs_escalation).toBe(false)
  })

  it("aggregates all alert types in one scan", () => {
    const overdue = makeAgreement({
      id: "rnt-ov",
      status: "active",
      pickup: { operation: "pickup", location_label: "Dock", stop_id: null, owner_user_id: null, owner_user_name: null, planned_utc: null, actual_utc: null, notes: null },
      line_items: [
        makeLineItem({ id: "li-1", rental_end_date: "2025-06-01", is_returned: false }), // overdue
        makeLineItem({ id: "li-2", is_returned: true, condition_at_return: "damaged" }),  // damage
      ],
    })
    const result = scanRentalAlerts(overdue, [overdue], "2025-06-10")
    // missing_pickup_owner (blocking) + overdue_return (blocking) + damage_on_return (warning)
    expect(result.blocking_count).toBeGreaterThanOrEqual(2)
    expect(result.warning_count).toBeGreaterThanOrEqual(1)
    expect(result.needs_escalation).toBe(true)
  })
})
