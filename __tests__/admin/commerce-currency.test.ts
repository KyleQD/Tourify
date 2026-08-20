import { describe, expect, it } from "vitest"

import {
  assertCommerceCurrency,
  assertSameCommerceCurrency,
  assertSingleCommerceCurrency,
  getCurrencyMinorUnitExponent,
  isCanonicalCommerceCurrency,
  isCommerceCurrencyCode,
  normalizeCommerceCurrency,
  toProviderCurrency,
} from "@/lib/admin/commerce/currency"

describe("COM-033 Commerce currency validation", () => {
  it("normalizes ISO-style three-letter currency codes", () => {
    expect(normalizeCommerceCurrency(" usd ")).toBe("USD")
    expect(normalizeCommerceCurrency("eur")).toBe("EUR")
    expect(() => assertCommerceCurrency("GBP")).not.toThrow()
  })

  it("rejects malformed currency codes", () => {
    expect(() => normalizeCommerceCurrency("US")).toThrow("commerce_currency_invalid")
    expect(() => normalizeCommerceCurrency("US1")).toThrow("commerce_currency_invalid")
    expect(() => normalizeCommerceCurrency("")).toThrow("commerce_currency_invalid")
    expect(() => normalizeCommerceCurrency(null)).toThrow("commerce_currency_required")
  })

  it("distinguishes normalizable values from canonical API values", () => {
    expect(isCommerceCurrencyCode("USD")).toBe(true)
    expect(isCommerceCurrencyCode("usd")).toBe(false)
    expect(isCanonicalCommerceCurrency("USD")).toBe(true)
    expect(isCanonicalCommerceCurrency("usd")).toBe(false)
    expect(isCanonicalCommerceCurrency("US")).toBe(false)
  })

  it("exposes currency-specific minor-unit exponents", () => {
    expect(getCurrencyMinorUnitExponent("USD")).toBe(2)
    expect(getCurrencyMinorUnitExponent("JPY")).toBe(0)
    expect(getCurrencyMinorUnitExponent("kwd")).toBe(3)
    expect(getCurrencyMinorUnitExponent("CLF")).toBe(4)
  })

  it("validates same-currency relationships before aggregation", () => {
    expect(assertSameCommerceCurrency("usd", "USD")).toBe("USD")
    expect(assertSingleCommerceCurrency(["usd", "USD"], "USD")).toBe("USD")
    expect(assertSingleCommerceCurrency([], "eur")).toBe("EUR")
    expect(() => assertSameCommerceCurrency("USD", "EUR")).toThrow("commerce_currency_mismatch")
    expect(() => assertSingleCommerceCurrency(["USD", "EUR"])).toThrow("commerce_currency_mismatch")
    expect(() => assertSingleCommerceCurrency([])).toThrow("commerce_currency_required")
  })

  it("adapts canonical currencies to provider casing at provider boundaries", () => {
    expect(toProviderCurrency("USD")).toBe("usd")
  })
})
