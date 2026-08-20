import {
  assertSameCommerceCurrency,
  isCanonicalCommerceCurrency,
  normalizeCommerceCurrency,
} from "@/lib/admin/commerce/currency"

export interface Money {
  amountMinor: number
  currency: string
}

export type MoneyInput = Money | {
  amountMinor?: unknown
  currency?: unknown
}

export function isCommerceMoney(value: unknown): value is Money {
  if (!value || typeof value !== "object") return false
  const candidate = value as MoneyInput
  return (
    Number.isSafeInteger(candidate.amountMinor)
    && isCanonicalCommerceCurrency(candidate.currency)
  )
}

export function createMoney(amountMinor: number, currency: string): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error("commerce_money_amount_minor_must_be_safe_integer")
  }
  const normalizedCurrency = normalizeCommerceCurrency(currency)
  return {
    amountMinor,
    currency: normalizedCurrency,
  }
}

export function createMoneyFromBigInt(amountMinor: bigint, currency: string): Money {
  const asNumber = Number(amountMinor)
  if (!Number.isSafeInteger(asNumber) || BigInt(asNumber) !== amountMinor) {
    throw new Error("commerce_money_amount_minor_exceeds_json_safe_range")
  }
  return createMoney(asNumber, currency)
}

export function assertCommerceMoney(value: unknown): asserts value is Money {
  if (!isCommerceMoney(value)) throw new Error("commerce_money_invalid")
}

export function zeroMoney(currency: string): Money {
  return createMoney(0, currency)
}

export function negateMoney(money: Money): Money {
  return createMoney(-money.amountMinor, money.currency)
}

export function assertSameMoneyCurrency(a: Pick<Money, "currency">, b: Pick<Money, "currency">): string {
  try {
    return assertSameCommerceCurrency(a.currency, b.currency)
  } catch (error) {
    if (error instanceof Error && error.message === "commerce_currency_mismatch") {
      throw new Error("commerce_money_currency_mismatch")
    }
    throw error
  }
}

export function addMoney(a: Money, b: Money): Money {
  const currency = assertSameMoneyCurrency(a, b)
  return createMoney(a.amountMinor + b.amountMinor, currency)
}

export function subtractMoney(a: Money, b: Money): Money {
  return addMoney(a, negateMoney(b))
}

export function sumMoney(amounts: readonly Money[], currency?: string): Money {
  if (amounts.length === 0) {
    if (!currency) throw new Error("commerce_money_sum_currency_required")
    return zeroMoney(currency)
  }

  const expectedCurrency = normalizeCommerceCurrency(currency || amounts[0].currency)
  return amounts.reduce((total, money) => {
    assertSameMoneyCurrency({ currency: expectedCurrency }, money)
    return addMoney(total, money)
  }, zeroMoney(expectedCurrency))
}
