import { describe, it, expect } from "vitest"
import {
  submitExpense,
  rejectExpense,
  computeCashAdvanceOutstanding,
  isAdvanceOverdue,
  computePerDiemEntitlement,
  convertMinorUnits,
  lockFxRate,
  roundHalfEvenFin,
  buildFxSummary,
  type ExpenseReport,
  type CashAdvance,
  type PerDiemPolicy,
  type AppliedFxRate,
} from "@/lib/admin/finance-expense"

// ---------------------------------------------------------------------------
// FIN-508 — Expense workflow
// ---------------------------------------------------------------------------

const BASE_EXPENSE: ExpenseReport = {
  expense_id: "e-1", org_id: "o", event_id: "ev-1", submitter_id: "u-1",
  status: "draft", amount_minor_units: 5000, currency: "USD",
  vendor: "Hotel", category_id: "c1", date: "2025-08-01", scope: null,
  notes: null, receipt_file_ids: [], is_duplicate_suspected: false, rejection_reason: null,
}

describe("FIN-508 — Expense workflow", () => {
  it("submits a draft expense", () => {
    const r = submitExpense(BASE_EXPENSE)
    expect(r.ok).toBe(true)
    expect(r.expense?.status).toBe("submitted")
  })

  it("blocks submit with zero amount", () => {
    expect(submitExpense({ ...BASE_EXPENSE, amount_minor_units: 0 }).ok).toBe(false)
  })

  it("rejects with reason", () => {
    const submitted = submitExpense(BASE_EXPENSE).expense!
    const r = rejectExpense(submitted, "Missing receipt")
    expect(r.ok).toBe(true)
    expect(r.expense?.status).toBe("rejected")
    expect(r.expense?.rejection_reason).toBe("Missing receipt")
  })

  it("reject requires reason", () => {
    const submitted = submitExpense(BASE_EXPENSE).expense!
    expect(rejectExpense(submitted, "  ").ok).toBe(false)
  })

  it("cannot submit non-draft", () => {
    const submitted = submitExpense(BASE_EXPENSE).expense!
    expect(submitExpense(submitted).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// FIN-509 — Cash advance
// ---------------------------------------------------------------------------

const BASE_ADVANCE: CashAdvance = {
  advance_id: "ca-1", org_id: "o", requester_id: "u-1", custodian_id: "u-2",
  status: "issued", requested_minor_units: 50000, issued_minor_units: 50000,
  spent_minor_units: 20000, returned_minor_units: 0, currency: "USD",
  purpose: "Per diems", due_date: "2025-08-10T00:00:00Z",
  acknowledged_at: "T", reconciled_at: null,
}

describe("FIN-509 — Cash advance", () => {
  it("computes outstanding balance", () => {
    expect(computeCashAdvanceOutstanding(BASE_ADVANCE)).toBe(30_000)
  })

  it("detects overdue advance", () => {
    expect(isAdvanceOverdue(BASE_ADVANCE, "2025-08-11T00:00:00Z")).toBe(true)
  })

  it("no overdue when on time", () => {
    expect(isAdvanceOverdue(BASE_ADVANCE, "2025-08-09T00:00:00Z")).toBe(false)
  })

  it("no overdue when reconciled", () => {
    const reconciled = { ...BASE_ADVANCE, status: "reconciled" as const }
    expect(isAdvanceOverdue(reconciled, "2025-08-11T00:00:00Z")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// FIN-510 — Per diem
// ---------------------------------------------------------------------------

const BASE_POLICY: PerDiemPolicy = {
  policy_id: "pd-1", org_id: "o", name: "Standard",
  daily_rate_minor_units: 7500, currency: "USD",
  applicable_roles: ["crew"], eligible_day_types: ["show", "travel"],
  meal_deduction_minor_units: 1500, eligible_locations: [],
}

describe("FIN-510 — Per diem", () => {
  it("computes entitlement with meal deductions", () => {
    const e = computePerDiemEntitlement("u-1", BASE_POLICY, 5, 3)
    expect(e.total_before_deductions).toBe(37_500)
    expect(e.meal_deductions).toBe(4_500)
    expect(e.net_entitlement).toBe(33_000)
  })

  it("net_entitlement floors at 0", () => {
    const e = computePerDiemEntitlement("u-1", BASE_POLICY, 1, 100)
    expect(e.net_entitlement).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// FIN-511 — Multi-currency/FX
// ---------------------------------------------------------------------------

const EUR_USD: AppliedFxRate = {
  from_currency: "EUR", to_currency: "USD", rate: 1.09,
  rate_source: "approved_feed", applied_at: "T", is_locked: false,
}

describe("FIN-511 — FX service", () => {
  it("converts minor units", () => {
    expect(convertMinorUnits(10000, EUR_USD)).toBe(10900) // 100 EUR → 109 USD
  })

  it("locks rate as immutable", () => {
    const locked = lockFxRate(EUR_USD)
    expect(locked.is_locked).toBe(true)
  })

  it("roundHalfEvenFin — banker's rounding", () => {
    expect(roundHalfEvenFin(2.5, 0)).toBe(2)  // round to even
    expect(roundHalfEvenFin(3.5, 0)).toBe(4)  // round to even
    expect(roundHalfEvenFin(2.4, 0)).toBe(2)  // standard
    expect(roundHalfEvenFin(2.6, 0)).toBe(3)  // standard
  })

  it("builds FX summary", () => {
    const amounts = [
      { amount: 10000, currency: "USD" },
      { amount: 10000, currency: "EUR" },
      { amount: 5000, currency: "GBP" }, // no rate
    ]
    const r = buildFxSummary(amounts, [EUR_USD], "USD")
    expect(r.total_reporting_currency).toBe(10000 + 10900) // GBP has no rate
    expect(r.unavailable_currencies).toContain("GBP")
  })
})
