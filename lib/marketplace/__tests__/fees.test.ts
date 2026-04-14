import { calculateMarketplaceFeeBreakdown } from "../fees"

describe("marketplace fee breakdown", () => {
  it("calculates subtotal, platform fee on top, seller payout, and buyer total", () => {
    const breakdown = calculateMarketplaceFeeBreakdown({
      subtotal: 100,
      taxAmount: 8.25,
      platformFeePercentage: 0.15,
    })

    expect(breakdown.subtotal).toBe(100)
    expect(breakdown.platformFee).toBe(15)
    expect(breakdown.sellerPayout).toBe(100)
    expect(breakdown.taxAmount).toBe(8.25)
    expect(breakdown.total).toBe(108.25)
    expect(breakdown.buyerTotal).toBe(123.25)
  })

  it("guards invalid values and clamps platform fee", () => {
    const negative = calculateMarketplaceFeeBreakdown({
      subtotal: -100,
      taxAmount: -20,
      platformFeePercentage: -1,
    })
    expect(negative.subtotal).toBe(0)
    expect(negative.platformFee).toBe(0)
    expect(negative.sellerPayout).toBe(0)
    expect(negative.total).toBe(0)

    const overHundred = calculateMarketplaceFeeBreakdown({
      subtotal: 50,
      platformFeePercentage: 2,
    })
    expect(overHundred.platformFee).toBe(50)
    expect(overHundred.sellerPayout).toBe(50)
    expect(overHundred.buyerTotal).toBe(100)
  })
})
