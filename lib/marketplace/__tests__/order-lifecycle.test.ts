import {
  getCancellationLifecycleTransition,
  getFailedPaymentPatch,
  getPaidLifecycleTransition,
  getRefundPatch,
  isFullStripeChargeRefund,
} from "../order-lifecycle"

describe("marketplace order lifecycle transitions", () => {
  it("skips paid transition when order is already paid", () => {
    const transition = getPaidLifecycleTransition({
      currentPaymentStatus: "paid",
      paymentReference: "pi_123",
    })

    expect(transition.shouldApplyPaidTransition).toBe(false)
    expect(transition.orderPatch).toBeNull()
    expect(transition.payoutPatch).toBeNull()
  })

  it("returns paid transition patches when order is not yet paid", () => {
    const transition = getPaidLifecycleTransition({
      currentPaymentStatus: "processing",
      paymentReference: "pi_123",
    })

    expect(transition.shouldApplyPaidTransition).toBe(true)
    expect(transition.orderPatch).toEqual({
      status: "confirmed",
      payment_status: "paid",
      payment_reference: "pi_123",
    })
    expect(transition.payoutPatch).toEqual({
      payout_status: "scheduled",
      payout_reference: "pi_123",
    })
  })

  it("builds consistent failure and refund patches", () => {
    const failed = getFailedPaymentPatch({ paymentReference: "pi_fail" })
    expect(failed.orderPatch).toEqual({ payment_status: "failed", payment_reference: "pi_fail" })
    expect(failed.payoutPatch).toEqual({ payout_status: "on_hold", payout_reference: "pi_fail" })

    const refunded = getRefundPatch({ paymentReference: "pi_refund" })
    expect(refunded.orderPatch).toEqual({
      status: "refunded",
      payment_status: "refunded",
      payment_reference: "pi_refund",
    })
    expect(refunded.payoutPatch).toEqual({ payout_status: "on_hold", payout_reference: "pi_refund" })
  })

  it("does not revive cancelled or refunded orders from a late paid webhook", () => {
    expect(getPaidLifecycleTransition({
      currentOrderStatus: "cancelled",
      currentPaymentStatus: "failed",
      paymentReference: "pi_late",
    }).shouldApplyPaidTransition).toBe(false)
    expect(getPaidLifecycleTransition({
      currentOrderStatus: "refunded",
      currentPaymentStatus: "refunded",
      paymentReference: "pi_late",
    }).shouldApplyPaidTransition).toBe(false)
  })

  it("allows only unpaid pending orders to be cancelled", () => {
    expect(getCancellationLifecycleTransition({ orderStatus: "pending", paymentStatus: "processing" })).toEqual({
      allowed: true,
      orderPatch: { status: "cancelled", payment_status: "failed" },
      payoutPatch: { payout_status: "on_hold" },
    })
    expect(getCancellationLifecycleTransition({ orderStatus: "confirmed", paymentStatus: "paid" })).toEqual({
      allowed: false,
      reason: "refund_required",
    })
    expect(getCancellationLifecycleTransition({ orderStatus: "fulfilled", paymentStatus: "paid" })).toEqual({
      allowed: false,
      reason: "refund_required",
    })
  })

  it("distinguishes partial refunds from full refunds", () => {
    expect(isFullStripeChargeRefund({ amount: 2500, amountRefunded: 500, refunded: false })).toBe(false)
    expect(isFullStripeChargeRefund({ amount: 2500, amountRefunded: 2500, refunded: false })).toBe(true)
    expect(isFullStripeChargeRefund({ amount: 2500, amountRefunded: 500, refunded: true })).toBe(true)
  })
})
