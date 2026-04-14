const DEFAULT_PLATFORM_FEE_PERCENTAGE = 0.10

export interface MarketplaceFeeBreakdown {
  subtotal: number
  platformFee: number
  sellerPayout: number
  taxAmount: number
  total: number
  buyerTotal: number
}

/**
 * Calculate marketplace fees.
 *
 * The platform charges a 10% service fee **on top of** the seller's price.
 * The buyer pays: subtotal + service fee (+ optional tax).
 * The seller receives: subtotal (the full listed price).
 *
 * Example: $10 song → buyer pays $11.00 ($10 + $1 fee), seller gets $10.
 */
export function calculateMarketplaceFeeBreakdown({
  subtotal,
  taxAmount = 0,
  platformFeePercentage = DEFAULT_PLATFORM_FEE_PERCENTAGE,
}: {
  subtotal: number
  taxAmount?: number
  platformFeePercentage?: number
}): MarketplaceFeeBreakdown {
  const safeSubtotal = Math.max(0, subtotal)
  const safeTax = Math.max(0, taxAmount)
  const safePercentage = Math.min(Math.max(platformFeePercentage, 0), 1)

  const platformFee = roundCurrency(safeSubtotal * safePercentage)
  const sellerPayout = roundCurrency(safeSubtotal)
  const total = roundCurrency(safeSubtotal + safeTax)
  const buyerTotal = roundCurrency(safeSubtotal + platformFee + safeTax)

  return {
    subtotal: roundCurrency(safeSubtotal),
    platformFee,
    sellerPayout,
    taxAmount: roundCurrency(safeTax),
    total,
    buyerTotal,
  }
}

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100
}
