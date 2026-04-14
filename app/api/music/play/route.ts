import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { musicId } = await request.json()
    
    if (!musicId)
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })

    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select('id, is_public, user_id, stats')
      .eq('id', musicId)
      .single()

    if (musicError || !music)
      return NextResponse.json({ error: 'Music not found' }, { status: 404 })

    if (!music.is_public)
      return NextResponse.json({ error: 'Music is private' }, { status: 403 })

    const { data: { user } } = await supabase.auth.getUser()
    
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const { error: playError } = await supabase
      .from('music_plays')
      .insert({
        music_id: musicId,
        user_id: user?.id || null,
        ip_address: ip,
        user_agent: userAgent
      })

    if (playError) {
      console.error('Error recording music play:', playError)
    }

    const currentStats = (music.stats && typeof music.stats === 'object') ? music.stats as Record<string, number> : {}
    const newPlays = (currentStats.plays || 0) + 1

    const { count: likeCount } = await supabase
      .from('music_likes')
      .select('id', { count: 'exact', head: true })
      .eq('music_id', musicId)

    const { count: commentCount } = await supabase
      .from('music_comments')
      .select('id', { count: 'exact', head: true })
      .eq('music_id', musicId)

    await supabase
      .from('artist_music')
      .update({
        stats: {
          ...currentStats,
          plays: newPlays,
          likes: likeCount ?? currentStats.likes ?? 0,
          comments: commentCount ?? currentStats.comments ?? 0,
        }
      })
      .eq('id', musicId)

    if (music?.user_id) {
      const { count: trackPlayCount } = await supabase
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
