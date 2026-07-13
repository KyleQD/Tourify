import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api/route-helpers'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { resolveActingAccountSnapshot } from '@/lib/accounts/acting-account-snapshot'
import { isTrackPubliclyPlayable, recordMusicEvent, syncMusicStats } from '@/lib/music/music-access'

export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId, accountType, profileId, supabase } = ctx
    const author = await resolveActingAccountSnapshot(ctx)
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
      if (playlist.owner_user_id !== userId && playlist.visibility !== 'public') {
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
        const { data: createdPost, error: createPostError } = await supabase
          .from('posts')
          .insert({
            user_id: userId,
            content: typeof content === 'string' && content.trim().length ? content.trim() : `Sharing playlist: "${playlist.title}"`,
            type: 'music',
            media_urls: playlist.cover_image_url ? [playlist.cover_image_url] : [],
            hashtags: ['music', 'playlist'],
            posted_as_type: accountType,
            posted_as_profile_id: profileId,
            account_display_name: author.name,
            account_username: author.username,
            account_avatar_url: author.avatarUrl,
          })
          .select('id')
          .single()

        if (createPostError) {
          console.error('Failed to create playlist share post', createPostError)
          return jsonError({
            status: 500,
            code: 'create_playlist_share_post_failed',
            message: 'Failed to create share post',
            retryable: true,
          })
        }

        const { error: shareInsertError } = await supabase.from('music_playlist_shares').insert({
          playlist_id: playlist.id,
          shared_by_user_id: userId,
          feed_post_id: createdPost?.id || null,
        })

        if (shareInsertError) {
          console.error('Failed to create playlist share record', shareInsertError)
          return jsonError({
            status: 500,
            code: 'create_playlist_share_record_failed',
            message: 'Failed to record playlist share',
            retryable: true,
          })
        }
      }

      await supabase.from('achievement_progress_events').insert({
        user_id: userId,
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
      .select('id,title,cover_art_url,stats,metadata,user_id,is_public,is_visible,moderation_status,rights_confirmed')
      .eq('id', musicId)
      .single()

    if (error || !track)
      return jsonError({
        status: 404,
        code: 'track_not_found',
        message: 'Not found',
      })

    if (track.user_id !== userId) {
      if (!isTrackPubliclyPlayable(track)) {
        return jsonError({
          status: 403,
          code: 'track_not_available',
          message: 'Track is not available to share',
        })
      }
      const { data: ownedLibraryTrack } = await supabase
        .from('user_music_library')
        .select('id')
        .eq('buyer_user_id', userId)
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
      preview: `/api/music/stream?trackId=${track.id}`,
      likes: track.stats?.likes || 0,
      plays: track.stats?.plays || 0,
      buy_url: track.metadata?.commerce?.buy_url || null,
    }

    if (createPost) {
      const { error: createPostError } = await supabase.from('posts').insert({
        user_id: userId,
        content: typeof content === 'string' && content.trim().length ? content.trim() : `Sharing track: "${track.title}"`,
        type: 'music',
        media_urls: track.cover_art_url ? [track.cover_art_url] : [],
        hashtags: ['music', 'track'],
        metadata: {
          music_track_id: track.id,
          track_id: track.id,
          track_title: track.title,
          cover_url: track.cover_art_url || null,
          stream_url: `/api/music/stream?trackId=${track.id}`,
        },
        posted_as_type: accountType,
        posted_as_profile_id: profileId,
        account_display_name: author.name,
        account_username: author.username,
        account_avatar_url: author.avatarUrl,
      })

      if (createPostError) {
        console.error('Failed to create music share post', createPostError)
        return jsonError({
          status: 500,
          code: 'create_music_share_post_failed',
          message: 'Failed to create share post',
          retryable: true,
        })
      }
    }

    await supabase.from('achievement_progress_events').insert({
      user_id: userId,
      metric_key: 'music_track_shares_total',
      event_type: 'music_track_shared',
      event_value: 1,
      event_source: 'api_music_share_track',
      event_data: { music_id: track.id, created_post: Boolean(createPost) },
    })

    await recordMusicEvent({
      supabase,
      musicId: track.id,
      artistUserId: track.user_id,
      actorUserId: userId,
      eventType: 'share',
      source: 'api_music_share_track',
      metadata: { created_post: Boolean(createPost) },
    })
    await syncMusicStats(supabase, track.id)

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
