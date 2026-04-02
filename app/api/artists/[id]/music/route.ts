import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const featured = searchParams.get('featured') === 'true'
    const type = searchParams.get('type')
    const genre = searchParams.get('genre')

    // Get artist profile to verify it exists
    const { data: artistProfile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name')
      .eq('id', params.id)
      .single()

    if (profileError || !artistProfile) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    // Build query for public music
    let query = supabase
      .from('artist_music')
      .select(`
        id,
        title,
        description,
        type,
        genre,
        release_date,
        duration,
        file_url,
        cover_art_url,
        spotify_url,
        apple_music_url,
        soundcloud_url,
        youtube_url,
        lyrics,
        tags,
        is_featured,
        is_pinned,
        stats,
        created_at,
        updated_at
      `)
      .eq('user_id', artistProfile.user_id)
      .eq('is_public', true)
      .order('is_pinned', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (featured) {
      query = query.eq('is_featured', true)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (genre) {
      query = query.eq('genre', genre)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: tracks, error: musicError } = await query

    if (musicError) {
      console.error('Error fetching music:', musicError)
      return NextResponse.json({ error: 'Failed to fetch music' }, { status: 500 })
    }

    // Transform tracks to include artist name and format stats
    const transformedTracks = (tracks || []).map((track: any) => ({
      ...track,
      artist: artistProfile.artist_name,
      play_count: track.stats?.plays || 0,
      likes_count: track.stats?.likes || 0,
      comments_count: track.stats?.comments || 0,
      shares_count: track.stats?.shares || 0,
      downloads_count: track.stats?.downloads || 0
    }))

    // Get total count for pagination
    let countQuery = supabase
      .from('artist_music')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', artistProfile.user_id)
      .eq('is_public', true)

    if (featured) {
      countQuery = countQuery.eq('is_featured', true)
    }

    if (type) {
      countQuery = countQuery.eq('type', type)
    }

    if (genre) {
      countQuery = countQuery.eq('genre', genre)
    }

    const { count } = await countQuery

    return NextResponse.json({
      tracks: transformedTracks,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      },
      artist: {
        id: artistProfile.id,
        name: artistProfile.artist_name
      }
    })

  } catch (error) {
    console.error('Error in artist music API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 