interface FormatNumberOptions {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}

interface FormatCurrencyOptions extends FormatNumberOptions {
  currency?: string
}

function toNumber(value: unknown) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : 0

  if (Number.isNaN(numericValue)) return 0
  return numericValue
}

export function formatSafeNumber(value: unknown, options?: FormatNumberOptions) {
  const parsedValue = toNumber(value)
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(parsedValue)
}

export function formatSafeCurrency(value: unknown, options?: FormatCurrencyOptions) {
  const parsedValue = toNumber(value)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options?.currency ?? "USD",
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(parsedValue)
}
