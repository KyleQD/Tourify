import {
  hashMarketplaceCheckoutInput,
  resolveCheckoutAttempt,
} from "../checkout-idempotency"

describe("marketplace checkout idempotency", () => {
  const payload = {
    lines: [{ listingId: "listing-1", quantity: 1 }],
    guestEmail: null,
    buyerUserId: "buyer-1",
  }

  it("produces a stable hash for the same money-relevant input", () => {
    expect(hashMarketplaceCheckoutInput(payload)).toBe(hashMarketplaceCheckoutInput({ ...payload }))
  })

  it("resumes a pending attempt only when its payload hash matches", () => {
    const inputHash = hashMarketplaceCheckoutInput(payload)
    expect(resolveCheckoutAttempt({
      input_hash: inputHash,
      order_id: "order-1",
      status: "pending",
    }, inputHash)).toEqual({ action: "resume", orderId: "order-1" })

    expect(resolveCheckoutAttempt({
      input_hash: inputHash,
      order_id: "order-1",
      status: "pending",
    }, hashMarketplaceCheckoutInput({ ...payload, buyerUserId: "buyer-2" }))).toEqual({
      action: "conflict",
      reason: "payload_mismatch",
    })
  })

  it("never reuses completed, failed, expired, or unclaimed pending attempts", () => {
    const inputHash = hashMarketplaceCheckoutInput(payload)
    expect(resolveCheckoutAttempt({ input_hash: inputHash, order_id: "order-1", status: "completed" }, inputHash))
      .toEqual({ action: "conflict", reason: "already_completed" })
    expect(resolveCheckoutAttempt({ input_hash: inputHash, order_id: "order-1", status: "failed" }, inputHash))
      .toEqual({ action: "conflict", reason: "key_not_reusable" })
    expect(resolveCheckoutAttempt({ input_hash: inputHash, order_id: null, status: "expired" }, inputHash))
      .toEqual({ action: "conflict", reason: "key_not_reusable" })
    expect(resolveCheckoutAttempt({ input_hash: inputHash, order_id: null, status: "pending" }, inputHash))
      .toEqual({ action: "conflict", reason: "in_progress" })
  })
})
