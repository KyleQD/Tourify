import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { canMarkCheckoutCompleted, interpretPaymentVerifyResponse } from "./checkout-status"

describe("interpretPaymentVerifyResponse", () => {
  it("marks success and purchase as completed", () => {
    assert.equal(interpretPaymentVerifyResponse({ success: true }).status, "completed")
    assert.equal(interpretPaymentVerifyResponse({ purchase: { id: "1" } }).status, "completed")
  })

  it("keeps unpaid sessions pending", () => {
    assert.equal(interpretPaymentVerifyResponse({ success: false }).status, "pending")
    assert.equal(interpretPaymentVerifyResponse({ payment_status: "pending" }).status, "pending")
    assert.equal(
      interpretPaymentVerifyResponse({ error: "Payment not completed" }).status,
      "pending"
    )
  })

  it("fails on hard errors", () => {
    const result = interpretPaymentVerifyResponse({ error: "Session not found" })
    assert.equal(result.status, "failed")
    assert.equal(result.message, "Session not found")
  })
})

describe("canMarkCheckoutCompleted", () => {
  it("allows free tickets without checkout URL", () => {
    assert.equal(
      canMarkCheckoutCompleted({
        isFree: true,
        hasCheckoutUrl: false,
        verificationStatus: "pending",
      }),
      true
    )
  })

  it("requires verified payment when checkout URL exists", () => {
    assert.equal(
      canMarkCheckoutCompleted({
        isFree: false,
        hasCheckoutUrl: true,
        verificationStatus: "pending",
      }),
      false
    )
    assert.equal(
      canMarkCheckoutCompleted({
        isFree: false,
        hasCheckoutUrl: true,
        verificationStatus: "completed",
      }),
      true
    )
  })
})
