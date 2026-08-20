import { describe, expect, it } from "vitest"

import {
  addMoney,
  assertCommerceMoney,
  createMoney,
  createMoneyFromBigInt,
  isCommerceMoney,
  negateMoney,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from "@/lib/admin/commerce/money"

describe("COM-032 canonical Commerce Money", () => {
  it("uses JSON-safe integer minor units and uppercase currency", () => {
    expect(createMoney(1234, "usd")).toEqual({
      amountMinor: 1234,
      currency: "USD",
    })
    expect(isCommerceMoney({ amountMinor: 1234, currency: "USD" })).toBe(true)
    expect(isCommerceMoney({ amountMinor: 1234, currency: "usd" })).toBe(false)
    expect(() => assertCommerceMoney({ amountMinor: 1234, currency: "USD" })).not.toThrow()
  })

  it("rejects decimal and unsafe minor-unit values", () => {
    expect(() => createMoney(12.34, "USD")).toThrow("commerce_money_amount_minor_must_be_safe_integer")
    expect(() => createMoney(Number.MAX_SAFE_INTEGER + 1, "USD"))
      .toThrow("commerce_money_amount_minor_must_be_safe_integer")
    expect(isCommerceMoney({ amountMinor: 12.34, currency: "USD" })).toBe(false)
  })

  it("converts bigint minor units only when JSON safe", () => {
    expect(createMoneyFromBigInt(900n, "eur")).toEqual({
      amountMinor: 900,
      currency: "EUR",
    })
    expect(() => createMoneyFromBigInt(BigInt(Number.MAX_SAFE_INTEGER) + 1n, "USD"))
      .toThrow("commerce_money_amount_minor_exceeds_json_safe_range")
  })

  it("prevents silent mixed-currency arithmetic", () => {
    const usdA = createMoney(500, "USD")
    const usdB = createMoney(125, "usd")
    const eur = createMoney(125, "EUR")

    expect(addMoney(usdA, usdB)).toEqual({ amountMinor: 625, currency: "USD" })
    expect(subtractMoney(usdA, usdB)).toEqual({ amountMinor: 375, currency: "USD" })
    expect(negateMoney(usdB)).toEqual({ amountMinor: -125, currency: "USD" })
    expect(() => addMoney(usdA, eur)).toThrow("commerce_money_currency_mismatch")
    expect(() => sumMoney([usdA, eur])).toThrow("commerce_money_currency_mismatch")
  })

  it("supports explicit zero and empty sums when currency is supplied", () => {
    expect(zeroMoney("gbp")).toEqual({ amountMinor: 0, currency: "GBP" })
    expect(sumMoney([], "USD")).toEqual({ amountMinor: 0, currency: "USD" })
    expect(() => sumMoney([])).toThrow("commerce_money_sum_currency_required")
  })
})
