/**
 * Settlement / revenue allocation math helpers for Phase 7.
 */

import {
  calculateCommerceSettlementShares,
  legacySettlementAmount,
} from '@/lib/admin/commerce/settlement-calculations'
import { createMoneyFromMajorUnits } from '@/lib/admin/commerce/money-adapters'

export interface RevenueShareInput {
  netRevenue: number
  currency?: string
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
  amount_minor?: number
  currency?: string
}

export function calculateRevenueShares(input: RevenueShareInput): RevenueShareResult[] {
  const currency = input.currency || 'USD'
  const netRevenue = createMoneyFromMajorUnits(Math.max(0, input.netRevenue), currency)
  return calculateCommerceSettlementShares({
    netRevenue,
    allocations: input.allocations.map((allocation) => ({
      beneficiaryType: allocation.beneficiary_type,
      beneficiaryId: allocation.beneficiary_id,
      shareType: allocation.share_type,
      shareValue: allocation.share_value,
      priority: allocation.priority,
      isActive: allocation.is_active,
    })),
  }).map((share) => ({
    beneficiary_type: share.beneficiaryType,
    beneficiary_id: share.beneficiaryId,
    amount: legacySettlementAmount(share.amount),
    amount_minor: share.amount.amountMinor,
    currency: share.amount.currency,
  }))
}
