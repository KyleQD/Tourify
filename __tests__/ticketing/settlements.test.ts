import { describe, expect, it } from 'vitest'
import { calculateRevenueShares } from '@/lib/ticketing/settlements'

describe('calculateRevenueShares', () => {
  it('splits percentage and remainder without exceeding net', () => {
    const results = calculateRevenueShares({
      netRevenue: 1000,
      allocations: [
        { beneficiary_type: 'venue', share_type: 'percentage', share_value: 20, priority: 1 },
        { beneficiary_type: 'artist', share_type: 'flat', share_value: 100, priority: 2 },
        { beneficiary_type: 'organization', share_type: 'remainder', share_value: 0, priority: 99 },
      ],
    })

    expect(results.find((r) => r.beneficiary_type === 'venue')?.amount).toBe(200)
    expect(results.find((r) => r.beneficiary_type === 'artist')?.amount).toBe(100)
    expect(results.find((r) => r.beneficiary_type === 'organization')?.amount).toBe(700)
    expect(results.find((r) => r.beneficiary_type === 'organization')?.amount_minor).toBe(70000)
    expect(results.find((r) => r.beneficiary_type === 'organization')?.currency).toBe('USD')
  })

  it('avoids floating-point drift in legacy decimal settlement output', () => {
    const results = calculateRevenueShares({
      netRevenue: 0.3,
      allocations: [
        { beneficiary_type: 'venue', share_type: 'flat', share_value: 0.1, priority: 1 },
        { beneficiary_type: 'artist', share_type: 'flat', share_value: 0.2, priority: 2 },
      ],
    })

    expect(results.map((r) => r.amount)).toEqual([0.1, 0.2])
    expect(results.map((r) => r.amount_minor)).toEqual([10, 20])
  })
})
