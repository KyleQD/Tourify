export function normalizeVenueSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

/**
 * Authenticated venue-account app routes under `/venue/*` — not public profile slugs.
 *
 * INVARIANT: Every first-level path segment of an authenticated venue app page MUST be
 * listed here. Any segment NOT in this set will be treated as a legacy public venue profile
 * slug and hard-redirected to /venues/[segment] by getLegacyVenueProfileRedirect().
 *
 * When you add a new `app/venue/[segment]/` directory, add the segment name here too.
 */
const VENUE_ACCOUNT_APP_SEGMENTS = new Set([
  "dashboard",
  "staff",
  "events",
  "analytics",
  "edit",
  "equipment",
  "finances",
  "manage-event",
  "assets",
  "bookings",
  "calendar",
  "documents",
  "network",
  "promotions",
  "store",
  "tickets",
  "gallery",
  "settings",
  // These were missing — omitting them caused /venue/[segment] to redirect to /venues/[segment],
  // which the browser interpreted as a file download.
  "messages",
  "overview",
  "teams",
])

export function getLegacyVenueProfileRedirect(pathname: string) {
  const match = pathname.match(/^\/venue\/([^/]+)$/)
  if (!match?.[1]) return null
  if (VENUE_ACCOUNT_APP_SEGMENTS.has(match[1].toLowerCase())) return null
  return `/venues/${match[1]}`
}
