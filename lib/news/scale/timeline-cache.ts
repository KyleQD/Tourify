import type { NewsFeedItem } from '@/lib/news/types'

interface TimelineCacheEntry {
  items: NewsFeedItem[]
  nextCursor: string | null
  expiresAt: number
}

const TIMELINE_CACHE = new Map<string, TimelineCacheEntry>()
const TIMELINE_CACHE_TTL_MS = 60 * 1000

function getCacheKey(params: { userId?: string; facet: string; query?: string }): string {
  const userKey = params.userId || 'anonymous'
  const queryKey = params.query?.trim().toLowerCase() || 'none'
  return `${userKey}:${params.facet}:${queryKey}`
}

export function getCachedTimeline(params: { userId?: string; facet: string; query?: string }) {
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
  query?: string
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
