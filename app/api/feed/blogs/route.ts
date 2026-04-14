import { NextRequest, NextResponse } from 'next/server'
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'recent'

    let query = supabase
      .from('artist_blog_posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          verified
        )
      `)
      .eq('status', 'published')

    // Filter by category if specified
    if (category && category !== 'all') {
      query = query.eq('category', category)
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

    const { data: blogs, error } = await query

    if (error) {
      console.error('Error fetching blog posts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch blog posts' },
        { status: 500 }
      )
    }

    // Transform blogs to match feed format
    const blogContent = (blogs || []).map(blog => ({
      id: blog.id,
      type: 'blog' as const,
      title: blog.title,
      description: blog.excerpt || blog.content?.substring(0, 200) + '...',
      author: blog.profiles ? {
        id: blog.profiles.id,
        name: blog.profiles.full_name || blog.profiles.username,
        username: blog.profiles.username,
        avatar_url: blog.profiles.avatar_url,
        is_verified: blog.profiles.verified || false
      } : undefined,
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
        reading_time: Math.ceil((blog.content?.length || 0) / 200), // Estimate reading time
        word_count: blog.content?.length || 0
      },
      relevance_score: 0.8
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