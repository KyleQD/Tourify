import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 120) || `pulse-article-${Date.now()}`
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = request.nextUrl
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '12')))
    const cursor = searchParams.get('cursor')

    let query = supabase
      .from('artist_blog_posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        content,
        featured_image_url,
        tags,
        categories,
        stats,
        published_at,
        created_at,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      query = query.lt('published_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      console.error('[PulseArticles] Query error:', error)
      return NextResponse.json({ success: false, error: 'Failed to load articles' }, { status: 500 })
    }

    const rows = data || []
    const hasMore = rows.length > limit
    const pageRows = rows.slice(0, limit)
    const nextCursor = hasMore && pageRows.length > 0
      ? pageRows[pageRows.length - 1].published_at
      : null

    const articles = pageRows.map(row => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      const stats = (row.stats && typeof row.stats === 'object') ? row.stats as Record<string, number> : {}

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt || (row.content ? row.content.slice(0, 200) : ''),
        featuredImageUrl: row.featured_image_url || null,
        tags: row.tags || [],
        categories: row.categories || [],
        publishedAt: row.published_at || row.created_at,
        author: {
          id: profile?.id || row.user_id,
          name: profile?.full_name || profile?.username || 'Community Member',
          username: profile?.username || null,
          avatarUrl: profile?.avatar_url || null,
          isVerified: profile?.is_verified || false,
        },
        metrics: {
          likes: stats.likes || 0,
          comments: stats.comments || 0,
          shares: stats.shares || 0,
          views: stats.views || 0,
        },
        readingTime: Math.max(1, Math.ceil((row.content?.length || 0) / 1200)),
      }
    })

    return NextResponse.json({ success: true, articles, nextCursor })
  } catch (error) {
    console.error('[PulseArticles] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie')
  const user = parseUserFromRequestCookieHeader(cookieHeader)

  if (!user?.id) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, content, excerpt, tags, categories, featuredImageUrl } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 })
    }

    if (title.trim().length < 5) {
      return NextResponse.json({ success: false, error: 'Title must be at least 5 characters' }, { status: 400 })
    }

    if (content.trim().length < 50) {
      return NextResponse.json({ success: false, error: 'Content must be at least 50 characters' }, { status: 400 })
    }

    const slug = generateSlug(title.trim())
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('artist_blog_posts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        slug: `${slug}-${Date.now().toString(36)}`,
        content: content.trim(),
        excerpt: excerpt?.trim() || content.trim().slice(0, 200),
        featured_image_url: featuredImageUrl || null,
        tags: Array.isArray(tags) ? tags.filter(Boolean).slice(0, 10) : [],
        categories: Array.isArray(categories) ? categories.filter(Boolean).slice(0, 5) : ['Community'],
        status: 'published',
        published_at: new Date().toISOString(),
        stats: { likes: 0, comments: 0, shares: 0, views: 0 },
      })
      .select('id, slug')
      .single()

    if (error) {
      console.error('[PulseArticles] Insert error:', error)
      return NextResponse.json({ success: false, error: 'Failed to publish article' }, { status: 500 })
    }

    // Also create a feed post so the article appears in followers' feeds
    const articleUrl = `/blog/${data.slug}`
    const postContent = `📝 New article: ${title.trim()}\n\n${(excerpt?.trim() || content.trim().slice(0, 180))}...\n\nRead more: ${articleUrl}`
    const hashtags = (Array.isArray(tags) ? tags.slice(0, 5) : []).map(t =>
      t.startsWith('#') ? t : `#${t.replace(/\s+/g, '')}`
    )

    await supabase.from('posts').insert({
      user_id: user.id,
      content: postContent,
      type: 'article',
      visibility: 'public',
      hashtags,
      media_urls: featuredImageUrl ? [featuredImageUrl] : [],
    }).then(({ error: postError }) => {
      if (postError) console.error('[PulseArticles] Feed post insert error (non-blocking):', postError)
    })

    return NextResponse.json({ success: true, article: data })
  } catch (error) {
    console.error('[PulseArticles] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
