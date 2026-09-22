/**
 * FIN-103 — Per-action Zod schemas for admin finance commands.
 * Unknown fields rejected (.strict). Reason required for delete/status money moves.
 */

import { z } from "zod"

const uuid = z.string().uuid()
const reason = z.string().trim().min(3).max(1_000)
const money = z.number().finite().nonnegative().max(1_000_000_000)
const optionalUuid = uuid.optional().nullable()
const expectedUpdatedAt = z.string().min(1).max(64)

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const SETTLEMENT_STATUSES = ["draft", "finalized", "paid"] as const
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number]

export const TRANSACTION_CATEGORIES = [
  "ticket_revenue",
  "merchandise",
  "sponsorship",
  "appearance_fee",
  "other_income",
  "venue_rental",
  "equipment",
  "catering",
  "staff_pay",
  "marketing",
  "travel",
  "insurance",
  "permits",
  "production",
  "other_expense",
] as const

const INCOME_CATEGORIES = new Set([
  "ticket_revenue",
  "merchandise",
  "sponsorship",
  "appearance_fee",
  "other_income",
])

export function categoryMatchesType(type: "income" | "expense", category: string): boolean {
  return type === "income" ? INCOME_CATEGORIES.has(category) : !INCOME_CATEGORIES.has(category)
}

/** Payment status transition graph. Same-status is idempotent. */
export const PAYMENT_STATUS_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  pending: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: ["refunded"],
  cancelled: [],
  refunded: [],
}

export const SETTLEMENT_STATUS_TRANSITIONS: Record<SettlementStatus, readonly SettlementStatus[]> = {
  draft: ["finalized"],
  finalized: ["paid"],
  paid: [],
}

export function canTransitionPaymentStatus(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = PAYMENT_STATUS_TRANSITIONS[from as PaymentStatus]
  if (!allowed) return false
  return allowed.includes(to as PaymentStatus)
}

export function canTransitionSettlementStatus(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = SETTLEMENT_STATUS_TRANSITIONS[from as SettlementStatus]
  if (!allowed) return false
  return allowed.includes(to as SettlementStatus)
}

export class FinanceStatusTransitionError extends Error {
  readonly status = 422
  readonly code = "illegal_finance_status_transition"

  constructor(kind: string, from: string, to: string) {
    super(`Illegal ${kind} status transition: ${from} → ${to}`)
    this.name = "FinanceStatusTransitionError"
  }
}

export function assertPaymentStatusTransition(from: string, to: string): void {
  if (!canTransitionPaymentStatus(from, to))
    throw new FinanceStatusTransitionError("payment", from, to)
}

export function assertSettlementStatusTransition(from: string, to: string): void {
  if (!canTransitionSettlementStatus(from, to))
    throw new FinanceStatusTransitionError("settlement", from, to)
}

export const createTransactionCommandSchema = z
  .object({
    action: z.literal("create_transaction"),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    type: z.enum(["income", "expense"]),
    category: z.enum(TRANSACTION_CATEGORIES),
    amount: money,
    description: z.string().trim().max(2_000).optional().nullable(),
    vendor_name: z.string().trim().max(240).optional().nullable(),
    receipt_url: z.string().url().max(2_048).optional().nullable(),
    payment_status: z.enum(PAYMENT_STATUSES).optional().default("pending"),
    payment_method: z.string().trim().max(120).optional().nullable(),
    payment_reference: z.string().trim().max(240).optional().nullable(),
    due_date: z.string().max(64).optional().nullable(),
    reason: reason.optional(),
  })
  .strict()
  .refine((v) => categoryMatchesType(v.type, v.category), {
    message: "Transaction category does not match its type",
    path: ["category"],
  })

export const updateTransactionCommandSchema = z
  .object({
    action: z.literal("update_transaction"),
    id: uuid,
    expected_updated_at: expectedUpdatedAt,
    event_id: optionalUuid,
    tour_id: optionalUuid,
    type: z.enum(["income", "expense"]).optional(),
    category: z.enum(TRANSACTION_CATEGORIES).optional(),
    amount: money.optional(),
    description: z.string().trim().max(2_000).optional().nullable(),
    vendor_name: z.string().trim().max(240).optional().nullable(),
    receipt_url: z.string().url().max(2_048).optional().nullable(),
    payment_method: z.string().trim().max(120).optional().nullable(),
    payment_reference: z.string().trim().max(240).optional().nullable(),
    due_date: z.string().max(64).optional().nullable(),
    reason: reason.optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["action", "id", "expected_updated_at", "reason"].includes(k)),
    "At least one update field is required",
  )

export const transitionPaymentStatusCommandSchema = z
  .object({
    action: z.literal("transition_payment_status"),
    id: uuid,
    expected_updated_at: expectedUpdatedAt,
    payment_status: z.enum(PAYMENT_STATUSES),
    reason,
  })
  .strict()

export const deleteTransactionCommandSchema = z
  .object({
    action: z.literal("delete_transaction"),
    id: uuid,
    reason,
  })
  .strict()

export const createBudgetCommandSchema = z
  .object({
    action: z.literal("create_budget"),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    category: z.string().trim().min(1).max(120),
    allocated_amount: money,
    notes: z.string().trim().max(2_000).optional().nullable(),
    reason: reason.optional(),
  })
  .strict()
  .refine((v) => Boolean(v.event_id || v.tour_id), {
    message: "Budget must be tied to an event or tour",
    path: ["event_id"],
  })

export const updateBudgetCommandSchema = z
  .object({
    action: z.literal("update_budget"),
    id: uuid,
    expected_updated_at: expectedUpdatedAt,
    event_id: optionalUuid,
    tour_id: optionalUuid,
    category: z.string().trim().min(1).max(120).optional(),
    allocated_amount: money.optional(),
    spent_amount: money.optional(),
    notes: z.string().trim().max(2_000).optional().nullable(),
    reason: reason.optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["action", "id", "expected_updated_at", "reason"].includes(k)),
    "At least one update field is required",
  )

export const createSettlementCommandSchema = z
  .object({
    action: z.literal("create_settlement"),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    total_gross_revenue: money.optional().default(0),
    total_expenses: money.optional().default(0),
    artist_payout: money.optional().default(0),
    venue_payout: money.optional().default(0),
    promoter_payout: money.optional().default(0),
    deal_type: z.enum(["guarantee", "vs_door", "percentage"]).optional().nullable(),
    guarantee_amount: money.optional().nullable(),
    door_percentage: z.number().finite().min(0).max(100).optional().nullable(),
    notes: z.string().trim().max(4_000).optional().nullable(),
    reason: reason.optional(),
  })
  .strict()
  .refine((v) => Boolean(v.event_id || v.tour_id), {
    message: "Settlement must be linked to an event or tour",
    path: ["event_id"],
  })

export const updateSettlementCommandSchema = z
  .object({
    action: z.literal("update_settlement"),
    id: uuid,
    expected_updated_at: expectedUpdatedAt.optional(),
    expected_status: z.enum(SETTLEMENT_STATUSES).optional(),
    event_id: optionalUuid,
    tour_id: optionalUuid,
    total_gross_revenue: money.optional(),
    total_expenses: money.optional(),
    artist_payout: money.optional(),
    venue_payout: money.optional(),
    promoter_payout: money.optional(),
    deal_type: z.enum(["guarantee", "vs_door", "percentage"]).optional().nullable(),
    guarantee_amount: money.optional().nullable(),
    door_percentage: z.number().finite().min(0).max(100).optional().nullable(),
    notes: z.string().trim().max(4_000).optional().nullable(),
    reason: reason.optional(),
  })
  .strict()
  .refine(
    (v) => Object.keys(v).some((k) => !["action", "id", "expected_updated_at", "expected_status", "reason"].includes(k)),
    "At least one update field is required",
  )

export const transitionSettlementStatusCommandSchema = z
  .object({
    action: z.literal("transition_settlement_status"),
    id: uuid,
    expected_status: z.enum(SETTLEMENT_STATUSES),
    status: z.enum(SETTLEMENT_STATUSES),
    reason,
  })
  .strict()

/** FIN-105 — Create offsetting posted-line reversal (does not mutate original). */
export const createReversalCommandSchema = z
  .object({
    action: z.literal("create_reversal"),
    transaction_id: uuid,
    expected_updated_at: expectedUpdatedAt,
    reason,
  })
  .strict()

/** FIN-105 — Create linked adjustment line against a posted transaction. */
export const createAdjustmentCommandSchema = z
  .object({
    action: z.literal("create_adjustment"),
    transaction_id: uuid,
    expected_updated_at: expectedUpdatedAt,
    type: z.enum(["income", "expense"]),
    category: z.enum(TRANSACTION_CATEGORIES),
    amount: money,
    description: z.string().trim().max(2_000).optional().nullable(),
    reason,
  })
  .strict()
  .refine((v) => categoryMatchesType(v.type, v.category), {
    message: "Adjustment category does not match its type",
    path: ["category"],
  })

/** FIN-105 — New draft settlement that adjusts a paid/finalized settlement (no overwrite). */
export const createSettlementAdjustmentCommandSchema = z
  .object({
    action: z.literal("create_settlement_adjustment"),
    settlement_id: uuid,
    expected_status: z.enum(SETTLEMENT_STATUSES),
    total_gross_revenue: money.optional(),
    total_expenses: money.optional(),
    artist_payout: money.optional(),
    venue_payout: money.optional(),
    promoter_payout: money.optional(),
    notes: z.string().trim().max(4_000).optional().nullable(),
    reason,
  })
  .strict()

export const financeCommandSchema = z.union([
  createTransactionCommandSchema,
  updateTransactionCommandSchema,
  transitionPaymentStatusCommandSchema,
  deleteTransactionCommandSchema,
  createBudgetCommandSchema,
  updateBudgetCommandSchema,
  createSettlementCommandSchema,
  updateSettlementCommandSchema,
  transitionSettlementStatusCommandSchema,
  createReversalCommandSchema,
  createAdjustmentCommandSchema,
  createSettlementAdjustmentCommandSchema,
])

export type FinanceCommand = z.infer<typeof financeCommandSchema>
export type FinanceCommandAction = FinanceCommand["action"]

export const FINANCE_COMMAND_CAPABILITIES: Record<
  FinanceCommandAction,
  "finance.manage" | "finance.pay" | "finance.approve"
> = {
  create_transaction: "finance.manage",
  update_transaction: "finance.manage",
  transition_payment_status: "finance.manage",
  delete_transaction: "finance.manage",
  create_budget: "finance.manage",
  update_budget: "finance.manage",
  create_settlement: "finance.manage",
  update_settlement: "finance.manage",
  transition_settlement_status: "finance.manage",
  create_reversal: "finance.manage",
  create_adjustment: "finance.manage",
  create_settlement_adjustment: "finance.manage",
}

export function parseFinanceCommand(body: unknown): {
  ok: true
  data: FinanceCommand
} | {
  ok: false
  error: string
  details?: unknown
} {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { ok: false, error: "Request body must be an object" }

  const parsed = financeCommandSchema.safeParse(body)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation error — unknown fields or invalid values rejected",
      details: parsed.error.issues,
    }
  }
  return { ok: true, data: parsed.data }
}
