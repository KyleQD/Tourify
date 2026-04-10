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
  currentPaymentStatus,
  paymentReference,
}: {
  currentPaymentStatus?: string | null
  paymentReference: string
}): MarketplaceOrderLifecycle {
  if (!paymentReference) return { shouldApplyPaidTransition: false, orderPatch: null, payoutPatch: null }
  if (currentPaymentStatus === "paid") return { shouldApplyPaidTransition: false, orderPatch: null, payoutPatch: null }

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
