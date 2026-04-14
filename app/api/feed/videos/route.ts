import { NextRequest, NextResponse } from 'next/server'
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const orientation = searchParams.get('orientation') // 'vertical' or 'horizontal'

    let query = supabase
      .from('videos')
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
      .eq('is_public', true)

    // Filter by category if specified
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Filter by orientation if specified
    if (orientation) {
      if (orientation === 'vertical') {
        query = query.lt('aspect_ratio', 1) // height > width
      } else if (orientation === 'horizontal') {
        query = query.gte('aspect_ratio', 1) // width >= height
      }
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        query = query.order('views_count', { ascending: false })
        break
      case 'trending':
        query = query.order('likes_count', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('created_at', { ascending: false })
        break
    }

    // Apply limit
    query = query.limit(limit)

    const { data: videos, error } = await query

    if (error) {
      console.error('Error fetching videos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      )
    }

    // Transform videos to match feed format
    const videoContent = (videos || []).map(video => ({
      id: video.id,
      type: 'video' as const,
      title: video.title,
      description: video.description,
      author: video.profiles ? {
        id: video.profiles.id,
        name: video.profiles.full_name || video.profiles.username,
        username: video.profiles.username,
        avatar_url: video.profiles.avatar_url,
        is_verified: video.profiles.verified || false
      } : undefined,
      cover_image: video.thumbnail_url || video.video_url,
      created_at: video.created_at,
      engagement: {
        likes: video.likes_count || 0,
        views: video.views_count || 0,
        shares: video.shares_count || 0,
        comments: video.comments_count || 0
      },
      metadata: {
        category: video.category,
        duration: video.duration,
        tags: video.tags || [],
        url: video.video_url,
        aspect_ratio: video.aspect_ratio,
        orientation: video.aspect_ratio < 1 ? 'vertical' : 'horizontal'
      },
      relevance_score: 0.85
    }))

    return NextResponse.json({
      success: true,
      content: videoContent,
      total: videoContent.length,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in video feed API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
