import { describe, it, expect } from "vitest"
import {
  buildCategoryTree,
  isCategoryAllowed,
  approveBudgetVersion,
  createNextBudgetVersion,
  computeBudgetLineTotal,
  validateBudgetLine,
  buildBudgetRollup,
  evaluateApprovalPolicy,
  transitionPOStatus,
  matchInvoiceToPO,
  type FinanceCategory,
  type BudgetVersion,
  type BudgetLine,
  type CommitmentEntry,
  type ApprovalThreshold,
} from "@/lib/admin/finance-domain"

// ---------------------------------------------------------------------------
// FIN-501 — Category hierarchy
// ---------------------------------------------------------------------------

describe("FIN-501 — Category hierarchy", () => {
  const cats: FinanceCategory[] = [
    { category_id: "c1", org_id: "o", code: "100", name: "Production", parent_id: null, reporting_order: 1, allowed_scopes: ["budget", "expense"], is_active: true, legacy_category_mapping: null },
    { category_id: "c2", org_id: "o", code: "110", name: "Sound", parent_id: "c1", reporting_order: 1, allowed_scopes: ["expense"], is_active: true, legacy_category_mapping: "old_sound" },
    { category_id: "c3", org_id: "o", code: "200", name: "Archived", parent_id: null, reporting_order: 2, allowed_scopes: ["expense"], is_active: false, legacy_category_mapping: null },
  ]

  it("builds tree", () => {
    const tree = buildCategoryTree(cats)
    expect(tree.get(null)).toHaveLength(2)
    expect(tree.get("c1")).toHaveLength(1)
  })

  it("isCategoryAllowed checks scope and active state", () => {
    expect(isCategoryAllowed(cats[0], "budget")).toBe(true)
    expect(isCategoryAllowed(cats[0], "po")).toBe(false)
    expect(isCategoryAllowed(cats[2], "expense")).toBe(false) // inactive
  })
})

// ---------------------------------------------------------------------------
// FIN-502 — Budget versions
// ---------------------------------------------------------------------------

const BASE_BUDGET: BudgetVersion = {
  version_id: "v1", org_id: "o", tour_id: "t", version_number: 1,
  status: "baseline", name: "Initial Budget", total_minor_units: 1_000_000,
  currency: "USD", is_immutable: false, created_by: "u", created_at: "T",
  approved_by: null, approved_at: null,
}

describe("FIN-502 — Budget versions", () => {
  it("approves a budget version", () => {
    const r = approveBudgetVersion(BASE_BUDGET, "cfo", "T")
    expect(r.ok).toBe(true)
    expect(r.version?.is_immutable).toBe(true)
    expect(r.version?.status).toBe("approved")
  })

  it("cannot approve already approved", () => {
    const approved = approveBudgetVersion(BASE_BUDGET, "cfo", "T").version!
    expect(approveBudgetVersion(approved, "cfo", "T").ok).toBe(false)
  })

  it("creates next version from previous", () => {
    const v2 = createNextBudgetVersion(BASE_BUDGET, { version_id: "v2", name: "Forecast", status: "forecast", actor: "u", now: "T2" })
    expect(v2.version_number).toBe(2)
    expect(v2.is_immutable).toBe(false)
    expect(v2.status).toBe("forecast")
  })
})

// ---------------------------------------------------------------------------
// FIN-503 — Budget lines
// ---------------------------------------------------------------------------

const BASE_LINE: BudgetLine = {
  line_id: "l1", version_id: "v1", category_id: "c1", description: "Sound crew",
  amount_type: "quantity_rate", quantity: 10, rate_minor_units: 50000, fixed_minor_units: null,
  formula: null, currency: "USD", reporting_currency: "USD", fx_rate: null,
  owner_id: null, scope: null, vendor_id: null, contract_id: null, assumption: null, notes: null,
}

describe("FIN-503 — Budget lines", () => {
  it("computes quantity_rate total", () => {
    expect(computeBudgetLineTotal(BASE_LINE)).toBe(500_000)
  })

  it("computes fixed total", () => {
    expect(computeBudgetLineTotal({ ...BASE_LINE, amount_type: "fixed", fixed_minor_units: 200_000 })).toBe(200_000)
  })

  it("validates missing quantity", () => {
    const errors = validateBudgetLine({ ...BASE_LINE, quantity: null })
    expect(errors).toHaveLength(1)
  })

  it("validates valid line", () => {
    expect(validateBudgetLine(BASE_LINE)).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// FIN-504 — Rollups
// ---------------------------------------------------------------------------

describe("FIN-504 — Commitment rollups", () => {
  const entries: CommitmentEntry[] = [
    { entry_id: "e1", budget_version_id: "v1", budget_line_id: "l1", source_type: "purchase_order", source_id: "po-1", amount_minor_units: 100_000, currency: "USD", is_actual: false, posted_at: "T" },
    { entry_id: "e2", budget_version_id: "v1", budget_line_id: "l1", source_type: "invoice", source_id: "inv-1", amount_minor_units: 90_000, currency: "USD", is_actual: true, posted_at: "T" },
  ]

  it("builds rollup", () => {
    const rollup = buildBudgetRollup("v1", 500_000, entries)
    expect(rollup.committed).toBe(100_000)
    expect(rollup.actuals).toBe(90_000)
    expect(rollup.remaining).toBe(310_000)
    expect(rollup.utilization_pct).toBe(38) // 190k/500k = 38%
  })
})

// ---------------------------------------------------------------------------
// FIN-505 — Approval policy
// ---------------------------------------------------------------------------

describe("FIN-505 — Approval policy engine", () => {
  const thresholds: ApprovalThreshold[] = [
    { max_amount_minor_units: 100_000, category_id: null, department: null, required_approver_ids: ["mgr-1"], require_separation: false },
    { max_amount_minor_units: null, category_id: null, department: null, required_approver_ids: ["cfo", "vp"], require_separation: true },
  ]

  it("matches lower threshold for small amount", () => {
    const r = evaluateApprovalPolicy(50_000, null, null, "user-1", thresholds)
    expect(r.requires_approval).toBe(true)
    expect(r.eligible_approvers).toContain("mgr-1")
    expect(r.disqualified_proposer).toBe(false)
  })

  it("applies separation of duties", () => {
    const r = evaluateApprovalPolicy(200_000, null, null, "cfo", thresholds)
    expect(r.disqualified_proposer).toBe(true)
    expect(r.eligible_approvers).not.toContain("cfo")
    expect(r.eligible_approvers).toContain("vp")
  })
})

// ---------------------------------------------------------------------------
// FIN-506 — PO lifecycle
// ---------------------------------------------------------------------------

describe("FIN-506 — PO lifecycle", () => {
  const BASE_PO = { po_id: "po-1", org_id: "o", vendor_id: "v", contract_id: null, budget_version_id: "v1", status: "draft" as const, total_minor_units: 100_000, currency: "USD", lines: [], approved_by: null, approved_at: null, cancel_reason: null, created_by: "u", created_at: "T" }

  it("transitions draft → pending_approval", () => {
    const r = transitionPOStatus(BASE_PO, "pending_approval", "u", "T")
    expect(r.ok).toBe(true)
    expect(r.po?.status).toBe("pending_approval")
  })

  it("cancellation requires reason", () => {
    expect(transitionPOStatus(BASE_PO, "cancelled", "u", "T").ok).toBe(false)
    expect(transitionPOStatus(BASE_PO, "cancelled", "u", "T", { cancel_reason: "Budget cut" }).ok).toBe(true)
  })

  it("sets approved_by on approve", () => {
    const pending = transitionPOStatus(BASE_PO, "pending_approval", "u", "T").po!
    const r = transitionPOStatus(pending, "approved", "cfo", "T2")
    expect(r.ok).toBe(true)
    expect(r.po?.approved_by).toBe("cfo")
  })

  it("illegal transition blocked", () => {
    expect(transitionPOStatus(BASE_PO, "received", "u", "T").ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// FIN-507 — Invoice match
// ---------------------------------------------------------------------------

describe("FIN-507 — Invoice match", () => {
  it("matched when amounts and tax agree", () => {
    const r = matchInvoiceToPO("inv-1", "po-1", 100_000, 100_000, 8_000, 8_000)
    expect(r.status).toBe("matched")
    expect(r.variances).toHaveLength(0)
  })

  it("exception on price variance", () => {
    const r = matchInvoiceToPO("inv-1", "po-1", 110_000, 100_000, 8_000, 8_000)
    expect(r.status).toBe("exception")
    expect(r.requires_exception_approval).toBe(true)
  })

  it("partial match on tax variance only", () => {
    const r = matchInvoiceToPO("inv-1", "po-1", 100_000, 100_000, 9_000, 8_000)
    expect(r.status).toBe("partial_match")
  })
})
