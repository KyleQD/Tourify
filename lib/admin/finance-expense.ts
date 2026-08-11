/**
 * FIN-508 — Expense/receipt workflow.
 * FIN-509 — Cash-advance workflow.
 * FIN-510 — Per-diem policy/entitlement.
 * FIN-511 — Multi-currency/FX service.
 *
 * Pure: no I/O, no Supabase imports.
 */

// ===========================================================================
// FIN-508 — Expense/receipt workflow
// ===========================================================================

export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "reimbursed"
  | "exported"

export const EXPENSE_STATUS_TRANSITIONS: Record<ExpenseStatus, ExpenseStatus[]> = {
  draft: ["submitted", "under_review"],
  submitted: ["under_review", "approved", "rejected"],
  under_review: ["approved", "rejected"],
  approved: ["reimbursed", "exported"],
  rejected: ["draft"], // re-submit
  reimbursed: ["exported"],
  exported: [],
}

export interface ExpenseReport {
  expense_id: string
  org_id: string
  event_id: string | null
  submitter_id: string
  status: ExpenseStatus
  amount_minor_units: number
  currency: string
  vendor: string | null
  category_id: string
  date: string
  scope: string | null
  notes: string | null
  receipt_file_ids: string[]
  is_duplicate_suspected: boolean
  rejection_reason: string | null
}

export function canTransitionExpense(from: ExpenseStatus, to: ExpenseStatus): boolean {
  return EXPENSE_STATUS_TRANSITIONS[from].includes(to)
}

export function submitExpense(
  expense: ExpenseReport,
): { ok: boolean; expense: ExpenseReport | null; error?: string } {
  if (!canTransitionExpense(expense.status, "submitted")) {
    return { ok: false, expense: null, error: `Cannot submit from '${expense.status}'.` }
  }
  if (expense.amount_minor_units <= 0) {
    return { ok: false, expense: null, error: "Amount must be > 0." }
  }
  return { ok: true, expense: { ...expense, status: "submitted" } }
}

export function rejectExpense(
  expense: ExpenseReport,
  reason: string,
): { ok: boolean; expense: ExpenseReport | null; error?: string } {
  if (!reason.trim()) return { ok: false, expense: null, error: "Rejection reason required." }
  if (!canTransitionExpense(expense.status, "rejected")) {
    return { ok: false, expense: null, error: `Cannot reject from '${expense.status}'.` }
  }
  return { ok: true, expense: { ...expense, status: "rejected", rejection_reason: reason } }
}

// ===========================================================================
// FIN-509 — Cash-advance workflow
// ===========================================================================

export type CashAdvanceStatus =
  | "requested"
  | "approved"
  | "issued"
  | "acknowledged"
  | "partially_spent"
  | "returned"
  | "reconciled"
  | "overdue"

export interface CashAdvance {
  advance_id: string
  org_id: string
  requester_id: string
  custodian_id: string | null
  status: CashAdvanceStatus
  requested_minor_units: number
  issued_minor_units: number
  spent_minor_units: number
  returned_minor_units: number
  currency: string
  purpose: string
  due_date: string | null
  acknowledged_at: string | null
  reconciled_at: string | null
}

export function computeCashAdvanceOutstanding(advance: CashAdvance): number {
  return advance.issued_minor_units - advance.spent_minor_units - advance.returned_minor_units
}

export function isAdvanceOverdue(advance: CashAdvance, nowIso: string): boolean {
  if (!advance.due_date) return false
  const terminal: CashAdvanceStatus[] = ["returned", "reconciled"]
  return !terminal.includes(advance.status) && advance.due_date < nowIso
}

// ===========================================================================
// FIN-510 — Per-diem policy/entitlement
// ===========================================================================

export interface PerDiemPolicy {
  policy_id: string
  org_id: string
  name: string
  daily_rate_minor_units: number
  currency: string
  applicable_roles: string[]
  eligible_day_types: ("travel" | "show" | "rehearsal" | "rest")[]
  meal_deduction_minor_units: number
  /** Eligible locations (ISO country codes or city names; empty = all). */
  eligible_locations: string[]
}

export interface PerDiemEntitlement {
  person_id: string
  policy_id: string
  eligible_days: number
  rate_minor_units: number
  currency: string
  total_before_deductions: number
  meal_deductions: number
  net_entitlement: number
}

export function computePerDiemEntitlement(
  person_id: string,
  policy: PerDiemPolicy,
  eligible_days: number,
  meal_count_with_deduction: number,
): PerDiemEntitlement {
  const total_before_deductions = eligible_days * policy.daily_rate_minor_units
  const meal_deductions = meal_count_with_deduction * policy.meal_deduction_minor_units
  return {
    person_id,
    policy_id: policy.policy_id,
    eligible_days,
    rate_minor_units: policy.daily_rate_minor_units,
    currency: policy.currency,
    total_before_deductions,
    meal_deductions,
    net_entitlement: Math.max(0, total_before_deductions - meal_deductions),
  }
}

// ===========================================================================
// FIN-511 — Multi-currency/FX service
// ===========================================================================

export type FxRateSource = "approved_feed" | "manual_override" | "fallback_cached"

export interface AppliedFxRate {
  from_currency: string
  to_currency: string
  rate: number
  rate_source: FxRateSource
  applied_at: string
  /** Immutable once applied — never retroactively changed. */
  is_locked: boolean
}

export function convertMinorUnits(
  amount: number,
  rate: AppliedFxRate,
): number {
  return Math.round(amount * rate.rate)
}

export function lockFxRate(rate: AppliedFxRate): AppliedFxRate {
  return { ...rate, is_locked: true }
}

/** Round half-even (banker's rounding) for financial calculations. */
export function roundHalfEvenFin(value: number, decimalPlaces: number): number {
  const factor = Math.pow(10, decimalPlaces)
  const shifted = value * factor
  const floor = Math.floor(shifted)
  const diff = shifted - floor
  if (Math.abs(diff - 0.5) < Number.EPSILON) {
    // Exactly 0.5 — round to even
    return (floor % 2 === 0 ? floor : floor + 1) / factor
  }
  return Math.round(shifted) / factor
}

export function buildFxSummary(
  amounts: { amount: number; currency: string }[],
  rates: readonly AppliedFxRate[],
  reportingCurrency: string,
): { total_reporting_currency: number; unavailable_currencies: string[] } {
  let total = 0
  const unavailable: string[] = []

  for (const { amount, currency } of amounts) {
    if (currency === reportingCurrency) {
      total += amount
      continue
    }
    const rate = rates.find((r) => r.from_currency === currency && r.to_currency === reportingCurrency)
    if (!rate) {
      unavailable.push(currency)
    } else {
      total += convertMinorUnits(amount, rate)
    }
  }

  return { total_reporting_currency: total, unavailable_currencies: [...new Set(unavailable)] }
}
