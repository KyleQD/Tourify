import { getCurrencyMinorUnitExponent } from "@/lib/admin/commerce/currency"
import { createMoneyFromBigInt, type Money } from "@/lib/admin/commerce/money"
import { moneyToDecimalString } from "@/lib/admin/commerce/money-format"

export type LegacyMajorUnitInput = string | number | bigint

const LEGACY_DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/

function decimalScale(exponent: number): bigint {
  return 10n ** BigInt(exponent)
}

function normalizeLegacyMajorUnitInput(value: LegacyMajorUnitInput): string {
  if (typeof value === "bigint") return value.toString()
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("commerce_money_legacy_major_units_invalid")
    return String(value)
  }
  return value.trim()
}

export function parseLegacyMajorUnitsToMinorUnits(
  value: LegacyMajorUnitInput,
  currency: string,
): bigint {
  const exponent = getCurrencyMinorUnitExponent(currency)
  const normalized = normalizeLegacyMajorUnitInput(value)
  if (!LEGACY_DECIMAL_PATTERN.test(normalized)) {
    throw new Error("commerce_money_legacy_major_units_invalid")
  }

  const negative = normalized.startsWith("-")
  const unsigned = negative ? normalized.slice(1) : normalized
  const [whole = "0", fraction = ""] = unsigned.split(".")
  if (fraction.length > exponent) {
    throw new Error("commerce_money_legacy_major_units_exceeds_currency_precision")
  }

  const scaledWhole = BigInt(whole || "0") * decimalScale(exponent)
  const scaledFraction = exponent === 0
    ? 0n
    : BigInt(fraction.padEnd(exponent, "0") || "0")
  const minorUnits = scaledWhole + scaledFraction
  return negative && minorUnits !== 0n ? -minorUnits : minorUnits
}

export function createMoneyFromMajorUnits(
  value: LegacyMajorUnitInput,
  currency: string,
): Money {
  return createMoneyFromBigInt(parseLegacyMajorUnitsToMinorUnits(value, currency), currency)
}

export function moneyToLegacyDecimalNumber(money: Money): number {
  const decimal = Number(moneyToDecimalString(money))
  if (!Number.isFinite(decimal)) throw new Error("commerce_money_legacy_decimal_number_invalid")
  return decimal
}
