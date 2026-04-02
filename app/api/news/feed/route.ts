import { NextRequest, NextResponse } from 'next/server'

import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { buildNewsFeed } from '@/lib/news/feed-service'
import { getCachedTimeline, setCachedTimeline } from '@/lib/news/scale/timeline-cache'
import { trackNewsFeedServed } from '@/lib/news/telemetry'
import { createClient } from '@/lib/supabase/server'

function normalizeFacet(input: string | null) {
  if (input === 'following') return 'following'
  if (input === 'local') return 'local'
  if (input === 'industry') return 'industry'
  if (input === 'gossip') return 'gossip'
  if (input === 'verified') return 'verified'
  return 'top'
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const { searchParams } = request.nextUrl
  const rawLimit = Number(searchParams.get('limit') || '20')
  const limit = Number.isFinite(rawLimit) ? rawLimit : 20
  const facet = normalizeFacet(searchParams.get('facet'))
  const cursor = searchParams.get('cursor') || undefined
  const query = searchParams.get('query') || undefined

  try {
    const authResult = await authenticateApiRequest(request)
    const supabase = authResult?.supabase || (await createClient())
    const userId = authResult?.user?.id
    const shouldReadCache = !cursor

    let cacheHit = false
    if (shouldReadCache) {
      const cached = getCachedTimeline({ userId, facet, query })
      if (cached && cached.items.length > 0) {
        cacheHit = true
        trackNewsFeedServed({
          facet,
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
      query
    })

    if (shouldReadCache && result.items.length > 0) {
      setCachedTimeline({
        userId,
        facet,
        query,
        items: result.items,
        nextCursor: result.nextCursor
      })
    }

    trackNewsFeedServed({
      facet,
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
