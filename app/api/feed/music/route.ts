import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const genre = searchParams.get('genre')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const userId = searchParams.get('userId')

    let query = supabase
      .from('music_tracks')
      .select(`
        *,
        profiles:profiles!left(
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('is_public', true)

    // Filter by genre if specified
    if (genre && genre !== 'all') {
      query = query.eq('genre', genre)
    }

    // Apply sorting
    switch (sortBy) {
      case 'popular':
        query = query.order('play_count', { ascending: false })
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

    const { data: tracks, error } = await query

    if (error) {
      console.error('Error fetching music tracks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch music tracks' },
        { status: 500 }
      )
    }

    // Transform tracks to match feed format
    const musicContent = (tracks || []).map(track => ({
      id: track.id,
      type: 'music' as const,
      title: track.title,
      description: track.description,
      author: track.profiles ? {
        id: track.profiles.id,
        name: track.profiles.full_name || track.profiles.username,
        username: track.profiles.username,
        avatar_url: track.profiles.avatar_url,
        is_verified: track.profiles.is_verified || false
      } : undefined,
      cover_image: track.cover_art_url,
      created_at: track.created_at,
      engagement: {
        likes: track.likes_count || 0,
        views: track.play_count || 0,
        shares: track.shares_count || 0,
        comments: track.comments_count || 0
      },
      metadata: {
        genre: track.genre,
        duration: track.duration,
        tags: track.tags || [],
        url: track.file_url,
        artist: track.artist_name
      },
      relevance_score: 0.9
    }))
    const response = NextResponse.json({
      success: true,
      content: musicContent,
      total: musicContent.length,
      lastUpdated: new Date().toISOString()
    })
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response

  } catch (error) {
    console.error('Error in music feed API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
