const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const RESERVED_PUBLIC_SHARE_SEGMENTS: Record<string, Set<string>> = {
  artist: new Set([
    'bookings',
    'business',
    'collaborations',
    'community',
    'content',
    'dashboard',
    'debug',
    'epk',
    'events',
    'feed',
    'features',
    'jobs',
    'merchandise',
    'messages',
    'music',
    'network',
    'page',
    'profile',
    'settings',
    'store',
    'tickets',
  ]),
  events: new Set(['create', 'new']),
  jobs: new Set(['my-applications', 'new']),
  profile: new Set(['edit', 'layout', 'settings']),
}

function getPathSegments(pathname: string) {
  return pathname
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .filter(Boolean)
}

function isSafeDynamicSegment(segment: string) {
  const decoded = decodeURIComponent(segment).trim()
  if (!decoded || decoded === '.' || decoded === '..') return false
  return !decoded.includes('/')
}

function isReservedSegment(root: string, segment: string) {
  return RESERVED_PUBLIC_SHARE_SEGMENTS[root]?.has(segment.toLowerCase()) ?? false
}

export function isPublicShareRoute(pathname: string): boolean {
  const [root, slug, ...rest] = getPathSegments(pathname)
  if (!root || !slug || rest.length > 0) return false
  if (!isSafeDynamicSegment(slug) || isReservedSegment(root, slug)) return false

  switch (root) {
    case 'artist':
    case 'epk':
    case 'events':
    case 'jobs':
    case 'organization':
    case 'profile':
    case 'venues':
      return true
    default:
      return false
  }
}

export function isLikelyUuidPathSegment(segment: string): boolean {
  return UUID_PATTERN.test(segment)
}
