export interface MarketplaceCartLine {
  listingId: string
  variantId?: string
  sellerUserId: string
  quantity: number
}

export interface SellerCartGroup {
  sellerUserId: string
  lines: MarketplaceCartLine[]
}

/**
 * MVP checkout remains seller-scoped.
 * This helper groups line items by seller so we can evolve to multi-artist checkout.
 */
export function groupCartLinesBySeller(lines: MarketplaceCartLine[]): SellerCartGroup[] {
  const groups = new Map<string, MarketplaceCartLine[]>()
  for (const line of lines) {
    const existing = groups.get(line.sellerUserId) || []
    existing.push(line)
    groups.set(line.sellerUserId, existing)
  }

  return Array.from(groups.entries()).map(([sellerUserId, groupedLines]) => ({
    sellerUserId,
    lines: groupedLines,
  }))
}

export function hasSingleSellerCart(lines: MarketplaceCartLine[]) {
  return groupCartLinesBySeller(lines).length <= 1
}
