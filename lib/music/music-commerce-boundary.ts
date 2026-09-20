/**
 * Cross-domain contract for music commerce.
 *
 * Music owns the catalog, rights, and royalty records. Marketplace owns
 * checkout, orders, transfers, portfolios, and the financial music-marketplace
 * surface. This module is deliberately limited to typed references and
 * projections: it must not create orders, calculate prices, or mutate money
 * records.
 */

export const MUSIC_COMMERCE_OWNERS = {
  music: "music",
  marketplace: "marketplace",
} as const

export type MusicCommerceOwner = (typeof MUSIC_COMMERCE_OWNERS)[keyof typeof MUSIC_COMMERCE_OWNERS]

export type MusicCommerceConcern =
  | "catalog"
  | "rights"
  | "royalties"
  | "checkout"
  | "orders"
  | "transfers"
  | "portfolios"
  | "marketplace_operations"

export const MUSIC_OWNED_COMMERCE_CONCERNS = ["catalog", "rights", "royalties"] as const
export const MARKETPLACE_OWNED_COMMERCE_CONCERNS = [
  "checkout",
  "orders",
  "transfers",
  "portfolios",
  "marketplace_operations",
] as const

export type MusicOwnedCommerceConcern = (typeof MUSIC_OWNED_COMMERCE_CONCERNS)[number]
export type MarketplaceOwnedCommerceConcern = (typeof MARKETPLACE_OWNED_COMMERCE_CONCERNS)[number]

export type MusicCommerceAuthContract = "artist_profile" | "marketplace_account"

export interface MusicCommerceRouteBoundary {
  routePrefix: string
  concern: MusicCommerceConcern
  owner: MusicCommerceOwner
  authContract: MusicCommerceAuthContract
}

/**
 * Longest-prefix matching is used so the root artist music route does not
 * shadow its more specific rights and royalty boundaries.
 */
export const MUSIC_COMMERCE_ROUTE_BOUNDARIES: readonly MusicCommerceRouteBoundary[] = [
  {
    routePrefix: "/api/artist/music/royalties",
    concern: "royalties",
    owner: MUSIC_COMMERCE_OWNERS.music,
    authContract: "artist_profile",
  },
  {
    routePrefix: "/api/artist/music/rights",
    concern: "rights",
    owner: MUSIC_COMMERCE_OWNERS.music,
    authContract: "artist_profile",
  },
  {
    routePrefix: "/api/artist/music",
    concern: "catalog",
    owner: MUSIC_COMMERCE_OWNERS.music,
    authContract: "artist_profile",
  },
  {
    routePrefix: "/api/marketplace/checkout",
    concern: "checkout",
    owner: MUSIC_COMMERCE_OWNERS.marketplace,
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/marketplace/orders",
    concern: "orders",
    owner: MUSIC_COMMERCE_OWNERS.marketplace,
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace",
    concern: "marketplace_operations",
    owner: MUSIC_COMMERCE_OWNERS.marketplace,
    authContract: "marketplace_account",
  },
]

function isPathWithinPrefix(pathname: string, routePrefix: string): boolean {
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
}

export function resolveMusicCommerceRouteBoundary(pathname: string): MusicCommerceRouteBoundary | null {
  return (
    MUSIC_COMMERCE_ROUTE_BOUNDARIES
      .filter((boundary) => isPathWithinPrefix(pathname, boundary.routePrefix))
      .sort((left, right) => right.routePrefix.length - left.routePrefix.length)[0] ?? null
  )
}

export function isMusicOwnedCommerceConcern(concern: MusicCommerceConcern): concern is MusicOwnedCommerceConcern {
  return (MUSIC_OWNED_COMMERCE_CONCERNS as readonly string[]).includes(concern)
}

export function isMarketplaceOwnedCommerceConcern(
  concern: MusicCommerceConcern,
): concern is MarketplaceOwnedCommerceConcern {
  return (MARKETPLACE_OWNED_COMMERCE_CONCERNS as readonly string[]).includes(concern)
}

export function assertMusicOwnedCommerceConcern(concern: MusicCommerceConcern): void {
  if (!isMusicOwnedCommerceConcern(concern)) {
    throw new Error(`music_commerce_concern_owned_by_marketplace:${concern}`)
  }
}

export function assertMarketplaceOwnedCommerceConcern(concern: MusicCommerceConcern): void {
  if (!isMarketplaceOwnedCommerceConcern(concern)) {
    throw new Error(`music_commerce_concern_owned_by_music:${concern}`)
  }
}

export interface MusicCatalogCommerceReference {
  source: "music"
  trackId: string
  artistUserId: string
  title: string
  rightsStatus: "confirmed" | "unconfirmed"
  accessMode: "free" | "paid"
  previewMode: "full" | "clip"
}

/**
 * Safe catalog projection for marketplace listing/entitlement workflows.
 * Storage paths, URLs, prices, and order identifiers stay out of the Music
 * contract so the marketplace cannot accidentally treat catalog data as a
 * financial record.
 */
export function buildMusicCatalogCommerceReference(input: {
  id: string
  user_id: string
  title: string
  rights_confirmed?: boolean | null
  access_mode?: string | null
  preview_mode?: string | null
}): MusicCatalogCommerceReference {
  const accessMode = input.access_mode === "paid" ? "paid" : "free"
  const previewMode = input.preview_mode === "clip" ? "clip" : "full"

  return {
    source: "music",
    trackId: input.id,
    artistUserId: input.user_id,
    title: input.title,
    rightsStatus: input.rights_confirmed === true ? "confirmed" : "unconfirmed",
    accessMode,
    previewMode,
  }
}

export interface MarketplaceMusicPurchaseReference {
  source: "marketplace"
  orderId: string
  orderItemId: string
  trackId: string
  buyerUserId: string
  sellerUserId: string
}

/**
 * Reference passed from marketplace fulfillment into Music. The marketplace
 * remains the source of truth for the order; Music only receives the minimum
 * identity needed to grant/record catalog access.
 */
export function buildMarketplaceMusicPurchaseReference(input: {
  orderId: string
  orderItemId: string
  trackId: string
  buyerUserId: string
  sellerUserId: string
}): MarketplaceMusicPurchaseReference {
  return { source: "marketplace", ...input }
}
