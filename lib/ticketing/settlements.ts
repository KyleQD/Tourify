/**
 * Settlement / revenue allocation math helpers for Phase 7.
 */

export interface RevenueShareInput {
  netRevenue: number
  allocations: Array<{
    beneficiary_type: string
    beneficiary_id?: string | null
    share_type: 'percentage' | 'flat' | 'remainder'
    share_value: number
    priority: number
    is_active?: boolean
  }>
}

export interface RevenueShareResult {
  beneficiary_type: string
  beneficiary_id?: string | null
  amount: number
}

export function calculateRevenueShares(input: RevenueShareInput): RevenueShareResult[] {
  const active = [...input.allocations]
    .filter((a) => a.is_active !== false)
    .sort((a, b) => a.priority - b.priority)

  let remaining = Math.max(0, input.netRevenue)
  const results: RevenueShareResult[] = []

  for (const alloc of active) {
    if (alloc.share_type === 'remainder') continue
    let amount = 0
    if (alloc.share_type === 'flat')
      amount = Math.min(remaining, alloc.share_value)
    else
      amount = Math.round(input.netRevenue * (alloc.share_value / 100) * 100) / 100

    amount = Math.min(remaining, Math.max(0, amount))
    remaining = Math.round((remaining - amount) * 100) / 100
    results.push({
      beneficiary_type: alloc.beneficiary_type,
      beneficiary_id: alloc.beneficiary_id,
      amount,
    })
  }

  const remainderAlloc = active.find((a) => a.share_type === 'remainder')
  if (remainderAlloc && remaining > 0) {
    results.push({
      beneficiary_type: remainderAlloc.beneficiary_type,
      beneficiary_id: remainderAlloc.beneficiary_id,
      amount: remaining,
    })
  }

  return results
}
