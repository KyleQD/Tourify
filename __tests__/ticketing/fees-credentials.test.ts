/**
 * Unit tests for ticketing fee calculation and credential helpers.
 */

import { describe, expect, it } from 'vitest'
import { calculateTicketFees, generateOrderNumber } from '@/lib/ticketing/fees'
import { buildQrPayload, parseQrPayload, generateCredentialToken } from '@/lib/ticketing/credentials'

describe('calculateTicketFees', () => {
  it('applies default $1 per ticket platform fee', () => {
    const fees = calculateTicketFees({
      unitPrice: 25,
      quantity: 3,
    })

    expect(fees.subtotal).toBe(75)
    expect(fees.platformFeeAmount).toBe(3)
    expect(fees.processingFeeAmount).toBeGreaterThan(0)
    expect(fees.buyerTotal).toBeGreaterThan(fees.subtotal)
  })

  it('supports percentage platform fee', () => {
    const fees = calculateTicketFees({
      unitPrice: 100,
      quantity: 1,
      config: {
        platformFeeType: 'percentage',
        platformFeeAmount: 10,
        processingFeePassthrough: false,
      },
    })

    expect(fees.platformFeeAmount).toBe(10)
    expect(fees.processingFeeAmount).toBe(0)
    expect(fees.buyerTotal).toBe(110)
  })

  it('applies discounts before fees', () => {
    const fees = calculateTicketFees({
      unitPrice: 50,
      quantity: 2,
      discountAmount: 20,
      config: {
        platformFeeType: 'flat_per_ticket',
        platformFeeAmount: 1,
        processingFeePassthrough: false,
        taxEnabled: false,
      },
    })

    expect(fees.discountAmount).toBe(20)
    expect(fees.grossAmount).toBe(80)
    expect(fees.platformFeeAmount).toBe(2)
    expect(fees.buyerTotal).toBe(82)
  })

  it('supports none platform fee', () => {
    const fees = calculateTicketFees({
      unitPrice: 10,
      quantity: 1,
      config: { platformFeeType: 'none', processingFeePassthrough: false },
    })
    expect(fees.platformFeeAmount).toBe(0)
    expect(fees.buyerTotal).toBe(10)
  })
})

describe('generateOrderNumber', () => {
  it('creates unique TKT-prefixed order numbers', () => {
    const a = generateOrderNumber()
    const b = generateOrderNumber()
    expect(a).toMatch(/^TKT-/)
    expect(a).not.toBe(b)
  })
})

describe('credentials', () => {
  it('generates high-entropy opaque tokens', () => {
    const token = generateCredentialToken()
    expect(token.length).toBeGreaterThan(20)
    expect(token).not.toMatch(/^[0-9a-f-]{36}$/i)
  })

  it('parses plain and JSON envelope payloads', () => {
    const token = 'abc123token'
    expect(parseQrPayload(buildQrPayload(token))).toBe(token)
    expect(parseQrPayload(JSON.stringify({ v: 1, token }))).toBe(token)
  })
})
