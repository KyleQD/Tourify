export type CheckoutVerificationStatus = "completed" | "pending" | "failed"

export function interpretPaymentVerifyResponse(payload: {
  success?: boolean
  purchase?: unknown
  payment_status?: string
  error?: string
}): { status: CheckoutVerificationStatus; message?: string } {
  if (payload.success === true || payload.purchase) return { status: "completed" }
  if (payload.payment_status === "pending") return { status: "pending" }
  if (payload.success === false) return { status: "pending" }
  if (payload.error) {
    if (/not completed|pending/i.test(payload.error)) return { status: "pending" }
    return { status: "failed", message: payload.error }
  }
  return { status: "failed", message: "Unable to verify payment" }
}

export function canMarkCheckoutCompleted(params: {
  isFree: boolean
  hasCheckoutUrl: boolean
  verificationStatus: CheckoutVerificationStatus
}): boolean {
  if (params.isFree && !params.hasCheckoutUrl) return true
  return params.verificationStatus === "completed"
}
