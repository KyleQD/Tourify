import type { NewsFeedItem, NewsSortMode } from '@/lib/news/types'

interface TimelineCacheEntry {
  items: NewsFeedItem[]
  nextCursor: string | null
  expiresAt: number
}

const TIMELINE_CACHE = new Map<string, TimelineCacheEntry>()
const TIMELINE_CACHE_TTL_MS = 3 * 60 * 1000

function getCacheKey(params: {
  userId?: string
  facet: string
  category?: string
  query?: string
  sort?: NewsSortMode
}): string {
  const userKey = params.userId || 'anonymous'
  const categoryKey = params.category || 'none'
  const queryKey = params.query?.trim().toLowerCase() || 'none'
  const sortKey = params.sort || 'score'
  return `${userKey}:${params.facet}:${categoryKey}:${queryKey}:${sortKey}`
}

export function getCachedTimeline(params: {
  userId?: string
  facet: string
  category?: string
  query?: string
  sort?: NewsSortMode
}) {
  const key = getCacheKey(params)
  const cached = TIMELINE_CACHE.get(key)
  if (!cached) return null
  if (Date.now() > cached.expiresAt) {
    TIMELINE_CACHE.delete(key)
    return null
  }
  return cached
}

export function setCachedTimeline(params: {
  userId?: string
  facet: string
  category?: string
  query?: string
  sort?: NewsSortMode
  items: NewsFeedItem[]
  nextCursor: string | null
}) {
  const key = getCacheKey(params)
  TIMELINE_CACHE.set(key, {
    items: params.items,
    nextCursor: params.nextCursor,
    expiresAt: Date.now() + TIMELINE_CACHE_TTL_MS
  })
}
