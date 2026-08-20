import { describe, expect, it } from "vitest"

import {
  calculateCommercePercentageShare,
  calculateCommerceSettlementNet,
  calculateCommerceSettlementShares,
} from "@/lib/admin/commerce/settlement-calculations"
import { createMoney } from "@/lib/admin/commerce/money"

describe("COM-035 commerce settlement calculations", () => {
  it("allocates shares in integer minor units without exceeding net revenue", () => {
    const shares = calculateCommerceSettlementShares({
      netRevenue: createMoney(100000, "USD"),
      allocations: [
        { beneficiaryType: "venue", shareType: "percentage", shareValue: 20, priority: 1 },
        { beneficiaryType: "artist", shareType: "flat", shareValue: 100, priority: 2 },
        { beneficiaryType: "organization", shareType: "remainder", shareValue: 0, priority: 99 },
      ],
    })

    expect(shares.map(share => [share.beneficiaryType, share.amount.amountMinor])).toEqual([
      ["venue", 20000],
      ["artist", 10000],
      ["organization", 70000],
    ])
  })

  it("rounds percentage shares at minor-unit precision", () => {
    expect(calculateCommercePercentageShare(createMoney(100, "USD"), 33.333).amountMinor).toBe(33)
    expect(calculateCommercePercentageShare(createMoney(101, "USD"), 50).amountMinor).toBe(51)
  })

  it("clamps settlement net to zero after refunds and fees", () => {
    expect(calculateCommerceSettlementNet({
      gross: createMoney(1000, "USD"),
      refunds: createMoney(700, "USD"),
      fees: createMoney(400, "USD"),
    })).toEqual({ amountMinor: 0, currency: "USD" })
  })

  it("rejects mixed-currency settlement net calculations", () => {
    expect(() => calculateCommerceSettlementNet({
      gross: createMoney(1000, "USD"),
      refunds: createMoney(100, "EUR"),
      fees: createMoney(100, "USD"),
    })).toThrow("commerce_money_currency_mismatch")
  })
})
