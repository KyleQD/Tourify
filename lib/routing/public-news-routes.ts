/**
 * Explicit allowlist of anonymous News pages.
 *
 * Never make all /news/* paths public: future authoring/review surfaces
 * must remain protected until deliberately added to this list.
 */
const PUBLIC_NEWS_SECTIONS = new Set([
  'latest',
  'trending',
  'community',
  'music',
  'events',
  'industry',
  'editorial',
  'local',
  'global',
  'gossip',
  'featured'
])

const PUBLIC_NEWS_DETAIL_ROUTES = new Set([
  'story',
  'topic',
  'author',
  'source'
])

export function isPublicNewsRoute(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean)

  if (segments[0] !== 'news') return false
  if (segments.length === 1) return true

  if (segments.length === 2) {
    return PUBLIC_NEWS_SECTIONS.has(segments[1])
  }

  if (segments.length === 3) {
    return PUBLIC_NEWS_DETAIL_ROUTES.has(segments[1]) &&
      segments[2] !== '.' && segments[2] !== '..'
  }

  return false
}
