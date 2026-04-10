const DEFAULT_PLATFORM_FEE_PERCENTAGE = 0.15

export interface MarketplaceFeeBreakdown {
  subtotal: number
  platformFee: number
  sellerPayout: number
  taxAmount: number
  total: number
}

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
  const sellerPayout = roundCurrency(safeSubtotal - platformFee)
  const total = roundCurrency(safeSubtotal + safeTax)

  return {
    subtotal: roundCurrency(safeSubtotal),
    platformFee,
    sellerPayout,
    taxAmount: roundCurrency(safeTax),
    total,
  }
}

function roundCurrency(amount: number) {
  return Math.round(amount * 100) / 100
}
