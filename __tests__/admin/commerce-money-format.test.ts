import { describe, expect, it } from "vitest"

import {
  formatCommerceMoney,
  formatCommerceMoneyCode,
  formatCommerceMoneyOrFallback,
  moneyToDecimalString,
  moneyToMajorNumber,
} from "@/lib/admin/commerce/money-format"
import { createMoney } from "@/lib/admin/commerce/money"

describe("COM-034 safe Commerce money formatting", () => {
  it("converts minor units to exact decimal strings by currency exponent", () => {
    expect(moneyToDecimalString(createMoney(1234, "USD"))).toBe("12.34")
    expect(moneyToDecimalString(createMoney(-1234, "USD"))).toBe("-12.34")
    expect(moneyToDecimalString(createMoney(1234, "JPY"))).toBe("1234")
    expect(moneyToDecimalString(createMoney(1234, "KWD"))).toBe("1.234")
    expect(moneyToDecimalString(createMoney(1234, "CLF"))).toBe("0.1234")
  })

  it("formats canonical Money values with Intl currency formatting", () => {
    expect(formatCommerceMoney(createMoney(1234, "USD"), { locale: "en-US" })).toBe("$12.34")
    expect(formatCommerceMoney(createMoney(1234, "JPY"), {
      locale: "en-US",
      currencyDisplay: "code",
    })).toMatch(/^JPY\s+1,234$/)
    expect(formatCommerceMoney(createMoney(1234, "USD"), {
      locale: "en-US",
      currencyDisplay: "code",
    })).toMatch(/^USD\s+12\.34$/)
  })

  it("offers code-prefixed deterministic formatting for logs and plain text", () => {
    expect(formatCommerceMoneyCode(createMoney(1234, "usd"))).toBe("USD 12.34")
  })

  it("returns a fallback for invalid money shapes", () => {
    expect(formatCommerceMoneyOrFallback({ amountMinor: 12.34, currency: "USD" })).toBe("Unavailable")
    expect(formatCommerceMoneyOrFallback(null, "--")).toBe("--")
  })

  it("exposes major-unit numbers only as a display adapter", () => {
    expect(moneyToMajorNumber(createMoney(1234, "USD"))).toBe(12.34)
    expect(moneyToMajorNumber(createMoney(1234, "JPY"))).toBe(1234)
  })
})
