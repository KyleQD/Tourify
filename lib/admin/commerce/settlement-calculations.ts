import { createMoneyFromMajorUnits, moneyToLegacyDecimalNumber } from "@/lib/admin/commerce/money-adapters"
import { addMoney, createMoneyFromBigInt, subtractMoney, type Money } from "@/lib/admin/commerce/money"

export interface CommerceSettlementAllocationInput {
  beneficiaryType: string
  beneficiaryId?: string | null
  shareType: "percentage" | "flat" | "remainder"
  shareValue: number
  priority: number
  isActive?: boolean
}

export interface CommerceSettlementShare {
  beneficiaryType: string
  beneficiaryId?: string | null
  amount: Money
}

const DECIMAL_PATTERN = /^\d+(?:\.\d+)?$/

function parseNonNegativeDecimal(value: number): { numerator: bigint; scale: bigint } {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("commerce_settlement_decimal_invalid")
  }

  const normalized = String(value)
  if (!DECIMAL_PATTERN.test(normalized)) {
    throw new Error("commerce_settlement_decimal_invalid")
  }

  const [whole = "0", fraction = ""] = normalized.split(".")
  const scale = 10n ** BigInt(fraction.length)
  return {
    numerator: BigInt(`${whole}${fraction}` || "0"),
    scale,
  }
}

function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error("commerce_settlement_divisor_invalid")
  return (numerator + denominator / 2n) / denominator
}

export function calculateCommercePercentageShare(netRevenue: Money, percentage: number): Money {
  const parsed = parseNonNegativeDecimal(percentage)
  const denominator = parsed.scale * 100n
  const amountMinor = roundDivide(BigInt(netRevenue.amountMinor) * parsed.numerator, denominator)
  return createMoneyFromBigInt(amountMinor, netRevenue.currency)
}

export function calculateCommerceSettlementShares(input: {
  netRevenue: Money
  allocations: readonly CommerceSettlementAllocationInput[]
}): CommerceSettlementShare[] {
  const active = [...input.allocations]
    .filter(allocation => allocation.isActive !== false)
    .sort((a, b) => a.priority - b.priority)

  let remaining = input.netRevenue.amountMinor > 0
    ? input.netRevenue
    : createMoneyFromBigInt(0n, input.netRevenue.currency)
  const results: CommerceSettlementShare[] = []

  for (const allocation of active) {
    if (allocation.shareType === "remainder") continue

    const requested = allocation.shareType === "flat"
      ? createMoneyFromMajorUnits(allocation.shareValue, remaining.currency)
      : calculateCommercePercentageShare(input.netRevenue, allocation.shareValue)

    const clampedMinor = Math.min(Math.max(0, requested.amountMinor), remaining.amountMinor)
    const amount = createMoneyFromBigInt(BigInt(clampedMinor), remaining.currency)
    remaining = subtractMoney(remaining, amount)
    results.push({
      beneficiaryType: allocation.beneficiaryType,
      beneficiaryId: allocation.beneficiaryId,
      amount,
    })
  }

  const remainderAllocation = active.find(allocation => allocation.shareType === "remainder")
  if (remainderAllocation && remaining.amountMinor > 0) {
    results.push({
      beneficiaryType: remainderAllocation.beneficiaryType,
      beneficiaryId: remainderAllocation.beneficiaryId,
      amount: remaining,
    })
  }

  return results
}

export function calculateCommerceSettlementNet(input: {
  gross: Money
  refunds: Money
  fees: Money
}): Money {
  const netBeforeClamp = subtractMoney(subtractMoney(input.gross, input.refunds), input.fees)
  if (netBeforeClamp.amountMinor <= 0) return createMoneyFromBigInt(0n, netBeforeClamp.currency)
  return netBeforeClamp
}

export function addCommerceSettlementAmounts(amounts: readonly Money[], currency: string): Money {
  return amounts.reduce((total, amount) => addMoney(total, amount), createMoneyFromBigInt(0n, currency))
}

export function legacySettlementAmount(money: Money): number {
  return moneyToLegacyDecimalNumber(money)
}
