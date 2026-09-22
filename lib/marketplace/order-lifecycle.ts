export interface MarketplaceOrderLifecycle {
  shouldApplyPaidTransition: boolean
  orderPatch: {
    status: "confirmed"
    payment_status: "paid"
    payment_reference: string
  } | null
  payoutPatch: {
    payout_status: "scheduled"
    payout_reference: string
  } | null
}

export function getPaidLifecycleTransition({
  currentOrderStatus,
  currentPaymentStatus,
  paymentReference,
}: {
  currentOrderStatus?: string | null
  currentPaymentStatus?: string | null
  paymentReference: string
}): MarketplaceOrderLifecycle {
  if (!paymentReference) return { shouldApplyPaidTransition: false, orderPatch: null, payoutPatch: null }
  if (currentPaymentStatus === "paid") return { shouldApplyPaidTransition: false, orderPatch: null, payoutPatch: null }
  if (currentOrderStatus === "cancelled" || currentOrderStatus === "refunded") {
    return { shouldApplyPaidTransition: false, orderPatch: null, payoutPatch: null }
  }

  return {
    shouldApplyPaidTransition: true,
    orderPatch: {
      status: "confirmed",
      payment_status: "paid",
      payment_reference: paymentReference,
    },
    payoutPatch: {
      payout_status: "scheduled",
      payout_reference: paymentReference,
    },
  }
}

export type MarketplaceCancellationTransition =
  | {
      allowed: true
      orderPatch: { status: "cancelled"; payment_status: "failed" }
      payoutPatch: { payout_status: "on_hold" }
    }
  | {
      allowed: false
      reason: "already_cancelled" | "refund_required" | "terminal_order"
    }

export function getCancellationLifecycleTransition({
  orderStatus,
  paymentStatus,
}: {
  orderStatus: string
  paymentStatus: string
}): MarketplaceCancellationTransition {
  if (orderStatus === "cancelled") return { allowed: false, reason: "already_cancelled" }
  if (paymentStatus === "paid" || orderStatus === "confirmed") {
    return { allowed: false, reason: "refund_required" }
  }
  if (orderStatus !== "pending" || paymentStatus === "refunded") {
    return { allowed: false, reason: "terminal_order" }
  }
  return {
    allowed: true,
    orderPatch: { status: "cancelled", payment_status: "failed" },
    payoutPatch: { payout_status: "on_hold" },
  }
}

export function isFullStripeChargeRefund({
  amount,
  amountRefunded,
  refunded,
}: {
  amount?: number | null
  amountRefunded?: number | null
  refunded?: boolean | null
}): boolean {
  if (refunded === true) return true
  return Number(amount) > 0 && Number(amountRefunded) >= Number(amount)
}

export function getFailedPaymentPatch({ paymentReference }: { paymentReference: string }) {
  return {
    orderPatch: { payment_status: "failed" as const, payment_reference: paymentReference },
    payoutPatch: { payout_status: "on_hold" as const, payout_reference: paymentReference },
  }
}

export function getRefundPatch({ paymentReference }: { paymentReference: string }) {
  return {
    orderPatch: {
      status: "refunded" as const,
      payment_status: "refunded" as const,
      payment_reference: paymentReference,
    },
    payoutPatch: { payout_status: "on_hold" as const, payout_reference: paymentReference },
  }
}
