/**
 * Artist app surfaces that require an artist profile or artist account_type.
 * Public handles live at /artist/[handle] and must stay outside this set.
 */

const ARTIST_APP_SEGMENTS = new Set([
  'dashboard',
  'feed',
  'music',
  'content',
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
])

export function pathnameRequiresArtistAccount(pathname: string): boolean {
  const path = (pathname.split('?')[0] || '').replace(/\/$/, '') || '/'
  if (path === '/artist') return true
  const match = path.match(/^\/artist\/([^/]+)/)
  if (!match) return false
  return ARTIST_APP_SEGMENTS.has(match[1])
}
