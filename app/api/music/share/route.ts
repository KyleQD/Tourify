import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { musicId, playlistId, createPost, content } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!musicId && !playlistId) {
      return NextResponse.json({ error: 'musicId or playlistId is required' }, { status: 400 })
    }

    if (playlistId) {
      const { data: playlist, error: playlistError } = await supabase
        .from('music_playlists')
        .select('id, title, description, cover_image_url, owner_user_id, visibility')
        .eq('id', playlistId)
        .single()

      if (playlistError || !playlist) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
      if (playlist.owner_user_id !== user.id && playlist.visibility !== 'public') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const payload = {
        type: 'music_playlist',
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        cover: playlist.cover_image_url,
      }

      if (createPost) {
        await supabase.from('posts').insert({
          user_id: user.id,
          content: typeof content === 'string' && content.trim().length ? content.trim() : `Sharing playlist: "${playlist.title}"`,
          type: 'music',
          media_urls: playlist.cover_image_url ? [playlist.cover_image_url] : [],
          hashtags: ['music', 'playlist'],
        })
      }

      return NextResponse.json({ payload })
    }

    const { data: track, error } = await supabase
      .from('artist_music')
      .select('id,title,cover_art_url,file_url,stats,metadata,user_id')
      .eq('id', musicId)
      .single()

    if (error || !track) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (track.user_id !== user.id) {
      const { data: ownedLibraryTrack } = await supabase
        .from('user_music_library')
        .select('id')
        .eq('buyer_user_id', user.id)
        .eq('music_track_id', track.id)
        .maybeSingle()

      if (!ownedLibraryTrack) return NextResponse.json({ error: 'Track is not in your purchased library' }, { status: 403 })
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

    return NextResponse.json({ payload })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


