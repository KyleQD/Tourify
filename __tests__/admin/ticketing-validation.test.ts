import { describe, expect, it } from 'vitest'
import {
  assertDateOrder,
  assertPercentageDiscount,
  createPromoCodeSchema,
  ticketingCreateSchema,
  updateTicketTypeSchema,
} from '@/lib/admin/ticketing-validation'

const eventId = '11111111-1111-4111-8111-111111111111'

describe('Admin ticketing validation', () => {
  it('normalizes the minimal ticket type command with safe defaults', () => {
    const result = ticketingCreateSchema.parse({
      action: 'create_ticket_type',
      event_id: eventId,
      name: 'General admission',
      price: 25,
      quantity_available: 500,
    })

    expect(result).toMatchObject({
      category: 'general',
      is_active: true,
      is_transferable: true,
      min_per_order: 1,
      refund_policy: 'No refunds',
    })
  })

  it('accepts the legacy expires_at promo form while requiring an event', () => {
    const result = createPromoCodeSchema.parse({
      action: 'create_promo_code',
      event_id: eventId,
      code: 'SUMMER20',
      discount_type: 'percentage',
      discount_value: 20,
      expires_at: '2027-08-01',
    })

    expect(result.expires_at).toBe('2027-08-01')
    expect(result.min_purchase_amount).toBe(0)
  })

  it('rejects arbitrary ticket type update fields', () => {
    expect(() => updateTicketTypeSchema.parse({
      action: 'update_ticket_type',
      id: eventId,
      event_id: eventId,
    })).toThrow()
  })

  it('bounds bulk referral generation', () => {
    expect(() => ticketingCreateSchema.parse({
      action: 'generate_referral_codes',
      event_id: eventId,
      count: 101,
    })).toThrow()
  })

  it('enforces chronological ranges and percentage bounds', () => {
    expect(() => assertDateOrder('2027-08-02', '2027-08-01', 'Sale')).toThrow(
      'Sale end date must be after start date',
    )
    expect(() => assertPercentageDiscount('percentage', 101)).toThrow(
      'Percentage discounts cannot exceed 100',
    )
    expect(() => assertPercentageDiscount('fixed', 101)).not.toThrow()
  })
})
