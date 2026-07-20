import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { getBlogAccountAuthor, isBlogAccountAttributionSchemaError } from '@/lib/blog/account-author'
import { accountAuthorNeedsRefresh } from '@/lib/accounts/account-author'
import { resolveAccountAuthorSnapshot } from '@/lib/accounts/acting-account-snapshot'
import { createArticle, listOwnedArticles } from '@/lib/blog/article-publishing'

const ARTICLE_SELECT_WITH_ACCOUNT = `
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
  posted_as_profile_id,
  posted_as_type,
  account_display_name,
  account_username,
  account_avatar_url,
  account_is_verified
`

const ARTICLE_SELECT_LEGACY = `
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
  user_id
`

function buildArticlesQuery(
  supabase: ReturnType<typeof createServiceRoleClient>,
  selectColumns: string,
  limit: number,
  cursor: string | null
) {
  let query = supabase
    .from('artist_blog_posts')
    .select(selectColumns)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit + 1)

  if (cursor)
    query = query.lt('published_at', cursor)

  return query
}

async function resolveArticleAuthor(supabase: ReturnType<typeof createServiceRoleClient>, row: any) {
  if (!accountAuthorNeedsRefresh(row)) return getBlogAccountAuthor(row)

  return resolveAccountAuthorSnapshot({
    supabase,
    accountType: row.posted_as_type || 'general',
    profileId: row.posted_as_profile_id || row.user_id,
    userId: row.user_id,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const mine = searchParams.get('mine') === '1' || searchParams.get('mine') === 'true'

    if (mine) {
      const ctx = await resolveActingContext(request)
      if (ctx instanceof NextResponse) return ctx

      const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50')))
      const formatParam = searchParams.get('format')
      const format =
        formatParam === 'blog' || formatParam === 'article' || formatParam === 'press_release'
          ? formatParam
          : formatParam === 'all'
            ? 'all'
            : undefined
      const result = await listOwnedArticles({ ctx, limit, format })
      if (!result.success)
        return NextResponse.json({ success: false, error: result.error }, { status: result.status })

      return NextResponse.json({ success: true, articles: result.articles })
    }

    const supabase = createServiceRoleClient()
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '12')))
    const cursor = searchParams.get('cursor')

    let { data, error } = await buildArticlesQuery(supabase, ARTICLE_SELECT_WITH_ACCOUNT, limit, cursor)

    if (error && isBlogAccountAttributionSchemaError(error)) {
      console.warn('[PulseArticles] Account attribution columns missing; using legacy article query.')
      const legacyResult = await buildArticlesQuery(supabase, ARTICLE_SELECT_LEGACY, limit, cursor)
      data = legacyResult.data
      error = legacyResult.error
    }

    if (error) {
      console.error('[PulseArticles] Query error:', error)
      return NextResponse.json({ success: false, error: 'Failed to load articles' }, { status: 500 })
    }

    const rows = (data || []) as any[]
    const hasMore = rows.length > limit
    const pageRows = rows.slice(0, limit)
    const nextCursor = hasMore && pageRows.length > 0
      ? pageRows[pageRows.length - 1].published_at
      : null

    const articles = await Promise.all(pageRows.map(async row => {
      const stats = (row.stats && typeof row.stats === 'object') ? row.stats as Record<string, number> : {}
      const author = await resolveArticleAuthor(supabase, row)

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
          id: author.id,
          type: author.type,
          name: author.name,
          username: author.username,
          avatarUrl: author.avatarUrl,
          isVerified: author.isVerified,
        },
        metrics: {
          likes: stats.likes || 0,
          comments: stats.comments || 0,
          shares: stats.shares || 0,
          views: stats.views || 0,
        },
        readingTime: Math.max(1, Math.ceil((row.content?.length || 0) / 1200)),
      }
    }))

    return NextResponse.json({ success: true, articles, nextCursor })
  } catch (error) {
    console.error('[PulseArticles] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const body = await request.json()
    const status =
      body.status === 'draft' || body.status === 'scheduled' ? body.status : 'published'
    const result = await createArticle({
      ctx,
      body: {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        tags: body.tags,
        categories: body.categories,
        featuredImageUrl: body.featuredImageUrl,
        status,
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        scheduledFor: body.scheduledFor,
        format: body.format,
        subtitle: body.subtitle,
        boilerplate: body.boilerplate,
        embargoUntil: body.embargoUntil,
        distribution: body.distribution,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          article: result.article
            ? {
                ...result.article,
                url: result.article.url,
                postedAs: result.article.postedAs,
              }
            : undefined,
        },
        { status: result.status }
      )
    }

    return NextResponse.json({
      success: true,
      article: {
        ...result.article,
        url: result.article.url,
        postedAs: result.article.postedAs,
      },
    })
  } catch (error) {
    console.error('[PulseArticles] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
