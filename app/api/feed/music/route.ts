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
      .select('*')
      .eq('is_public', true)
      .eq('is_visible', true)
      .eq('moderation_status', 'approved')
      .eq('rights_confirmed', true)
    if (userId) query = query.eq('user_id', userId)
    if (genre && genre !== 'all') query = query.eq('genre', genre)

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

    query = query.limit(limit)

    const { data: tracks, error } = await query

    if (error) {
      if (isSchemaCacheMissingError(error)) {
        return await fallbackFromArtistMusic(supabase, { limit, genre, sortBy, userId })
      }

      console.error('Error fetching music tracks:', error)
      return NextResponse.json(
        { success: false, error: { code: 'fetch_music_tracks_failed', message: 'Failed to fetch music tracks' }, content: [] },
        { status: 500 }
      )
    }

    const musicContent = await (async () => {
      const userIds = Array.from(
        new Set((tracks || []).map((t: any) => t.user_id).filter(Boolean))
      )
      const trackIds = Array.from(
        new Set((tracks || []).map((t: any) => t.id).filter(Boolean))
      )
      let artistSlugByUserId: Record<string, string> = {}
      let listingIdByTrackId: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: artists } = await supabase
          .from('artist_profiles')
          .select('user_id, url_slug')
          .in('user_id', userIds)
        artistSlugByUserId = (artists || []).reduce(
          (acc: Record<string, string>, a: any) => {
            if (a.url_slug) acc[String(a.user_id)] = String(a.url_slug)
            return acc
          },
          {}
        )
      }
      if (trackIds.length > 0) {
        const { data: listings } = await supabase
          .from('marketplace_listings')
          .select('id, music_track_id')
          .eq('category', 'music')
          .eq('status', 'published')
          .in('music_track_id', trackIds)
        listingIdByTrackId = (listings || []).reduce(
          (acc: Record<string, string>, listing: any) => {
            if (listing.music_track_id) acc[String(listing.music_track_id)] = String(listing.id)
            return acc
          },
          {}
        )
      }

      return (tracks || []).map((track: any) => {
        const displayName = track.artist_name || track.artist_username || 'Unknown artist'
        const handle =
          artistSlugByUserId[String(track.user_id)] || track.artist_username || null
        return {
          id: track.id,
          type: 'music' as const,
          title: track.title,
          description: track.description,
          author: {
            id: track.user_id,
            name: displayName,
            username: handle,
            avatar_url: track.artist_avatar_url || null,
          },
          cover_image: track.cover_art_url,
          created_at: track.created_at,
          engagement: {
            likes: track.likes_count || 0,
            views: track.play_count || 0,
            shares: track.shares_count || 0,
            comments: track.comments_count || 0,
          },
          metadata: {
            genre: track.genre,
            duration: track.duration,
            tags: track.tags || [],
            url: `/api/music/stream?trackId=${track.id}`,
            artist: displayName,
            accessMode: track.access_mode || 'free',
            previewMode: track.preview_mode || 'full',
            previewDurationSeconds: track.preview_duration_seconds || 15,
            allowLibraryAdd: track.allow_library_add !== false,
            allowProfileFeature: track.allow_profile_feature !== false,
            listingId: listingIdByTrackId[String(track.id)] || null,
            trust: {
              originStatus: track.origin_status || 'not_recorded',
              certificationStatus: track.certification_status || 'not_requested',
              certificationLevel: track.certification_level || 0,
              certificationPublicId: track.certification_status === 'approved' ? track.certification_public_id || null : null,
              label: track.certification_status === 'approved' && Number(track.certification_level || 0) > 0
                ? 'Human-created certified'
                : track.origin_status === 'recorded' ? 'Origin recorded' : 'Artist submitted',
            },
          },
          relevance_score: 0.9,
        }
      })
    })()

    const response = NextResponse.json({
      success: true,
      content: musicContent,
      total: musicContent.length,
      lastUpdated: new Date().toISOString(),
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

async function fallbackFromArtistMusic(
  supabase: any,
  opts: { limit: number; genre: string | null; sortBy: string; userId: string | null }
) {
  let query = supabase
    .from('artist_music')
    .select('id, user_id, title, description, genre, duration, file_url, cover_art_url, tags, created_at, stats, is_public, is_visible, moderation_status, rights_confirmed, access_mode, preview_mode, preview_duration_seconds, allow_library_add, allow_profile_feature, origin_status, certification_status, certification_level, certification_public_id')
    .eq('is_public', true)
    .eq('is_visible', true)
    .eq('moderation_status', 'approved')
    .eq('rights_confirmed', true)

  if (opts.userId) query = query.eq('user_id', opts.userId)
  if (opts.genre && opts.genre !== 'all') query = query.eq('genre', opts.genre)

  query = query.order('created_at', { ascending: false }).limit(Math.min(opts.limit * 2, 100))

  const { data: rawTracks, error: fallbackError } = await query
  if (fallbackError) {
    console.error('Error fetching fallback music tracks:', fallbackError)
    return NextResponse.json(
      { success: false, error: { code: 'fetch_music_tracks_failed', message: 'Failed to fetch music tracks' }, content: [] },
      { status: 500 }
    )
  }

  const userIds = Array.from(new Set((rawTracks || []).map((t: any) => t.user_id)))
  const trackIds = Array.from(new Set((rawTracks || []).map((t: any) => t.id).filter(Boolean)))
  let profileMap: Record<string, { full_name: string | null; avatar_url: string | null; username: string | null }> = {}
  let artistSlugByUserId: Record<string, string> = {}
  let listingIdByTrackId: Record<string, string> = {}
  if (userIds.length > 0) {
    const [{ data: profiles }, { data: artists }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', userIds),
      supabase
        .from('artist_profiles')
        .select('user_id, url_slug, artist_name')
        .in('user_id', userIds),
    ])
    profileMap = (profiles || []).reduce(
      (acc: any, p: any) => ({
        ...acc,
        [p.id]: { full_name: p.full_name, avatar_url: p.avatar_url, username: p.username },
      }),
      {}
    )
    artistSlugByUserId = (artists || []).reduce(
      (acc: any, a: any) => ({
        ...acc,
        [a.user_id]: a.url_slug || null,
      }),
      {}
    )
  }
  if (trackIds.length > 0) {
    const { data: listings } = await supabase
      .from('marketplace_listings')
      .select('id, music_track_id')
      .eq('category', 'music')
      .eq('status', 'published')
      .in('music_track_id', trackIds)
    listingIdByTrackId = (listings || []).reduce(
      (acc: Record<string, string>, listing: any) => {
        if (listing.music_track_id) acc[String(listing.music_track_id)] = String(listing.id)
        return acc
      },
      {}
    )
  }

  let content = (rawTracks || []).map((track: any) => {
    const profile = profileMap[track.user_id]
    const artistName = profile?.full_name || 'Artist'
    const artistHandle = artistSlugByUserId[track.user_id] || profile?.username || null
    const stats = track.stats || {}
    const likes = Number(stats.likes || 0)
    const plays = Number(stats.plays || 0)
    const shares = Number(stats.shares || 0)
    const comments = Number(stats.comments || 0)

    return {
      id: track.id,
      type: 'music' as const,
      title: track.title,
      description: track.description,
      author: {
        id: track.user_id,
        name: artistName,
        username: artistHandle,
        avatar_url: profile?.avatar_url || null,
      },
      cover_image: track.cover_art_url,
      created_at: track.created_at,
      engagement: { likes, views: plays, shares, comments },
      metadata: {
        genre: track.genre,
        duration: track.duration,
        tags: track.tags || [],
        url: `/api/music/stream?trackId=${track.id}`,
        artist: artistName,
        accessMode: track.access_mode || 'free',
        previewMode: track.preview_mode || 'full',
        previewDurationSeconds: track.preview_duration_seconds || 15,
        allowLibraryAdd: track.allow_library_add !== false,
        allowProfileFeature: track.allow_profile_feature !== false,
        listingId: listingIdByTrackId[String(track.id)] || null,
        trust: {
          originStatus: track.origin_status || 'not_recorded',
          certificationStatus: track.certification_status || 'not_requested',
          certificationLevel: track.certification_level || 0,
          certificationPublicId: track.certification_status === 'approved' ? track.certification_public_id || null : null,
          label: track.certification_status === 'approved' && Number(track.certification_level || 0) > 0
            ? 'Human-created certified'
            : track.origin_status === 'recorded' ? 'Origin recorded' : 'Artist submitted',
        },
      },
      relevance_score: 0.8,
      _engagement_total: likes + plays + shares + comments,
      _created_ms: new Date(track.created_at).getTime(),
    }
  })

  if (opts.sortBy === 'popular') {
    content.sort((a: any, b: any) => b.engagement.views - a.engagement.views)
  } else if (opts.sortBy === 'trending') {
    const now = Date.now()
    const dayMs = 86400000
    content.sort((a: any, b: any) => {
      const ageA = Math.max(1, (now - a._created_ms) / dayMs)
      const ageB = Math.max(1, (now - b._created_ms) / dayMs)
      const scoreA = a._engagement_total / Math.sqrt(ageA)
      const scoreB = b._engagement_total / Math.sqrt(ageB)
      return scoreB - scoreA
    })
  }

  content = content.slice(0, opts.limit).map(({ _engagement_total, _created_ms, ...rest }: any) => rest)

  return NextResponse.json({
    success: true,
    content,
    total: content.length,
    lastUpdated: new Date().toISOString(),
    fallbackSource: 'artist_music',
  })
}
