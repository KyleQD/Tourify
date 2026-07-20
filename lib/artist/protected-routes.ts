/**
 * Artist app surfaces that require an artist profile or artist/service account_type.
 * Public handles live at /artist/[handle] and must stay outside this set.
 * Middleware grants access when artist_profiles exists OR accountTypeMatchesSection(..., 'artist')
 * (artist | service) — see lib/navigation/account-dashboard-routes.ts.
 */

const ARTIST_APP_SEGMENTS = new Set([
  'dashboard',
  'feed',
  'music',
  'content',
  'press',
  'events',
  'bookings',
  'profile',
  'settings',
  'business',
  'community',
  'features',
  'epk',
  'store',
  'tickets',
  'merchandise',
  'overview',
  'messages',
  'jobs',
  'collaborations',
  'network',
  'debug',
])

export function pathnameRequiresArtistAccount(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '').replace(/\/$/, '') || '/'
  if (path === '/artist') return true
  const match = path.match(/^\/artist\/([^/]+)/)
  if (!match) return false
  return ARTIST_APP_SEGMENTS.has(match[1])
}
