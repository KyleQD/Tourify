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
      reason: "already_cancelled" | "refund_required" | "terminal_order" | "buyer_required"
    }

export function getCancellationLifecycleTransition({
  orderStatus,
  paymentStatus,
  actorRole,
}: {
  orderStatus: string
  paymentStatus: string
  actorRole?: "buyer" | "seller" | "admin" | "unknown"
}): MarketplaceCancellationTransition {
  if (actorRole && actorRole !== "buyer" && actorRole !== "admin") {
    return { allowed: false, reason: "buyer_required" }
  }
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

export type MarketplaceRefundTransition =
  | {
      allowed: true
      payoutPatch: { payout_status: "on_hold" }
    }
  | {
      allowed: false
      reason: "seller_required" | "already_refunded" | "order_not_refundable"
    }

export function getRefundLifecycleTransition({
  orderStatus,
  paymentStatus,
  paymentReference,
  actorRole,
}: {
  orderStatus: string
  paymentStatus: string
  paymentReference?: string | null
  actorRole?: "buyer" | "seller" | "admin" | "unknown"
}): MarketplaceRefundTransition {
  if (actorRole && actorRole !== "seller" && actorRole !== "admin") {
    return { allowed: false, reason: "seller_required" }
  }
  if (orderStatus === "refunded" || paymentStatus === "refunded") {
    return { allowed: false, reason: "already_refunded" }
  }
  if (paymentStatus !== "paid" || !paymentReference) {
    return { allowed: false, reason: "order_not_refundable" }
  }
  return {
    allowed: true,
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
