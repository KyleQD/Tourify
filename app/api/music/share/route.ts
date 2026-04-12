import { NextRequest, NextResponse } from 'next/server'
import { requireApiUser, jsonError } from '@/lib/api/route-helpers'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response

    const { user, supabase } = authResult.auth
    const { musicId, playlistId, createPost, content } = await request.json()

    if (!musicId && !playlistId) {
      return jsonError({
        status: 400,
        code: 'invalid_request',
        message: 'musicId or playlistId is required',
      })
    }

    if (playlistId) {
      const { data: playlist, error: playlistError } = await supabase
        .from('music_playlists')
        .select('id, title, description, cover_image_url, owner_user_id, visibility')
        .eq('id', playlistId)
        .single()

      if (playlistError || !playlist)
        return jsonError({
          status: 404,
          code: 'playlist_not_found',
          message: 'Playlist not found',
        })
      if (playlist.owner_user_id !== user.id && playlist.visibility !== 'public') {
        return jsonError({
          status: 403,
          code: 'forbidden',
          message: 'Forbidden',
        })
      }

      const payload = {
        type: 'music_playlist',
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        cover: playlist.cover_image_url,
      }

      if (createPost) {
        const { data: createdPost } = await supabase.from('posts').insert({
          user_id: user.id,
          content: typeof content === 'string' && content.trim().length ? content.trim() : `Sharing playlist: "${playlist.title}"`,
          type: 'music',
          media_urls: playlist.cover_image_url ? [playlist.cover_image_url] : [],
          hashtags: ['music', 'playlist'],
        }).select('id').single()

        await supabase.from('music_playlist_shares').insert({
          playlist_id: playlist.id,
          shared_by_user_id: user.id,
          feed_post_id: createdPost?.id || null,
        })
      }

      await supabase.from('achievement_progress_events').insert({
        user_id: user.id,
        metric_key: 'music_playlist_shares_total',
        event_type: 'music_playlist_shared',
        event_value: 1,
        event_source: 'api_music_share_playlist',
        event_data: { playlist_id: playlist.id, created_post: Boolean(createPost) },
      })

      return NextResponse.json({ payload })
    }

    const { data: track, error } = await supabase
      .from('artist_music')
      .select('id,title,cover_art_url,file_url,stats,metadata,user_id')
      .eq('id', musicId)
      .single()

    if (error || !track)
      return jsonError({
        status: 404,
        code: 'track_not_found',
        message: 'Not found',
      })

    if (track.user_id !== user.id) {
      const { data: ownedLibraryTrack } = await supabase
        .from('user_music_library')
        .select('id')
        .eq('buyer_user_id', user.id)
        .eq('music_track_id', track.id)
        .maybeSingle()

      if (!ownedLibraryTrack)
        return jsonError({
          status: 403,
          code: 'forbidden_track_access',
          message: 'Track is not in your purchased library',
        })
    }

    const payload = {
      type: 'music',
      id: track.id,
      title: track.title,
      cover: track.cover_art_url,
      preview: track.file_url,
      likes: track.stats?.likes || 0,
      plays: track.stats?.plays || 0,
      buy_url: track.metadata?.commerce?.buy_url || null,
      full_track_url: track.metadata?.full_track_url || null,
    }

    if (createPost) {
      await supabase.from('posts').insert({
        user_id: user.id,
        content: typeof content === 'string' && content.trim().length ? content.trim() : `Sharing track: "${track.title}"`,
        type: 'music',
        media_urls: track.cover_art_url ? [track.cover_art_url] : [],
        hashtags: ['music', 'track'],
      })
    }

    await supabase.from('achievement_progress_events').insert({
      user_id: user.id,
      metric_key: 'music_track_shares_total',
      event_type: 'music_track_shared',
      event_value: 1,
      event_source: 'api_music_share_track',
      event_data: { music_id: track.id, created_post: Boolean(createPost) },
    })

    return NextResponse.json({ payload })
  } catch (error) {
    console.error('API music share error:', error)
    return jsonError({
      status: 500,
      code: 'internal_error',
      message: 'Internal server error',
      retryable: true,
    })
  }
}


