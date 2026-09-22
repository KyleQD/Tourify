/**
 * Marketplace-side ownership contract for music commerce.
 *
 * Music owns catalog, rights, and royalty records. Marketplace owns the
 * financial and account-facing operations: checkout, orders, transfers, and
 * portfolios. The parallel Music contract classifies the same split for the
 * Music domain; this module is the contract Marketplace route batches import.
 */

export const MARKETPLACE_MUSIC_COMMERCE_OWNER = "marketplace" as const

export type MarketplaceMusicCommerceConcern =
  | "checkout"
  | "orders"
  | "transfers"
  | "portfolios"
  | "marketplace_operations"

export const MARKETPLACE_MUSIC_COMMERCE_CONCERNS = [
  "checkout",
  "orders",
  "transfers",
  "portfolios",
  "marketplace_operations",
] as const satisfies readonly MarketplaceMusicCommerceConcern[]

export type MarketplaceMusicCommerceAuthContract =
  | "optional_marketplace_account"
  | "marketplace_account"

export interface MarketplaceMusicCommerceRouteBoundary {
  routePrefix: string
  concern: MarketplaceMusicCommerceConcern
  owner: typeof MARKETPLACE_MUSIC_COMMERCE_OWNER
  authContract: MarketplaceMusicCommerceAuthContract
}

export interface MarketplaceMusicCommerceRouteAdoptionTarget {
  routePrefix: string
  routeFile: string
  authContract: MarketplaceMusicCommerceAuthContract
}

/**
 * Specific routes precede their broader parent so transfers and portfolios
 * retain their concern when resolved from the /api/music-marketplace tree.
 */
export const MARKETPLACE_MUSIC_COMMERCE_ROUTE_BOUNDARIES: readonly MarketplaceMusicCommerceRouteBoundary[] = [
  {
    routePrefix: "/api/marketplace/checkout",
    concern: "checkout",
    owner: MARKETPLACE_MUSIC_COMMERCE_OWNER,
    authContract: "optional_marketplace_account",
  },
  {
    routePrefix: "/api/marketplace/orders",
    concern: "orders",
    owner: MARKETPLACE_MUSIC_COMMERCE_OWNER,
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace/transfers",
    concern: "transfers",
    owner: MARKETPLACE_MUSIC_COMMERCE_OWNER,
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace/portfolio",
    concern: "portfolios",
    owner: MARKETPLACE_MUSIC_COMMERCE_OWNER,
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace/orders",
    concern: "orders",
    owner: MARKETPLACE_MUSIC_COMMERCE_OWNER,
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace",
    concern: "marketplace_operations",
    owner: MARKETPLACE_MUSIC_COMMERCE_OWNER,
    authContract: "marketplace_account",
  },
] as const

/**
 * Owning API files for the follow-up adoption batch. The music-marketplace
 * glob is intentional: every current and future handler under that tree must
 * use the required Marketplace account contract.
 */
export const MARKETPLACE_MUSIC_COMMERCE_ROUTE_ADOPTION_TARGETS: readonly MarketplaceMusicCommerceRouteAdoptionTarget[] = [
  {
    routePrefix: "/api/marketplace/checkout",
    routeFile: "app/api/marketplace/checkout/route.ts",
    authContract: "optional_marketplace_account",
  },
  {
    routePrefix: "/api/marketplace/orders",
    routeFile: "app/api/marketplace/orders/route.ts",
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace/transfers",
    routeFile: "app/api/music-marketplace/transfers/route.ts",
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace/portfolio",
    routeFile: "app/api/music-marketplace/portfolio/route.ts",
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace/orders",
    routeFile: "app/api/music-marketplace/orders/route.ts",
    authContract: "marketplace_account",
  },
  {
    routePrefix: "/api/music-marketplace",
    routeFile: "app/api/music-marketplace/**/route.ts",
    authContract: "marketplace_account",
  },
] as const

function isPathWithinPrefix(pathname: string, routePrefix: string): boolean {
  return pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
}

export function resolveMarketplaceMusicCommerceRouteBoundary(
  pathname: string,
): MarketplaceMusicCommerceRouteBoundary | null {
  return (
    MARKETPLACE_MUSIC_COMMERCE_ROUTE_BOUNDARIES
      .filter((boundary) => isPathWithinPrefix(pathname, boundary.routePrefix))
      .sort((left, right) => right.routePrefix.length - left.routePrefix.length)[0] ?? null
  )
}

export function resolveMarketplaceMusicCommerceRouteAdoptionTarget(
  pathname: string,
): MarketplaceMusicCommerceRouteAdoptionTarget | null {
  const boundary = resolveMarketplaceMusicCommerceRouteBoundary(pathname)
  if (!boundary) return null

  return MARKETPLACE_MUSIC_COMMERCE_ROUTE_ADOPTION_TARGETS.find(
    (target) => target.routePrefix === boundary.routePrefix,
  ) ?? null
}

/**
 * Route-adoption helper for Marketplace API handlers and route audits.
 * Paths outside declared route trees fail closed; new operations under the
 * declared music-marketplace tree inherit its required-auth policy.
 */
export function requiresMarketplaceAccountAuth(pathname: string): boolean {
  return resolveMarketplaceMusicCommerceRouteBoundary(pathname)?.authContract === "marketplace_account"
}

export function isMarketplaceMusicCommerceConcern(
  concern: string,
): concern is MarketplaceMusicCommerceConcern {
  return (MARKETPLACE_MUSIC_COMMERCE_CONCERNS as readonly string[]).includes(concern)
}

export function assertMarketplaceMusicCommerceConcern(
  concern: string,
): void {
  if (!isMarketplaceMusicCommerceConcern(concern)) {
    throw new Error(`marketplace_music_commerce_concern_not_owned:${concern}`)
  }
}
