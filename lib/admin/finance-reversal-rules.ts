/**
 * FIN-105 — Posted/settled immutability + reversal/adjustment predicates.
 */

export const POSTED_PAYMENT_STATUSES = ["paid", "refunded"] as const

export function isPostedPaymentStatus(status: string | null | undefined): boolean {
  return status === "paid" || status === "refunded"
}

export function isSettledSettlementStatus(status: string | null | undefined): boolean {
  return status === "finalized" || status === "paid"
}

export function canMutateFinanceTransaction(args: {
  paymentStatus: string
  action: "update" | "delete"
}): { ok: true } | { ok: false; code: string; message: string } {
  if (isPostedPaymentStatus(args.paymentStatus)) {
    return {
      ok: false,
      code: "immutable_record",
      message:
        args.action === "delete"
          ? "Posted (paid/refunded) transactions cannot be deleted — create a reversal or adjustment."
          : "Posted (paid/refunded) transactions cannot be overwritten — create a reversal or adjustment.",
    }
  }
  return { ok: true }
}

export function canCreateReversalForTransaction(args: {
  paymentStatus: string
  alreadyReversed: boolean
}): { ok: true } | { ok: false; code: string; message: string } {
  if (!isPostedPaymentStatus(args.paymentStatus)) {
    return {
      ok: false,
      code: "not_posted",
      message: "Only paid/refunded (posted) transactions can be reversed.",
    }
  }
  if (args.alreadyReversed) {
    return {
      ok: false,
      code: "already_reversed",
      message: "This transaction already has a linked reversal.",
    }
  }
  return { ok: true }
}

export function canCreateAdjustmentForTransaction(args: {
  paymentStatus: string
}): { ok: true } | { ok: false; code: string; message: string } {
  if (!isPostedPaymentStatus(args.paymentStatus)) {
    return {
      ok: false,
      code: "not_posted",
      message: "Only paid/refunded (posted) transactions can receive adjustments.",
    }
  }
  return { ok: true }
}

export function buildReversalLine(args: {
  original: {
    type: "income" | "expense"
    category: string
    amount: number
    event_id?: string | null
    tour_id?: string | null
    description?: string | null
  }
  reason: string
}): {
  type: "income" | "expense"
  category: "other_income" | "other_expense"
  amount: number
  description: string
  payment_status: "paid"
} {
  const type = args.original.type === "income" ? "expense" : "income"
  return {
    type,
    category: type === "income" ? "other_income" : "other_expense",
    amount: Number(args.original.amount) || 0,
    description: `Reversal of ${args.original.category}: ${args.reason}`.slice(0, 2_000),
    payment_status: "paid",
  }
}
