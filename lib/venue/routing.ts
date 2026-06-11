export function normalizeVenueSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

/** Authenticated venue-account app routes under `/venue/*` — not public profile slugs. */
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
])

export function getLegacyVenueProfileRedirect(pathname: string) {
  const match = pathname.match(/^\/venue\/([^/]+)$/)
  if (!match?.[1]) return null
  if (VENUE_ACCOUNT_APP_SEGMENTS.has(match[1].toLowerCase())) return null
  return `/venues/${match[1]}`
}
