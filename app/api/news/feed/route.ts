import { NextRequest, NextResponse } from 'next/server'

import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { buildNewsFeed } from '@/lib/news/feed-service'
import { getCachedTimeline, setCachedTimeline } from '@/lib/news/scale/timeline-cache'
import { trackNewsFeedServed } from '@/lib/news/telemetry'
import { createClient } from '@/lib/supabase/server'
import type { NewsCategory, NewsSortMode } from '@/lib/news/types'

function normalizeFacet(input: string | null) {
  if (input === 'following') return 'following'
  if (input === 'local') return 'local'
  if (input === 'industry') return 'industry'
  if (input === 'gossip') return 'gossip'
  if (input === 'verified') return 'verified'
  return 'top'
}

function normalizeCategory(input: string | null): NewsCategory | undefined {
  if (input === 'featured') return 'featured'
  if (input === 'articles') return 'articles'
  if (input === 'new-music') return 'new-music'
  if (input === 'events') return 'events'
  if (input === 'gossip') return 'gossip'
  if (input === 'editorial') return 'editorial'
  if (input === 'global') return 'global'
  return undefined
}

function normalizeSort(input: string | null): NewsSortMode {
  if (input === 'engagement') return 'engagement'
  if (input === 'recent') return 'recent'
  return 'score'
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const { searchParams } = request.nextUrl
  const rawLimit = Number(searchParams.get('limit') || '20')
  const limit = Number.isFinite(rawLimit) ? rawLimit : 20
  const facet = normalizeFacet(searchParams.get('facet'))
  const category = normalizeCategory(searchParams.get('category'))
  const sort = normalizeSort(searchParams.get('sort'))
  const cursor = searchParams.get('cursor') || undefined
  const query = searchParams.get('query') || undefined

  try {
    const authResult = await authenticateApiRequest(request)
    const supabase = authResult?.supabase || (await createClient())
    const userId = authResult?.user?.id
    const shouldReadCache = !cursor

    let cacheHit = false
    if (shouldReadCache) {
      const cached = getCachedTimeline({ userId, facet, category, query, sort })
      if (cached && cached.items.length > 0) {
        cacheHit = true
        trackNewsFeedServed({
          facet,
          category,
          userId,
          itemCount: cached.items.length,
          latencyMs: Date.now() - startedAt,
          cacheHit
        })

        return NextResponse.json({
          success: true,
          items: cached.items,
          nextCursor: cached.nextCursor,
          meta: {
            facet,
            category,
            sort,
            sourceBreakdown: {},
            cache: 'hit'
          }
        })
      }
    }

    const result = await buildNewsFeed({
      requestOrigin: request.nextUrl.origin,
      supabase,
      userId,
      limit,
      cursor,
      facet,
      category,
      query,
      sort
    })

    if (shouldReadCache && result.items.length > 0) {
      setCachedTimeline({
        userId,
        facet,
        category,
        query,
        sort,
        items: result.items,
        nextCursor: result.nextCursor
      })
    }

    trackNewsFeedServed({
      facet,
      category,
      userId,
      itemCount: result.items.length,
      latencyMs: Date.now() - startedAt,
      cacheHit
    })

    return NextResponse.json({
      success: true,
      items: result.items,
      nextCursor: result.nextCursor,
      meta: {
        facet,
        category,
        sort,
        sourceBreakdown: result.sourceBreakdown,
        cache: cacheHit ? 'hit' : 'miss'
      }
    })
  } catch (error) {
    console.error('[NewsFeedAPI] Failed to serve feed', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load news feed',
        items: [],
        nextCursor: null
      },
      { status: 500 }
    )
  }
}
