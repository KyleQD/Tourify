import { NextRequest, NextResponse } from 'next/server'

import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { buildNewsFeed } from '@/lib/news/feed-service'
import { createClient } from '@/lib/supabase/server'

function normalizeFacetFromLegacyParams(type: string | null, sortBy: string | null) {
  if (type === 'forum') return 'gossip'
  if (sortBy === 'following') return 'following'
  if (sortBy === 'local') return 'local'
  if (sortBy === 'trending') return 'top'
  return 'top'
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    const supabase = authResult?.supabase || (await createClient())
    const { searchParams } = request.nextUrl
    const rawLimit = Number(searchParams.get('limit') || '20')
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20
    const type = searchParams.get('type')
    const sortBy = searchParams.get('sortBy')
    const query = searchParams.get('query') || undefined

    const result = await buildNewsFeed({
      requestOrigin: request.nextUrl.origin,
      supabase,
      userId: authResult?.user?.id,
      limit,
      cursor: undefined,
      query,
      facet: normalizeFacetFromLegacyParams(type, sortBy)
    })

    const content = result.items.map(item => ({
      id: item.id,
      type: 'news',
      title: item.title,
      description: item.summary,
      author: item.author
        ? {
            id: item.author.id,
            name: item.author.name,
            username: item.author.username || item.author.name.toLowerCase().replace(/\s+/g, ''),
            avatar_url: item.author.avatarUrl,
            is_verified: item.author.isVerified || false
          }
        : undefined,
      cover_image: item.imageUrl,
      created_at: item.publishedAt,
      engagement: item.metrics,
      metadata: {
        url: item.url,
        tags: item.topics,
        trust_label: item.moderation.trustLabel,
        confidence: item.moderation.confidence
      },
      relevance_score: item.relevanceScore
    }))

    return NextResponse.json({
      success: true,
      content,
      nextCursor: result.nextCursor
    })
  } catch (error) {
    console.error('[News Feed Compatibility API] Request failed', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load feed content', content: [] },
      { status: 500 }
    )
  }
}