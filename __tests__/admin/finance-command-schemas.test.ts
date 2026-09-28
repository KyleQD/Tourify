import { describe, expect, it } from "vitest"

import {
  assertPaymentStatusTransition,
  assertSettlementStatusTransition,
  canTransitionPaymentStatus,
  FINANCE_COMMAND_CAPABILITIES,
  FinanceStatusTransitionError,
  parseFinanceCommand,
} from "@/lib/admin/finance-command-schemas"

const TX_ID = "11111111-1111-4111-8111-111111111111"
const EVENT_ID = "22222222-2222-4222-8222-222222222222"

describe("FIN-103 finance command schemas", () => {
  it("rejects unknown fields on create_transaction", () => {
    const result = parseFinanceCommand({
      action: "create_transaction",
      type: "expense",
      category: "production",
      amount: 100,
      surprise: true,
    })
    expect(result.ok).toBe(false)
  })

  it("rejects category/type mismatches and negative money", () => {
    expect(
      parseFinanceCommand({
        action: "create_transaction",
        type: "income",
        category: "production",
        amount: 50,
      }).ok,
    ).toBe(false)

    expect(
      parseFinanceCommand({
        action: "create_transaction",
        type: "expense",
        category: "production",
        amount: -1,
      }).ok,
    ).toBe(false)
  })

  it("requires reason for payment transition and delete", () => {
    expect(
      parseFinanceCommand({
        action: "transition_payment_status",
        id: TX_ID,
        expected_updated_at: "2026-07-20T00:00:00.000Z",
        payment_status: "paid",
      }).ok,
    ).toBe(false)

    expect(
      parseFinanceCommand({
        action: "delete_transaction",
        id: TX_ID,
      }).ok,
    ).toBe(false)

    const transition = parseFinanceCommand({
      action: "transition_payment_status",
      id: TX_ID,
      expected_updated_at: "2026-07-20T00:00:00.000Z",
      payment_status: "paid",
      reason: "invoice cleared",
    })
    expect(transition.ok).toBe(true)

    const del = parseFinanceCommand({
      action: "delete_transaction",
      id: TX_ID,
      reason: "duplicate entry",
    })
    expect(del.ok).toBe(true)
  })

  it("requires expected_updated_at on transaction/budget updates", () => {
    expect(
      parseFinanceCommand({
        action: "update_transaction",
        id: TX_ID,
        amount: 20,
      }).ok,
    ).toBe(false)

    const ok = parseFinanceCommand({
      action: "update_transaction",
      id: TX_ID,
      expected_updated_at: "2026-07-20T00:00:00.000Z",
      amount: 20,
    })
    expect(ok.ok).toBe(true)
  })

  it("enforces payment and settlement transition graphs", () => {
    expect(canTransitionPaymentStatus("pending", "paid")).toBe(true)
    expect(canTransitionPaymentStatus("paid", "pending")).toBe(false)
    expect(() => assertPaymentStatusTransition("cancelled", "paid")).toThrow(
      FinanceStatusTransitionError,
    )

    expect(() => assertSettlementStatusTransition("draft", "paid")).toThrow(
      FinanceStatusTransitionError,
    )
    expect(() => assertSettlementStatusTransition("draft", "finalized")).not.toThrow()
  })

  it("accepts settlement create with event scope and maps capabilities", () => {
    const create = parseFinanceCommand({
      action: "create_settlement",
      event_id: EVENT_ID,
      artist_payout: 1000,
    })
    expect(create.ok).toBe(true)

    expect(FINANCE_COMMAND_CAPABILITIES.create_transaction).toBe("finance.manage")
    expect(FINANCE_COMMAND_CAPABILITIES.transition_settlement_status).toBe("finance.manage")
  })
})
