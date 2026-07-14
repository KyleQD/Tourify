import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isTrackPubliclyPlayable, recordMusicEvent, syncMusicStats } from '@/lib/music/music-access'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { musicId } = await request.json()
    
    if (!musicId)
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })

    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select('id, is_public, is_visible, moderation_status, rights_confirmed, user_id')
      .eq('id', musicId)
      .single()

    if (musicError || !music)
      return NextResponse.json({ error: 'Music not found' }, { status: 404 })

    if (music.user_id !== user.id && !isTrackPubliclyPlayable(music))
      return NextResponse.json({ error: 'Music is private' }, { status: 403 })

    const { data: existingLike } = await supabase
      .from('music_likes')
      .select('id')
      .eq('music_id', musicId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      const { error: unlikeError } = await supabase
        .from('music_likes')
        .delete()
        .eq('music_id', musicId)
        .eq('user_id', user.id)

      if (unlikeError)
        return NextResponse.json({ error: 'Failed to unlike music' }, { status: 500 })

      await syncMusicStats(supabase, musicId)
      return NextResponse.json({ liked: false, message: 'Music unliked successfully' })
    } else {
      const { error: likeError } = await supabase
        .from('music_likes')
        .insert({ music_id: musicId, user_id: user.id })

      if (likeError)
        return NextResponse.json({ error: 'Failed to like music' }, { status: 500 })

      await recordMusicEvent({
        supabase,
        musicId,
        artistUserId: music.user_id,
        actorUserId: user.id,
        eventType: 'like',
        source: 'api_music_like',
      })
      await syncMusicStats(supabase, musicId)
      return NextResponse.json({ liked: true, message: 'Music liked successfully' })
    }
  } catch (error) {
    console.error('Error in music like API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const musicId = searchParams.get('musicId')
    
    if (!musicId)
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })

    const { data: like } = await supabase
      .from('music_likes')
      .select('id')
      .eq('music_id', musicId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ liked: !!like })
  } catch (error) {
    console.error('Error in music like status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
