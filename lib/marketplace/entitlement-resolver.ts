/**
 * Server-side marketplace entitlement resolver.
 *
 * Single source of truth for what each account type can do in the marketplace.
 * Must only be imported from server code (API routes, server actions).
 * Never trust client-supplied account types for authorization — always resolve
 * the acting context server-side first (lib/auth/acting-context.ts).
 *
 * Rules sourced from:
 *   docs/marketplace-build/tourify-marketplace-handoff/01-product-requirements.md §4
 */

import { isOrganizationType, normalizeAccountType } from '@/lib/accounts/account-types'

export type ListingKind = 'physical' | 'service' | 'external'
export type ServiceMode = 'fixed_price' | 'booking_request' | 'quote_request'

export interface MarketplaceEntitlements {
  /** Physical goods listings (merch, prints, equipment sold as goods, etc.) */
  canSellPhysicalGoods: boolean
  /**
   * Service listings (fixed-price, booking-request, or quote-request).
   * Services surface on the seller's storefront/profile only — never in jobs/staffing.
   */
  canSellServices: boolean
  /** External link listings (off-platform redirect to provider checkout) */
  canCreateExternalListings: boolean
  /** Organization-only: manage/surface existing ticket records from the ticket domain */
  canManageTicketCollection: boolean
  /** All account types may share listings and storefronts to the feed */
  canShareToFeed: boolean
  /** All account types may activate a storefront (org is ticket-only) */
  canActivateStorefront: boolean
  /** Listing kinds this account type may create */
  permittedListingKinds: ListingKind[]
  /** Service modes this account type may use (empty for org) */
  permittedServiceModes: ServiceMode[]
  /** Organization storefronts are limited to ticket collections */
  isTicketOnlyStorefront: boolean
  /**
   * Music is never a marketplace category for any account type.
   * Artist music remains in the existing music-player/distribution ecosystem.
   */
  musicCategoryBlocked: true
}

const ALL_SERVICE_MODES: ServiceMode[] = ['fixed_price', 'booking_request', 'quote_request']

/** Entitlements for general (personal) accounts */
const GENERAL_ENTITLEMENTS: MarketplaceEntitlements = {
  canSellPhysicalGoods: true,
  canSellServices: true,
  canCreateExternalListings: true,
  canManageTicketCollection: false,
  canShareToFeed: true,
  canActivateStorefront: true,
  permittedListingKinds: ['physical', 'service', 'external'],
  permittedServiceModes: ALL_SERVICE_MODES,
  isTicketOnlyStorefront: false,
  musicCategoryBlocked: true,
}

/** Entitlements for artist / service-provider accounts */
const ARTIST_ENTITLEMENTS: MarketplaceEntitlements = {
  canSellPhysicalGoods: true,   // merch, prints, accessories
  canSellServices: true,        // appearances, workshops, custom work — NOT music sales
  canCreateExternalListings: true,
  canManageTicketCollection: false,
  canShareToFeed: true,
  canActivateStorefront: true,
  permittedListingKinds: ['physical', 'service', 'external'],
  permittedServiceModes: ALL_SERVICE_MODES,
  isTicketOnlyStorefront: false,
  musicCategoryBlocked: true,   // Music routes to music-player ecosystem, not marketplace
}

/** Entitlements for venue accounts */
const VENUE_ENTITLEMENTS: MarketplaceEntitlements = {
  canSellPhysicalGoods: true,   // branded merch, rental accessories sold as goods
  canSellServices: true,        // room rental, rehearsal space, production packages
  canCreateExternalListings: true,
  canManageTicketCollection: false,
  canShareToFeed: true,
  canActivateStorefront: true,
  permittedListingKinds: ['physical', 'service', 'external'],
  permittedServiceModes: ALL_SERVICE_MODES,
  isTicketOnlyStorefront: false,
  musicCategoryBlocked: true,
}

/** Entitlements for organization accounts (ticket-only storefront) */
const ORGANIZATION_ENTITLEMENTS: MarketplaceEntitlements = {
  canSellPhysicalGoods: false,
  canSellServices: false,
  canCreateExternalListings: false,
  canManageTicketCollection: true,
  canShareToFeed: true,           // can share tickets and storefront to feed
  canActivateStorefront: true,    // ticket-only storefront
  permittedListingKinds: [],      // no native listing creation
  permittedServiceModes: [],
  isTicketOnlyStorefront: true,
  musicCategoryBlocked: true,
}

/**
 * Resolve marketplace entitlements for the given account type.
 * Always call this with a server-resolved account type (from resolveActingContext),
 * never with a value from client query params or request body.
 */
export function resolveMarketplaceEntitlements(
  accountType: string | null | undefined
): MarketplaceEntitlements {
  const normalized = normalizeAccountType(accountType)

  if (isOrganizationType(normalized)) return ORGANIZATION_ENTITLEMENTS
  if (normalized === 'artist' || normalized === 'service') return ARTIST_ENTITLEMENTS
  if (normalized === 'venue') return VENUE_ENTITLEMENTS

  // 'general' and any unknown type fall through to general entitlements
  return GENERAL_ENTITLEMENTS
}

/**
 * Assert a specific entitlement capability is permitted.
 * Throws a structured error if it is not — callers should catch and return 403.
 */
export function assertMarketplaceEntitlement(
  entitlements: MarketplaceEntitlements,
  capability: keyof Pick<
    MarketplaceEntitlements,
    | 'canSellPhysicalGoods'
    | 'canSellServices'
    | 'canCreateExternalListings'
    | 'canManageTicketCollection'
    | 'canShareToFeed'
    | 'canActivateStorefront'
  >
): void {
  if (!entitlements[capability]) {
    const messages: Record<string, string> = {
      canSellPhysicalGoods:
        'Organizations may only manage ticket collections. Physical goods are not permitted.',
      canSellServices:
        'Organizations may only manage ticket collections. Service listings are not permitted.',
      canCreateExternalListings:
        'Organizations may only manage ticket collections. External listings are not permitted.',
      canManageTicketCollection:
        'Only organization accounts may manage ticket collections.',
      canShareToFeed:
        'This account type is not permitted to share to the feed.',
      canActivateStorefront:
        'This account type is not permitted to activate a storefront.',
    }
    const error = new Error(messages[capability] ?? `Permission denied: ${capability}`)
    ;(error as Error & { code: string }).code = 'marketplace_entitlement_denied'
    throw error
  }
}

/**
 * Check whether a listing kind is permitted for the given entitlements.
 */
export function isListingKindPermitted(
  entitlements: MarketplaceEntitlements,
  kind: ListingKind
): boolean {
  return entitlements.permittedListingKinds.includes(kind)
}

/**
 * Check whether a service mode is permitted for the given entitlements.
 */
export function isServiceModePermitted(
  entitlements: MarketplaceEntitlements,
  mode: ServiceMode
): boolean {
  return entitlements.permittedServiceModes.includes(mode)
}
