import { NextRequest, NextResponse } from 'next/server'
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'
import { getBlogAccountAuthor } from '@/lib/blog/account-author'
import { accountAuthorNeedsRefresh } from '@/lib/accounts/account-author'
import { resolveAccountAuthorSnapshot } from '@/lib/accounts/acting-account-snapshot'

async function resolveBlogAuthor(blog: any) {
  if (!accountAuthorNeedsRefresh(blog)) return getBlogAccountAuthor(blog)

  return resolveAccountAuthorSnapshot({
    supabase,
    accountType: blog.posted_as_type || 'general',
    profileId: blog.posted_as_profile_id || blog.user_id,
    userId: blog.user_id,
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'recent'

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
        posted_as_profile_id,
        posted_as_type,
        account_display_name,
        account_username,
        account_avatar_url,
        account_is_verified
      `)
      .eq('status', 'published')
      .eq('format', 'blog')

    // Filter by category if specified
    if (category && category !== 'all') {
      query = query.contains('categories', [category])
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        query = query.order('stats->views', { ascending: false })
        break
      case 'trending':
        query = query.order('stats->likes', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('published_at', { ascending: false })
        break
    }

    // Apply limit
    query = query.limit(limit)

    let { data: blogs, error } = await query

    if (error && (error.message?.includes('format') || error.code === '42703' || error.code === 'PGRST204')) {
      let legacyQuery = supabase
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
          posted_as_profile_id,
          posted_as_type,
          account_display_name,
          account_username,
          account_avatar_url,
          account_is_verified
        `)
        .eq('status', 'published')

      if (category && category !== 'all')
        legacyQuery = legacyQuery.contains('categories', [category])

      switch (sortBy) {
        case 'popular':
          legacyQuery = legacyQuery.order('stats->views', { ascending: false })
          break
        case 'trending':
          legacyQuery = legacyQuery.order('stats->likes', { ascending: false })
          break
        default:
          legacyQuery = legacyQuery.order('published_at', { ascending: false })
          break
      }

      const legacy = await legacyQuery.limit(limit)
      blogs = legacy.data
      error = legacy.error
    }

    if (error) {
      console.error('Error fetching blog posts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch blog posts' },
        { status: 500 }
      )
    }

    // Transform blogs to match feed format
    const blogContent = await Promise.all((blogs || []).map(async blog => {
      const author = await resolveBlogAuthor(blog)

      return {
        id: blog.id,
        type: 'blog' as const,
        title: blog.title,
        description: blog.excerpt || blog.content?.substring(0, 200) + '...',
        author: {
          id: author.id,
          type: author.type,
          name: author.name,
          username: author.username,
          avatar_url: author.avatarUrl,
          is_verified: author.isVerified
        },
        cover_image: blog.featured_image_url,
        created_at: blog.published_at || blog.created_at,
        engagement: {
          likes: blog.stats?.likes || 0,
          views: blog.stats?.views || 0,
          shares: blog.stats?.shares || 0,
          comments: blog.stats?.comments || 0
        },
        metadata: {
          category: blog.categories?.[0] || 'General',
          tags: blog.tags || [],
          url: `/blog/${blog.slug}`,
          reading_time: Math.ceil((blog.content?.length || 0) / 200),
          word_count: blog.content?.length || 0
        },
        relevance_score: 0.8
      }
    }))

    return NextResponse.json({
      success: true,
      content: blogContent,
      total: blogContent.length,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in blog feed API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
