/**
 * Logistics money helpers.
 * Convention: USD major-unit numbers (DECIMAL), not integer cents.
 */

import { formatSafeCurrency } from '@/lib/format/number-format'

export interface MoneyAmount {
  amount: number
  currency: string
}

export function toMoneyAmount(amount: number | null | undefined, currency = 'USD'): MoneyAmount {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  return { amount: safe, currency: currency || 'USD' }
}

export function formatLogisticsMoney(amount: number | null | undefined, currency = 'USD'): string {
  return formatSafeCurrency(toMoneyAmount(amount, currency).amount, { currency })
}

export function sumMoney(amounts: Array<number | null | undefined>): number {
  return amounts.reduce<number>((total, value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return total
    return total + value
  }, 0)
}

export function moneyVariance(args: {
  projected?: number | null
  approved?: number | null
  actual?: number | null
}): { baseline: number; actual: number; variance: number; isOver: boolean } {
  const baseline =
    typeof args.approved === 'number' && Number.isFinite(args.approved)
      ? args.approved
      : typeof args.projected === 'number' && Number.isFinite(args.projected)
        ? args.projected
        : 0
  const actual = typeof args.actual === 'number' && Number.isFinite(args.actual) ? args.actual : 0
  const variance = actual - baseline
  return { baseline, actual, variance, isOver: variance > 0 }
}
