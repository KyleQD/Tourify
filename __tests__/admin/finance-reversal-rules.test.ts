import { describe, expect, it } from "vitest"

import { parseFinanceCommand } from "@/lib/admin/finance-command-schemas"
import {
  buildReversalLine,
  canCreateAdjustmentForTransaction,
  canCreateReversalForTransaction,
  canMutateFinanceTransaction,
  isPostedPaymentStatus,
  isSettledSettlementStatus,
} from "@/lib/admin/finance-reversal-rules"

const TX_ID = "11111111-1111-4111-8111-111111111111"

describe("FIN-105 finance reversal rules", () => {
  it("treats paid/refunded as posted and finalized/paid as settled", () => {
    expect(isPostedPaymentStatus("paid")).toBe(true)
    expect(isPostedPaymentStatus("refunded")).toBe(true)
    expect(isPostedPaymentStatus("pending")).toBe(false)
    expect(isSettledSettlementStatus("finalized")).toBe(true)
    expect(isSettledSettlementStatus("draft")).toBe(false)
  })

  it("blocks delete/overwrite of posted transactions", () => {
    expect(canMutateFinanceTransaction({ paymentStatus: "paid", action: "delete" }).ok).toBe(false)
    expect(canMutateFinanceTransaction({ paymentStatus: "pending", action: "update" }).ok).toBe(true)
  })

  it("allows a single reversal only for posted lines", () => {
    expect(
      canCreateReversalForTransaction({ paymentStatus: "pending", alreadyReversed: false }).ok,
    ).toBe(false)
    expect(
      canCreateReversalForTransaction({ paymentStatus: "paid", alreadyReversed: false }).ok,
    ).toBe(true)
    expect(
      canCreateReversalForTransaction({ paymentStatus: "paid", alreadyReversed: true }).ok,
    ).toBe(false)
    expect(canCreateAdjustmentForTransaction({ paymentStatus: "paid" }).ok).toBe(true)
  })

  it("builds an opposite posted reversal line with before/after category context", () => {
    const line = buildReversalLine({
      original: { type: "income", category: "ticket_revenue", amount: 250 },
      reason: "box office correction",
    })
    expect(line.type).toBe("expense")
    expect(line.category).toBe("other_expense")
    expect(line.amount).toBe(250)
    expect(line.payment_status).toBe("paid")
    expect(line.description).toContain("ticket_revenue")
    expect(line.description).toContain("box office correction")
  })

  it("requires reason and expected version on reversal/adjustment commands", () => {
    expect(
      parseFinanceCommand({
        action: "create_reversal",
        transaction_id: TX_ID,
        expected_updated_at: "2026-07-20T00:00:00.000Z",
      }).ok,
    ).toBe(false)

    const reversal = parseFinanceCommand({
      action: "create_reversal",
      transaction_id: TX_ID,
      expected_updated_at: "2026-07-20T00:00:00.000Z",
      reason: "duplicate posting",
    })
    expect(reversal.ok).toBe(true)

    const adjustment = parseFinanceCommand({
      action: "create_adjustment",
      transaction_id: TX_ID,
      expected_updated_at: "2026-07-20T00:00:00.000Z",
      type: "expense",
      category: "production",
      amount: 40,
      reason: "vendor invoice true-up",
    })
    expect(adjustment.ok).toBe(true)
  })
})
