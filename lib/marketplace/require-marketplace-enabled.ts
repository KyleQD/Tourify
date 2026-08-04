/**
 * Marketplace feature-flag guards for API routes and server actions.
 *
 * Usage in a route handler:
 *   const guard = requireMarketplaceEnabled()
 *   if (guard) return guard
 *
 * Or for the public discovery route:
 *   const guard = requirePublicDiscoveryEnabled()
 *   if (guard) return guard
 *
 * Returns a NextResponse when the flag is off (503 for disabled, 403 for
 * account-type restriction), or null when the caller should proceed.
 */

import { NextResponse } from 'next/server'
import {
  isMarketplaceEnabled,
  isPublicDiscoveryEnabled,
  isNativeGoodsEnabled,
  isServicesEnabled,
  isExternalListingsEnabled,
  isGuestCheckoutEnabled,
  isMarketplaceEnabledForAccountType,
} from '@/lib/marketplace/feature-flags'

/** Disabled response body shared across all guards */
function disabledResponse(message: string, status: 503 | 403 = 503): NextResponse {
  return NextResponse.json(
    { error: { code: 'marketplace_disabled', message } },
    { status }
  )
}

/**
 * Guards any marketplace seller or buyer route behind the global kill-switch.
 * Returns a 503 NextResponse when disabled; null when the route should proceed.
 */
export function requireMarketplaceEnabled(): NextResponse | null {
  if (!isMarketplaceEnabled()) {
    return disabledResponse('The marketplace is not currently available.')
  }
  return null
}

/**
 * Guards the public discovery/hub route.
 * Checks the global flag AND the public discovery flag.
 * Returns a 503 NextResponse when disabled; null when the route should proceed.
 */
export function requirePublicDiscoveryEnabled(): NextResponse | null {
  if (!isMarketplaceEnabled()) {
    return disabledResponse('The marketplace is not currently available.')
  }
  if (!isPublicDiscoveryEnabled()) {
    return disabledResponse('Marketplace discovery is not currently available.')
  }
  return null
}

/**
 * Guards native goods listing creation/purchase routes.
 * Returns a 503 NextResponse when disabled; null when the route should proceed.
 */
export function requireNativeGoodsEnabled(): NextResponse | null {
  const global = requireMarketplaceEnabled()
  if (global) return global
  if (!isNativeGoodsEnabled()) {
    return disabledResponse('Native goods listings are not currently available.')
  }
  return null
}

/**
 * Guards service listing creation/request routes.
 * Returns a 503 NextResponse when disabled; null when the route should proceed.
 */
export function requireServicesEnabled(): NextResponse | null {
  const global = requireMarketplaceEnabled()
  if (global) return global
  if (!isServicesEnabled()) {
    return disabledResponse('Service listings are not currently available.')
  }
  return null
}

/**
 * Guards external listing creation/redirect routes.
 * Returns a 503 NextResponse when disabled; null when the route should proceed.
 */
export function requireExternalListingsEnabled(): NextResponse | null {
  const global = requireMarketplaceEnabled()
  if (global) return global
  if (!isExternalListingsEnabled()) {
    return disabledResponse('External listings are not currently available.')
  }
  return null
}

/**
 * Guards guest checkout entry points.
 * Returns a 503 NextResponse when disabled; null when the route should proceed.
 */
export function requireGuestCheckoutEnabled(): NextResponse | null {
  const global = requireMarketplaceEnabled()
  if (global) return global
  if (!isGuestCheckoutEnabled()) {
    return disabledResponse('Guest checkout is not currently available. Please sign in to purchase.')
  }
  return null
}

/**
 * Guards any marketplace route behind both the global flag and an account-type
 * specific flag. Returns a 403 NextResponse when the account type is disabled;
 * 503 when the global marketplace is disabled; null when the route should proceed.
 *
 * @param accountType  Server-resolved account type (from resolveActingContext)
 */
export function requireMarketplaceEnabledForAccount(accountType: string): NextResponse | null {
  if (!isMarketplaceEnabled()) {
    return disabledResponse('The marketplace is not currently available.')
  }
  if (!isMarketplaceEnabledForAccountType(accountType)) {
    return disabledResponse(
      `The marketplace is not currently available for ${accountType} accounts.`,
      403
    )
  }
  return null
}
