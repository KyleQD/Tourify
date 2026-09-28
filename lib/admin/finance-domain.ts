/**
 * FIN-501 — Category/department hierarchy.
 * FIN-502 — Budget templates/versions.
 * FIN-503 — Budget-line editor.
 * FIN-504 — Commitment/actual rollups.
 * FIN-505 — Approval policy engine.
 * FIN-506 — Purchase request/PO/change order.
 * FIN-507 — Invoice match/status.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ===========================================================================
// FIN-501 — Category/department hierarchy
// ===========================================================================

export interface FinanceCategory {
  category_id: string
  org_id: string
  code: string
  name: string
  parent_id: string | null
  reporting_order: number
  /** Scopes where this category is allowed (e.g. "expense", "budget", "po"). */
  allowed_scopes: string[]
  is_active: boolean
  legacy_category_mapping: string | null
}

export function buildCategoryTree(
  categories: readonly FinanceCategory[],
): Map<string | null, FinanceCategory[]> {
  const tree = new Map<string | null, FinanceCategory[]>()
  for (const c of categories) {
    const key = c.parent_id ?? null
    if (!tree.has(key)) tree.set(key, [])
    tree.get(key)!.push(c)
  }
  return tree
}

export function isCategoryAllowed(cat: FinanceCategory, scope: string): boolean {
  return cat.is_active && cat.allowed_scopes.includes(scope)
}

// ===========================================================================
// FIN-502 — Budget templates/versions
// ===========================================================================

export type BudgetStatus = "baseline" | "forecast" | "scenario" | "approved" | "archived"

export interface BudgetVersion {
  version_id: string
  org_id: string
  tour_id: string
  version_number: number
  status: BudgetStatus
  name: string
  total_minor_units: number
  currency: string
  is_immutable: boolean   // true when approved
  created_by: string
  created_at: string
  approved_by: string | null
  approved_at: string | null
}

export function approveBudgetVersion(
  version: BudgetVersion,
  approver: string,
  now: string,
): { ok: boolean; version: BudgetVersion | null; error?: string } {
  if (version.status === "approved") {
    return { ok: false, version: null, error: "Version is already approved." }
  }
  return {
    ok: true,
    version: { ...version, status: "approved", is_immutable: true, approved_by: approver, approved_at: now },
  }
}

export function createNextBudgetVersion(
  previous: BudgetVersion,
  params: { version_id: string; name: string; status: BudgetStatus; actor: string; now: string },
): BudgetVersion {
  return {
    ...previous,
    version_id: params.version_id,
    version_number: previous.version_number + 1,
    status: params.status,
    name: params.name,
    is_immutable: false,
    created_by: params.actor,
    created_at: params.now,
    approved_by: null,
    approved_at: null,
  }
}

// ===========================================================================
// FIN-503 — Budget-line editor
// ===========================================================================

export type LineAmountType = "quantity_rate" | "fixed" | "formula"

export interface BudgetLine {
  line_id: string
  version_id: string
  category_id: string
  description: string
  amount_type: LineAmountType
  quantity: number | null
  rate_minor_units: number | null
  fixed_minor_units: number | null
  formula: string | null
  currency: string
  reporting_currency: string
  fx_rate: number | null
  owner_id: string | null
  scope: string | null
  vendor_id: string | null
  contract_id: string | null
  assumption: string | null
  notes: string | null
}

export function computeBudgetLineTotal(line: BudgetLine): number {
  if (line.amount_type === "quantity_rate") {
    return Math.round((line.quantity ?? 0) * (line.rate_minor_units ?? 0))
  }
  if (line.amount_type === "fixed") {
    return line.fixed_minor_units ?? 0
  }
  return 0 // formula lines require external evaluation
}

export function validateBudgetLine(line: BudgetLine): string[] {
  const errors: string[] = []
  if (!line.currency) errors.push("currency is required")
  if (line.amount_type === "quantity_rate" && (line.quantity == null || line.rate_minor_units == null)) {
    errors.push("quantity and rate_minor_units are required for quantity_rate lines")
  }
  if (line.amount_type === "fixed" && line.fixed_minor_units == null) {
    errors.push("fixed_minor_units is required for fixed lines")
  }
  return errors
}

// ===========================================================================
// FIN-504 — Commitment/actual rollups
// ===========================================================================

export type CommitmentSourceType =
  | "purchase_request"
  | "purchase_order"
  | "contract"
  | "invoice"
  | "expense"
  | "payroll_estimate"
  | "travel"
  | "ticketing"
  | "settlement"

export interface CommitmentEntry {
  entry_id: string
  budget_version_id: string
  budget_line_id: string | null
  source_type: CommitmentSourceType
  source_id: string
  amount_minor_units: number
  currency: string
  is_actual: boolean
  posted_at: string
}

export interface BudgetRollup {
  budget_version_id: string
  total_budget: number
  committed: number
  actuals: number
  remaining: number
  utilization_pct: number
}

export function buildBudgetRollup(
  version_id: string,
  total_budget: number,
  entries: readonly CommitmentEntry[],
): BudgetRollup {
  const versionEntries = entries.filter((e) => e.budget_version_id === version_id)
  const committed = versionEntries.filter((e) => !e.is_actual).reduce((s, e) => s + e.amount_minor_units, 0)
  const actuals = versionEntries.filter((e) => e.is_actual).reduce((s, e) => s + e.amount_minor_units, 0)
  const remaining = total_budget - committed - actuals
  const utilization_pct = total_budget > 0 ? Math.round(((committed + actuals) / total_budget) * 100) : 0
  return { budget_version_id: version_id, total_budget, committed, actuals, remaining, utilization_pct }
}

// ===========================================================================
// FIN-505 — Approval policy engine
// ===========================================================================

export interface ApprovalThreshold {
  max_amount_minor_units: number | null  // null = any amount
  category_id: string | null
  department: string | null
  required_approver_ids: string[]
  require_separation: boolean   // proposer cannot be approver
}

export interface ApprovalPolicyResult {
  requires_approval: boolean
  matching_threshold: ApprovalThreshold | null
  eligible_approvers: string[]
  disqualified_proposer: boolean
}

export function evaluateApprovalPolicy(
  amount: number,
  category_id: string | null,
  department: string | null,
  proposed_by: string,
  thresholds: readonly ApprovalThreshold[],
): ApprovalPolicyResult {
  const matching = thresholds.find((t) => {
    if (t.max_amount_minor_units !== null && amount > t.max_amount_minor_units) return false
    if (t.category_id && category_id && t.category_id !== category_id) return false
    if (t.department && department && t.department !== department) return false
    return true
  })

  if (!matching || !matching.required_approver_ids.length) {
    return { requires_approval: false, matching_threshold: null, eligible_approvers: [], disqualified_proposer: false }
  }

  const disqualified = matching.require_separation && matching.required_approver_ids.includes(proposed_by)
  const eligible = matching.require_separation
    ? matching.required_approver_ids.filter((id) => id !== proposed_by)
    : matching.required_approver_ids

  return {
    requires_approval: true,
    matching_threshold: matching,
    eligible_approvers: eligible,
    disqualified_proposer: disqualified,
  }
}

// ===========================================================================
// FIN-506 — Purchase request / PO / change order
// ===========================================================================

export type POStatus = "draft" | "pending_approval" | "approved" | "issued" | "partially_received" | "received" | "closed" | "cancelled"

export interface PurchaseOrder {
  po_id: string
  org_id: string
  vendor_id: string
  contract_id: string | null
  budget_version_id: string
  status: POStatus
  total_minor_units: number
  currency: string
  lines: POLine[]
  approved_by: string | null
  approved_at: string | null
  cancel_reason: string | null
  created_by: string
  created_at: string
}

export interface POLine {
  line_id: string
  description: string
  quantity: number
  unit_price_minor_units: number
  received_quantity: number
}

export const PO_STATUS_TRANSITIONS: Record<POStatus, POStatus[]> = {
  draft: ["pending_approval", "cancelled"],
  pending_approval: ["approved", "cancelled"],
  approved: ["issued", "cancelled"],
  issued: ["partially_received", "received", "cancelled"],
  partially_received: ["received", "cancelled"],
  received: ["closed"],
  closed: [],
  cancelled: [],
}

export function transitionPOStatus(
  po: PurchaseOrder,
  toStatus: POStatus,
  actor: string,
  now: string,
  opts?: { cancel_reason?: string },
): { ok: boolean; po: PurchaseOrder | null; error?: string } {
  if (!PO_STATUS_TRANSITIONS[po.status].includes(toStatus)) {
    return { ok: false, po: null, error: `Cannot transition PO from '${po.status}' to '${toStatus}'.` }
  }
  if (toStatus === "cancelled" && !opts?.cancel_reason?.trim()) {
    return { ok: false, po: null, error: "cancel_reason is required." }
  }
  const updates: Partial<PurchaseOrder> = { status: toStatus }
  if (toStatus === "approved") {
    updates.approved_by = actor
    updates.approved_at = now
  }
  if (toStatus === "cancelled") updates.cancel_reason = opts?.cancel_reason ?? null
  return { ok: true, po: { ...po, ...updates } }
}

// ===========================================================================
// FIN-507 — Invoice match/status
// ===========================================================================

export type InvoiceMatchStatus = "unmatched" | "matched" | "partial_match" | "exception" | "approved" | "exported" | "payment_recorded"

export type InvoiceVarianceType = "quantity" | "price" | "tax" | "currency"

export interface InvoiceVariance {
  variance_type: InvoiceVarianceType
  expected: number
  actual: number
  detail: string
}

export interface InvoiceMatchResult {
  invoice_id: string
  po_id: string | null
  status: InvoiceMatchStatus
  variances: InvoiceVariance[]
  requires_exception_approval: boolean
}

export function matchInvoiceToPO(
  invoice_id: string,
  po_id: string | null,
  invoiceAmount: number,
  poAmount: number,
  invoiceTax: number,
  expectedTax: number,
): InvoiceMatchResult {
  const variances: InvoiceVariance[] = []

  if (invoiceAmount !== poAmount) {
    variances.push({
      variance_type: "price",
      expected: poAmount,
      actual: invoiceAmount,
      detail: `Invoice amount (${invoiceAmount}) differs from PO (${poAmount})`,
    })
  }

  if (invoiceTax !== expectedTax) {
    variances.push({
      variance_type: "tax",
      expected: expectedTax,
      actual: invoiceTax,
      detail: `Tax (${invoiceTax}) differs from expected (${expectedTax})`,
    })
  }

  const status: InvoiceMatchStatus =
    variances.length === 0 ? "matched" :
    variances.some((v) => v.variance_type === "price") ? "exception" :
    "partial_match"

  return {
    invoice_id,
    po_id,
    status,
    variances,
    requires_exception_approval: variances.length > 0,
  }
}
