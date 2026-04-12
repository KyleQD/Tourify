import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSchemaCacheMissingError } from '@/lib/marketplace/schema-readiness'

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
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
    if (userId) {
      query = query.eq('user_id', userId)
    }


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
      if (isSchemaCacheMissingError(error)) {
        const fallback = await supabase
          .from('artist_music')
          .select('id,user_id,title,description,genre,duration,file_url,cover_art_url,tags,created_at,stats,is_public')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (fallback.error) {
          console.error('Error fetching fallback music tracks:', fallback.error)
          return NextResponse.json(
            { success: false, error: { code: 'fetch_music_tracks_failed', message: 'Failed to fetch music tracks' }, content: [] },
            { status: 500 }
          )
        }

        const fallbackContent = (fallback.data || []).map(track => ({
          id: track.id,
          type: 'music' as const,
          title: track.title,
          description: track.description,
          author: {
            id: track.user_id,
            name: 'Artist',
            username: null,
          },
          cover_image: track.cover_art_url,
          created_at: track.created_at,
          engagement: {
            likes: Number((track.stats as any)?.likes || 0),
            views: Number((track.stats as any)?.plays || 0),
            shares: Number((track.stats as any)?.shares || 0),
            comments: Number((track.stats as any)?.comments || 0),
          },
          metadata: {
            genre: track.genre,
            duration: track.duration,
            tags: track.tags || [],
            url: track.file_url,
            artist: 'Artist',
          },
          relevance_score: 0.8,
        }))

        return NextResponse.json({
          success: true,
          content: fallbackContent,
          total: fallbackContent.length,
          lastUpdated: new Date().toISOString(),
          fallbackSource: 'artist_music',
        })
      }

      console.error('Error fetching music tracks:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_music_tracks_failed', message: 'Failed to fetch music tracks' }, content: [] },
        { status: 500 }
      )
    }

    // Transform tracks to match feed format
    const musicContent = (tracks || []).map(track => {
      const profile = track.profiles as { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null
      const displayName = profile?.full_name || profile?.username || 'Unknown artist'
      return {
        id: track.id,
        type: 'music' as const,
        title: track.title,
        description: track.description,
        author: {
          id: track.user_id,
          name: displayName,
          username: profile?.username || null,
        },
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
          artist: displayName
        },
        relevance_score: 0.9
      }
    })
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
      { success: false, error: { code: 'internal_error', message: 'Internal server error' }, content: [] },
      { status: 500 }
    )
  }
}
