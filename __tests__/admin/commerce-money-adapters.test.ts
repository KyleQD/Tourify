import { describe, expect, it } from "vitest"

import {
  createMoneyFromMajorUnits,
  moneyToLegacyDecimalNumber,
  parseLegacyMajorUnitsToMinorUnits,
} from "@/lib/admin/commerce/money-adapters"

describe("COM-035 legacy money adapters", () => {
  it("converts legacy major-unit decimals to canonical minor units", () => {
    expect(createMoneyFromMajorUnits("12.34", "usd")).toEqual({
      amountMinor: 1234,
      currency: "USD",
    })
    expect(createMoneyFromMajorUnits(12.3, "USD")).toEqual({
      amountMinor: 1230,
      currency: "USD",
    })
    expect(parseLegacyMajorUnitsToMinorUnits("-0.01", "USD")).toBe(-1n)
  })

  it("uses currency-specific precision", () => {
    expect(createMoneyFromMajorUnits("100", "JPY")).toEqual({
      amountMinor: 100,
      currency: "JPY",
    })
    expect(createMoneyFromMajorUnits("1.234", "KWD")).toEqual({
      amountMinor: 1234,
      currency: "KWD",
    })
  })

  it("rejects inputs that would silently round legacy money", () => {
    expect(() => createMoneyFromMajorUnits("1.234", "USD"))
      .toThrow("commerce_money_legacy_major_units_exceeds_currency_precision")
    expect(() => createMoneyFromMajorUnits(Number.POSITIVE_INFINITY, "USD"))
      .toThrow("commerce_money_legacy_major_units_invalid")
    expect(() => createMoneyFromMajorUnits("1e3", "USD"))
      .toThrow("commerce_money_legacy_major_units_invalid")
  })

  it("converts canonical Money back to legacy decimal numbers only at the boundary", () => {
    expect(moneyToLegacyDecimalNumber({ amountMinor: 1234, currency: "USD" })).toBe(12.34)
    expect(moneyToLegacyDecimalNumber({ amountMinor: 1234, currency: "KWD" })).toBe(1.234)
  })
})
