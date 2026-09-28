/**
 * Feature flags for the Tourify Marketplace.
 *
 * All flags default to false/off — the marketplace is invisible until explicitly
 * enabled. Use NEXT_PUBLIC_* variants only for values that must be visible in
 * browser bundles; use server-only FEATURE_MARKETPLACE_* vars for everything else.
 *
 * Env-var reading pattern mirrors lib/ticketing/feature-flag.ts:
 *   "1" | "true" | "on" → true; everything else (including empty) → false.
 */

import { isOrganizationType } from '@/lib/accounts/account-types'

function readBoolEnv(...keys: string[]): boolean {
  for (const key of keys) {
    const raw = (process.env[key] ?? '').toLowerCase().trim()
    if (raw === '1' || raw === 'true' || raw === 'on') return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Global kill-switch
// ---------------------------------------------------------------------------

/** Master on/off switch. All marketplace routes check this first. */
export function isMarketplaceEnabled(): boolean {
  return readBoolEnv('FEATURE_MARKETPLACE', 'NEXT_PUBLIC_FEATURE_MARKETPLACE')
}

// ---------------------------------------------------------------------------
// Feature-area flags
// ---------------------------------------------------------------------------

/**
 * Public discovery hub (`/marketplace`). Separate from the global switch so
 * read-only browsing can be toggled independently of selling.
 */
export function isPublicDiscoveryEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_PUBLIC_DISCOVERY',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_PUBLIC_DISCOVERY'
  )
}

/** Physical goods listings (merch, prints, etc.) */
export function isNativeGoodsEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_NATIVE_GOODS',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_NATIVE_GOODS'
  )
}

/** Service listings (fixed-price, booking-request, quote-request) */
export function isServicesEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_SERVICES',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_SERVICES'
  )
}

/** External link listings (off-platform redirect) */
export function isExternalListingsEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_EXTERNAL_LISTINGS',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_EXTERNAL_LISTINGS'
  )
}

/** Guest (unauthenticated) checkout path */
export function isGuestCheckoutEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_GUEST_CHECKOUT',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_GUEST_CHECKOUT'
  )
}

/** Feed commerce — share listings to posts */
export function isFeedCommerceEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_FEED_COMMERCE',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_FEED_COMMERCE'
  )
}

/** Organization ticket-collection view in the marketplace hub */
export function isOrganizationTicketsEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_ORGANIZATION_TICKETS',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_ORGANIZATION_TICKETS'
  )
}

// ---------------------------------------------------------------------------
// Per-account-type flags
// ---------------------------------------------------------------------------

/** Marketplace access for general (personal) accounts */
export function isMarketplaceGeneralEnabled(): boolean {
  return readBoolEnv('FEATURE_MARKETPLACE_GENERAL', 'NEXT_PUBLIC_FEATURE_MARKETPLACE_GENERAL')
}

/** Marketplace access for artist accounts */
export function isMarketplaceArtistEnabled(): boolean {
  return readBoolEnv('FEATURE_MARKETPLACE_ARTIST', 'NEXT_PUBLIC_FEATURE_MARKETPLACE_ARTIST')
}

/** Marketplace access for venue accounts */
export function isMarketplaceVenueEnabled(): boolean {
  return readBoolEnv('FEATURE_MARKETPLACE_VENUE', 'NEXT_PUBLIC_FEATURE_MARKETPLACE_VENUE')
}

/** Marketplace access for organization accounts */
export function isMarketplaceOrganizationEnabled(): boolean {
  return readBoolEnv(
    'FEATURE_MARKETPLACE_ORGANIZATION',
    'NEXT_PUBLIC_FEATURE_MARKETPLACE_ORGANIZATION'
  )
}

/**
 * Returns true when the marketplace is enabled for the given account type.
 * Checks both the global flag and the per-account-type flag.
 * If no accountType is provided, returns the global flag only.
 */
export function isMarketplaceEnabledForAccountType(accountType?: string): boolean {
  if (!isMarketplaceEnabled()) return false
  if (!accountType) return true

  if (isOrganizationType(accountType)) return isMarketplaceOrganizationEnabled()
  if (accountType === 'artist' || accountType === 'service') return isMarketplaceArtistEnabled()
  if (accountType === 'venue') return isMarketplaceVenueEnabled()
  // 'general' and any unrecognized type fall through to the general flag
  return isMarketplaceGeneralEnabled()
}

// ---------------------------------------------------------------------------
// Legacy / existing flags (preserved for backwards compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use `isNativeGoodsEnabled` for new code. Legacy merch analytics flag. */
export function isMarketplaceMerchAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MARKETPLACE_MERCH_ANALYTICS === '1'
}
