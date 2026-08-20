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
    'overview',
    'page',
    'press',
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

function isMusicVerifyRoute(segments: string[]): boolean {
  // /music/verify/{passport|certificate|origin}/[publicId]
  if (segments.length !== 4) return false
  if (segments[0] !== 'music' || segments[1] !== 'verify') return false
  const kind = segments[2]?.toLowerCase()
  if (!['passport', 'certificate', 'origin'].includes(kind)) return false
  return isSafeDynamicSegment(segments[3])
}

function isPublicPostRoute(segments: string[]): boolean {
  // /posts/[id]
  if (segments.length !== 2) return false
  if (segments[0] !== 'posts') return false
  return isSafeDynamicSegment(segments[1]) || isLikelyUuidPathSegment(segments[1])
}

function isPublicationShareRoute(segments: string[]): boolean {
  // PUB-206 — /p/[token]
  if (segments.length !== 2) return false
  if (segments[0] !== 'p') return false
  return isSafeDynamicSegment(segments[1])
}

function isPromoterTrackingRoute(segments: string[]): boolean {
  // Publication shares retain /p/[token]. Promoter redirects use a dedicated
  // route namespace so the two public surfaces cannot conflict.
  if (segments.length !== 2) return false
  if (segments[0] !== 'r') return false
  return /^[A-Za-z0-9_-]{43}$/.test(segments[1])
}

export function isPublicShareRoute(pathname: string): boolean {
  const segments = getPathSegments(pathname)
  if (
    isMusicVerifyRoute(segments) ||
    isPublicPostRoute(segments) ||
    isPublicationShareRoute(segments) ||
    isPromoterTrackingRoute(segments)
  ) {
    return true
  }

  const [root, slug, ...rest] = segments
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
