import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    const supabase = await createClient()
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
      .or(`id.eq.${params.id},user_id.eq.${params.id}`)
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
        cover_art_url,
        spotify_url,
        apple_music_url,
        soundcloud_url,
        youtube_url,
        lyrics,
        tags,
        is_featured,
        is_pinned,
        user_id,
        access_mode,
        preview_mode,
        preview_duration_seconds,
        preview_status,
        allow_library_add,
        allow_profile_feature,
        stats,
        created_at,
        updated_at
      `)
      .eq('user_id', artistProfile.user_id)
      .eq('is_public', true)
      .eq('is_visible', true)
      .eq('moderation_status', 'approved')
      .eq('rights_confirmed', true)
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

    const trackIds = (tracks || []).map((track: any) => track.id)
    const listingByTrack: Record<string, any> = {}
    if (trackIds.length > 0) {
      const { data: listings } = await supabase
        .from('marketplace_listings')
        .select('id, music_track_id, status, base_price, currency')
        .eq('category', 'music')
        .eq('product_type', 'digital_asset')
        .eq('status', 'published')
        .in('music_track_id', trackIds)
      ;(listings || []).forEach((listing: any) => {
        if (listing.music_track_id && !listingByTrack[listing.music_track_id]) {
          listingByTrack[listing.music_track_id] = listing
        }
      })
    }

    // Transform tracks to include artist name and stream contract metadata.
    const transformedTracks = (tracks || []).map((track: any) => ({
      ...track,
      file_url: `/api/music/stream?trackId=${track.id}`,
      stream_url: `/api/music/stream?trackId=${track.id}`,
      artist_user_id: artistProfile.user_id,
      artist_name: artistProfile.artist_name,
      artist: artistProfile.artist_name,
      listing_id: listingByTrack[track.id]?.id || null,
      listing_price: listingByTrack[track.id]?.base_price || null,
      listing_currency: listingByTrack[track.id]?.currency || null,
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
      .eq('is_visible', true)
      .eq('moderation_status', 'approved')
      .eq('rights_confirmed', true)

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
