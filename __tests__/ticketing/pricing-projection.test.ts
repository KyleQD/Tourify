/**
 * VEN-162 — all-in pricing consistency between the operator DTO projection
 * and the checkout fee engine.
 */

import { describe, expect, it } from 'vitest'
import { calculateTicketFees } from '@/lib/ticketing/fees'
import { projectTicketTypePricing } from '@/lib/ticketing/pricing-projection'

describe('projectTicketTypePricing consistency', () => {
  it('matches checkout math when no per-type metadata overrides exist', () => {
    const row = { price: 25, metadata: {} }
    const config = { platformFeeType: 'flat_per_ticket' as const, platformFeeAmount: 1, processingFeePassthrough: true }

    const projected = projectTicketTypePricing(row, config)
    const checkout = calculateTicketFees({ unitPrice: 25, quantity: 1, discountAmount: 0, config })

    expect(projected.all_in_price).toBeCloseTo(checkout.buyerTotal, 2)
    expect(projected.price_breakdown.platform_fee).toBeCloseTo(checkout.platformFeeAmount, 2)
    expect(projected.price_breakdown.processing_fee).toBeCloseTo(checkout.processingFeeAmount, 2)
  })

  it('honors explicit metadata fee overrides (service/facility/tax)', () => {
    const projected = projectTicketTypePricing({
      price: 20,
      metadata: { service_fee: 2, facility_fee: 1, tax_amount: 1.5 },
    })
    expect(projected.mandatory_fees).toBe(4.5)
    expect(projected.all_in_price).toBe(24.5)
    expect(projected.price_breakdown.service_fee).toBe(2)
    expect(projected.price_breakdown.facility_fee).toBe(1)
    expect(projected.price_breakdown.tax_amount).toBe(1.5)
  })

  it('never produces negative or NaN pricing from malformed rows', () => {
    for (const price of [null, undefined, -5, 'abc']) {
      const projected = projectTicketTypePricing({ price: price as any, metadata: { service_fee: -3 } })
      expect(Number.isFinite(projected.all_in_price)).toBe(true)
      expect(projected.base_price).toBeGreaterThanOrEqual(0)
      expect(projected.mandatory_fees).toBeGreaterThanOrEqual(0)
    }
  })

  it('projects free/comp types as zero all-in without hidden fees', () => {
    const projected = projectTicketTypePricing({ price: 0, metadata: null }, null)
    expect(projected.all_in_price).toBe(0)
  })
})
