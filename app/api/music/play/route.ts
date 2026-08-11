import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { getTrustedMusicWriteClient, recordMusicEvent, resolveMusicAccess, syncMusicStats } from '@/lib/music/music-access'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { musicId: bodyMusicId, trackId, completed = false, listenSeconds, eventType, source, provider, playback_session_id } = await request.json()
    const musicId = bodyMusicId || trackId
    
    if (!musicId)
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })

    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select(`
        id,
        user_id,
        is_public,
        is_visible,
        moderation_status,
        access_mode,
        preview_mode,
        preview_status,
        preview_file_url,
        preview_storage_bucket,
        preview_storage_path,
        storage_bucket,
        storage_path,
        file_url,
        rights_confirmed,
        stats
      `)
      .eq('id', musicId)
      .single()

    if (musicError || !music)
      return NextResponse.json({ error: 'Music not found' }, { status: 404 })

    const { data: { user } } = await supabase.auth.getUser()
    const access = await resolveMusicAccess({
      supabase,
      track: music,
      viewerUserId: user?.id || null,
    })

    if (!access.allowed) {
      return NextResponse.json({ error: 'Music is not playable', accessLevel: access.accessLevel }, { status: 403 })
    }
    
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const writeClient = await getTrustedMusicWriteClient(supabase)
    const shouldInsertPlay = eventType ? eventType === 'play_started' : !completed
    if (shouldInsertPlay) {
      const { error: playError } = await writeClient
        .from('music_plays')
        .insert({
          music_id: musicId,
          artist_user_id: music.user_id,
          user_id: user?.id || null,
          access_level: access.accessLevel,
          listen_seconds: Number.isFinite(Number(listenSeconds)) ? Math.max(0, Math.round(Number(listenSeconds))) : null,
          completed: Boolean(completed),
          ip_address: ip,
          user_agent: userAgent
        })

      if (playError) {
        console.error('Error recording music play:', playError)
      }
    }

    // Provider analytics context — flows through metadata JSONB, never the stream URL
    const providerMeta = provider ? {
      provider: String(provider),
      ...(playback_session_id ? { playback_session_id: String(playback_session_id) } : {}),
    } : {}

    if (eventType === 'play_progress') {
      await recordMusicEvent({
        supabase,
        musicId,
        artistUserId: music.user_id,
        actorUserId: user?.id || null,
        eventType: 'play_progress',
        accessLevel: access.accessLevel,
        source: source || 'api_music_play',
        metadata: { listen_seconds: listenSeconds ?? null, ...providerMeta },
      })
    } else if (!completed) {
      await recordMusicEvent({
        supabase,
        musicId,
        artistUserId: music.user_id,
        actorUserId: user?.id || null,
        eventType: 'play_started',
        accessLevel: access.accessLevel,
        source: source || 'api_music_play',
        metadata: { listen_seconds: listenSeconds ?? null, ...providerMeta },
      })
      await recordMusicEvent({
        supabase,
        musicId,
        artistUserId: music.user_id,
        actorUserId: user?.id || null,
        eventType: access.accessLevel === 'full' ? 'full_play' : 'preview_play',
        accessLevel: access.accessLevel,
        source: source || 'api_music_play',
        metadata: providerMeta,
      })
    }

    if (completed) {
      await recordMusicEvent({
        supabase,
        musicId,
        artistUserId: music.user_id,
        actorUserId: user?.id || null,
        eventType: 'play_completed',
        accessLevel: access.accessLevel,
        source: source || 'api_music_play',
        metadata: providerMeta,
      })
    }

    await syncMusicStats(supabase, musicId)

    if (music?.user_id && shouldInsertPlay) {
      const { count: trackPlayCount } = await writeClient
        .from('music_plays')
        .select('id', { count: 'exact', head: true })
        .eq('music_id', musicId)

      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: music.user_id,
        metricKey: 'track_plays_total',
        eventType: 'music_played',
        delta: 1,
        eventSource: 'api_music_play',
        eventData: { music_id: musicId, viewer_id: user?.id ?? null }
      })

      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: music.user_id,
        metricKey: 'max_track_plays',
        eventType: 'music_played_snapshot',
        absoluteValue: trackPlayCount ?? undefined,
        eventSource: 'api_music_play',
        eventData: { music_id: musicId }
      })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Play recorded successfully' 
    })
  } catch (error) {
    console.error('Error in music play API:', error)
    return NextResponse.json({ 
      success: true,
      message: 'Play recorded' 
    })
  }
}
