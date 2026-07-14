/**
 * Server-side fee calculation for ticket orders.
 * Default platform fee: $1 per ticket (configurable via event_ticketing_config).
 */

export type PlatformFeeType = 'flat_per_ticket' | 'percentage' | 'flat_per_order' | 'none'

export interface TicketingFeeConfig {
  platformFeeType?: PlatformFeeType | null
  platformFeeAmount?: number | null
  processingFeePassthrough?: boolean | null
  taxEnabled?: boolean | null
  taxRate?: number | null
  /** Optional override for processing fee rate (default 2.9% + $0.30 model simplified to 3%) */
  processingFeeRate?: number | null
}

export interface FeeBreakdownInput {
  unitPrice: number
  quantity: number
  discountAmount?: number
  config?: TicketingFeeConfig | null
}

export interface FeeBreakdown {
  subtotal: number
  discountAmount: number
  taxableAmount: number
  taxAmount: number
  platformFeeAmount: number
  processingFeeAmount: number
  grossAmount: number
  netAmount: number
  buyerTotal: number
}

const DEFAULT_PLATFORM_FEE = 1
const DEFAULT_PROCESSING_RATE = 0.03

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function calculateTicketFees(input: FeeBreakdownInput): FeeBreakdown {
  const quantity = Math.max(0, Math.floor(input.quantity || 0))
  const unitPrice = Math.max(0, Number(input.unitPrice) || 0)
  const discountAmount = Math.max(0, Number(input.discountAmount) || 0)
  const config = input.config || {}

  const subtotal = roundMoney(unitPrice * quantity)
  const afterDiscount = Math.max(0, roundMoney(subtotal - discountAmount))

  const feeType: PlatformFeeType = config.platformFeeType || 'flat_per_ticket'
  const feeAmount = config.platformFeeAmount ?? DEFAULT_PLATFORM_FEE

  let platformFeeAmount = 0
  if (feeType === 'flat_per_ticket')
    platformFeeAmount = roundMoney(feeAmount * quantity)
  else if (feeType === 'percentage')
    platformFeeAmount = roundMoney(afterDiscount * (feeAmount / 100))
  else if (feeType === 'flat_per_order')
    platformFeeAmount = roundMoney(feeAmount)
  else
    platformFeeAmount = 0

  const taxRate = config.taxEnabled ? Math.max(0, Number(config.taxRate) || 0) : 0
  const taxAmount = roundMoney(afterDiscount * (taxRate / 100))

  const processingRate = config.processingFeeRate ?? DEFAULT_PROCESSING_RATE
  const processingBase = afterDiscount + platformFeeAmount + taxAmount
  const processingFeeAmount = config.processingFeePassthrough === false
    ? 0
    : roundMoney(processingBase * processingRate)

  const buyerTotal = roundMoney(afterDiscount + platformFeeAmount + taxAmount + processingFeeAmount)
  const netAmount = roundMoney(afterDiscount - (config.processingFeePassthrough === false ? processingFeeAmount : 0))

  return {
    subtotal,
    discountAmount: roundMoney(discountAmount),
    taxableAmount: afterDiscount,
    taxAmount,
    platformFeeAmount,
    processingFeeAmount,
    grossAmount: afterDiscount,
    netAmount,
    buyerTotal,
  }
}

export function generateOrderNumber(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `TKT-${stamp}-${rand}`
}
