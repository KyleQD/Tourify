export type CommerceCurrencyCode = string

const ISO_STYLE_CURRENCY_PATTERN = /^[A-Z]{3}$/

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "ISK",
  "JPY",
  "KMF",
  "KRW",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
])

const THREE_DECIMAL_CURRENCIES = new Set([
  "BHD",
  "JOD",
  "KWD",
  "LYD",
  "OMR",
  "TND",
])

const FOUR_DECIMAL_CURRENCIES = new Set(["CLF"])

export function normalizeCommerceCurrency(value: unknown): CommerceCurrencyCode {
  if (typeof value !== "string") throw new Error("commerce_currency_required")
  const currency = value.trim().toUpperCase()
  if (!ISO_STYLE_CURRENCY_PATTERN.test(currency)) throw new Error("commerce_currency_invalid")
  return currency
}

export function isCommerceCurrencyCode(value: unknown): value is CommerceCurrencyCode {
  return typeof value === "string" && ISO_STYLE_CURRENCY_PATTERN.test(value)
}

export function isCanonicalCommerceCurrency(value: unknown): value is CommerceCurrencyCode {
  if (typeof value !== "string") return false
  try {
    return value === normalizeCommerceCurrency(value)
  } catch {
    return false
  }
}

export function assertCommerceCurrency(value: unknown): asserts value is CommerceCurrencyCode {
  normalizeCommerceCurrency(value)
}

export function getCurrencyMinorUnitExponent(currency: unknown): number {
  const normalized = normalizeCommerceCurrency(currency)
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) return 0
  if (THREE_DECIMAL_CURRENCIES.has(normalized)) return 3
  if (FOUR_DECIMAL_CURRENCIES.has(normalized)) return 4
  return 2
}

export function assertSameCommerceCurrency(
  expected: unknown,
  actual: unknown,
): CommerceCurrencyCode {
  const expectedCurrency = normalizeCommerceCurrency(expected)
  const actualCurrency = normalizeCommerceCurrency(actual)
  if (expectedCurrency !== actualCurrency) throw new Error("commerce_currency_mismatch")
  return expectedCurrency
}

export function assertSingleCommerceCurrency(
  currencies: readonly unknown[],
  fallbackCurrency?: unknown,
): CommerceCurrencyCode {
  if (currencies.length === 0) {
    if (fallbackCurrency === undefined) throw new Error("commerce_currency_required")
    return normalizeCommerceCurrency(fallbackCurrency)
  }

  const first = normalizeCommerceCurrency(currencies[0])
  for (const currency of currencies.slice(1)) {
    assertSameCommerceCurrency(first, currency)
  }
  if (fallbackCurrency !== undefined) assertSameCommerceCurrency(first, fallbackCurrency)
  return first
}

export function toProviderCurrency(currency: unknown): string {
  return normalizeCommerceCurrency(currency).toLowerCase()
}
