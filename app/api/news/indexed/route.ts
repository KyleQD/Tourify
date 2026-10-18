import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decodeNewsIndexCursor, encodeNewsIndexCursor } from '@/lib/news/index/cursor'
import type { IndexedNewsItem } from '@/lib/news/index/contracts'

const PUBLIC_FIELDS = [
  'id', 'origin_type', 'source_name', 'headline', 'excerpt',
  'canonical_url', 'image_url', 'topics', 'story_id', 'published_at'
].join(',')

/**
 * Additive, OFF-BY-DEFAULT endpoint for the persistent News index.
 *
 * Reads with the request's Supabase client (including anon role) so RLS
 * enforces public publication status even if caller forgets UI filters.
 * Never use service_role for anonymous reads.
 */
export async function GET(request: NextRequest) {
  if (process.env.NEWS_INDEXED_READ_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 })
  }

  const rawLimit = request.nextUrl.searchParams.get('limit') || '20'
  if (!/^\d{1,3}$/.test(rawLimit)) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 })
  }
  const limit = Math.min(50, Math.max(1, Number(rawLimit)))
  const encoded = request.nextUrl.searchParams.get('cursor')
  const cursor = decodeNewsIndexCursor(encoded)
  if (encoded && !cursor) {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    let query = supabase
      .from('news_items')
      .select(PUBLIC_FIELDS)
      .eq('publication_state', 'published')
      .eq('visibility', 'public')
      .eq('moderation_state', 'approved')
      .in('rights_state', ['link_only', 'licensed'])
      .order('published_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      // Both cursor fields are strictly validated before being interpolated.
      query = query.or(
        `published_at.lt.${cursor.publishedAt},and(published_at.eq.${cursor.publishedAt},id.lt.${cursor.id})`
      )
    }

    const { data, error } = await query
    if (error) {
      console.error('[IndexedNews] Could not query published index', { code: error.code })
      return NextResponse.json({ error: 'News index unavailable' }, { status: 503 })
    }

    const rows = (data || []) as unknown as IndexedNewsItem[]
    const page = rows.slice(0, limit)
    const last = page.at(-1)
    const hasMore = rows.length > limit

    return NextResponse.json({
      items: page,
      nextCursor: hasMore && last
        ? encodeNewsIndexCursor({ id: last.id, publishedAt: last.published_at })
        : null
    }, {
      headers: { 'Cache-Control': 'private, no-store' }
    })
  } catch (error) {
    console.error('[IndexedNews] Could not serve index', error)
    return NextResponse.json({ error: 'News index unavailable' }, { status: 503 })
  }
}
