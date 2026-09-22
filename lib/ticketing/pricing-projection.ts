import { calculateTicketFees, type TicketingFeeConfig } from './fees'

/**
 * Shared ticket-type price projection for operator DTOs (VEN-150/VEN-162).
 *
 * Consistency contract: the all-in price an operator sees in the venue
 * ticketing workspace equals what checkout computes via calculateTicketFees.
 * Explicit per-type metadata fees (service/facility/tax) win; otherwise the
 * event's fee config derives the per-ticket mandatory add-ons exactly as the
 * purchase path does (quantity = 1, no discount).
 */

export interface TicketTypePricingRow {
  price?: number | string | null
  metadata?: Record<string, unknown> | null
}

export interface ProjectedTicketPricing {
  base_price: number
  mandatory_fees: number
  all_in_price: number
  price_breakdown: {
    base_price: number
    service_fee: number
    facility_fee: number
    tax_amount: number
    platform_fee: number
    processing_fee: number
    all_in_price: number
  }
}

function num(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

export function projectTicketTypePricing(
  row: TicketTypePricingRow,
  config?: TicketingFeeConfig | null,
): ProjectedTicketPricing {
  const meta = row?.metadata && typeof row.metadata === 'object' ? (row.metadata as Record<string, unknown>) : {}
  const basePrice = round2(Math.max(0, Number(row?.price) || 0))

  // Zero-price / complimentary types never carry buyer fees.
  if (basePrice === 0) {
    return {
      base_price: 0,
      mandatory_fees: 0,
      all_in_price: 0,
      price_breakdown: {
        base_price: 0,
        service_fee: 0,
        facility_fee: 0,
        tax_amount: 0,
        platform_fee: 0,
        processing_fee: 0,
        all_in_price: 0,
      },
    }
  }

  const serviceFee = num(meta.service_fee ?? meta.serviceFee)
  const facilityFee = num(meta.facility_fee ?? meta.facilityFee)
  const taxAmount = num(meta.tax_amount ?? meta.taxAmount)

  if (serviceFee !== null || facilityFee !== null || taxAmount !== null) {
    // Explicit per-type fee overrides — authoritative for this type.
    const s = serviceFee ?? 0
    const f = facilityFee ?? 0
    const t = taxAmount ?? 0
    const mandatoryFees = round2(s + f + t)
    return {
      base_price: basePrice,
      mandatory_fees: mandatoryFees,
      all_in_price: round2(basePrice + mandatoryFees),
      price_breakdown: {
        base_price: basePrice,
        service_fee: s,
        facility_fee: f,
        tax_amount: t,
        platform_fee: 0,
        processing_fee: 0,
        all_in_price: round2(basePrice + mandatoryFees),
      },
    }
  }

  // Config-derived: identical math to checkout (single ticket, no discount).
  const breakdown = calculateTicketFees({ unitPrice: basePrice, quantity: 1, discountAmount: 0, config: config || {} })
  const platformFee = breakdown.platformFeeAmount
  const processingFee = breakdown.processingFeeAmount
  const tax = breakdown.taxAmount
  const mandatoryFees = round2(platformFee + processingFee + tax)
  return {
    base_price: basePrice,
    mandatory_fees: mandatoryFees,
    all_in_price: round2(basePrice + mandatoryFees),
    price_breakdown: {
      base_price: basePrice,
      service_fee: 0,
      facility_fee: 0,
      tax_amount: tax,
      platform_fee: platformFee,
      processing_fee: processingFee,
      all_in_price: round2(basePrice + mandatoryFees),
    },
  }
}
