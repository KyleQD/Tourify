import { getCurrencyMinorUnitExponent } from "@/lib/admin/commerce/currency"
import { assertCommerceMoney, type Money } from "@/lib/admin/commerce/money"

export interface FormatCommerceMoneyOptions {
  locale?: string
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name"
  signDisplay?: "auto" | "always" | "exceptZero" | "never"
}

export function moneyToDecimalString(money: Money): string {
  assertCommerceMoney(money)
  const exponent = getCurrencyMinorUnitExponent(money.currency)
  const sign = money.amountMinor < 0 ? "-" : ""
  const absoluteMinor = Math.abs(money.amountMinor)

  if (exponent === 0) return `${sign}${absoluteMinor}`

  const scale = 10 ** exponent
  const whole = Math.trunc(absoluteMinor / scale)
  const fraction = String(absoluteMinor % scale).padStart(exponent, "0")
  return `${sign}${whole}.${fraction}`
}

export function moneyToMajorNumber(money: Money): number {
  assertCommerceMoney(money)
  const exponent = getCurrencyMinorUnitExponent(money.currency)
  return money.amountMinor / (10 ** exponent)
}

export function formatCommerceMoney(
  money: Money,
  options: FormatCommerceMoneyOptions = {},
): string {
  assertCommerceMoney(money)
  const exponent = getCurrencyMinorUnitExponent(money.currency)
  return new Intl.NumberFormat(options.locale || "en-US", {
    style: "currency",
    currency: money.currency,
    currencyDisplay: options.currencyDisplay || "symbol",
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
    signDisplay: options.signDisplay || "auto",
  }).format(moneyToMajorNumber(money))
}

export function formatCommerceMoneyCode(money: Money): string {
  return `${money.currency} ${moneyToDecimalString(money)}`
}

export function formatCommerceMoneyOrFallback(
  value: unknown,
  fallback = "Unavailable",
  options?: FormatCommerceMoneyOptions,
): string {
  try {
    assertCommerceMoney(value)
    return formatCommerceMoney(value, options)
  } catch {
    return fallback
  }
}
