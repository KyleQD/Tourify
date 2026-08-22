import { getVenueAccountAppSegments } from "@/lib/venue/route-registry"

export function normalizeVenueSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

/**
 * Authenticated venue-account app routes under `/venue/*` — not public profile slugs.
 *
 * INVARIANT: Every first-level path segment of an authenticated venue app page MUST be
 * registered in lib/venue/route-registry.ts. Any segment NOT in that registry will be
 * treated as a legacy public venue profile slug and hard-redirected to /venues/[segment]
 * by getLegacyVenueProfileRedirect().
 *
 * The reserved segment set is DERIVED from the canonical route registry (VEN-005/VEN-298):
 * nav routes + non-nav account surfaces. Do not add literals here; register the route.
 */
let cachedSegments: Set<string> | null = null

function venueAccountAppSegments(): Set<string> {
  if (!cachedSegments) {
    cachedSegments = getVenueAccountAppSegments()
  }
  return cachedSegments
}

export function isVenueAccountSegment(segment: string): boolean {
  return venueAccountAppSegments().has(segment.toLowerCase())
}

export function getLegacyVenueProfileRedirect(pathname: string) {
  const match = pathname.match(/^\/venue\/([^/]+)$/)
  if (!match?.[1]) return null
  if (isVenueAccountSegment(match[1])) return null
  return `/venues/${match[1]}`
}
