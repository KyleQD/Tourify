import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Arcade's first release is creator practice: only the signed-in creator's own,
// published and rights-cleared tracks are selectable. Fan-wide use requires a
// separate, explicit game/synchronization license opt-in before expanding.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ tracks: [], message: 'Sign in to play your own music.' }, { headers: { 'Cache-Control': 'private, no-store' } })

    const { data, error } = await supabase
      .from('artist_music')
      .select('id, title, genre, duration, cover_art_url, access_mode, preview_mode, preview_duration_seconds')
      .eq('user_id', user.id)
      .eq('is_public', true)
      .eq('is_visible', true)
      .eq('moderation_status', 'approved')
      .eq('rights_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(40)

    if (error) {
      console.error('[arcade] creator-track catalog query failed:', error)
      return NextResponse.json({ tracks: [], error: 'Unable to load your eligible tracks.' }, { status: 500 })
    }

    return NextResponse.json({
      tracks: (data || []).map(track => ({
        id: track.id,
        title: track.title,
        genre: track.genre,
        duration: track.duration,
        coverUrl: track.cover_art_url,
        accessMode: track.access_mode,
        previewMode: track.preview_mode,
        previewDurationSeconds: track.preview_duration_seconds,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ tracks: [], error: 'Unable to load music.' }, { status: 500 })
  }
}
