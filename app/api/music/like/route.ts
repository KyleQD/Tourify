import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { musicId } = await request.json()
    
    if (!musicId) {
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })
    }

    // Check if music exists and is public
    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select('id, is_public, user_id')
      .eq('id', musicId)
      .single()

    if (musicError || !music) {
      return NextResponse.json({ error: 'Music not found' }, { status: 404 })
    }

    if (!music.is_public && music.user_id !== user.id) {
      return NextResponse.json({ error: 'Music is private' }, { status: 403 })
    }

    // Check if user already liked this music
    const { data: existingLike } = await supabase
      .from('music_likes')
      .select('id')
      .eq('music_id', musicId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      // Unlike
      const { error: unlikeError } = await supabase
        .from('music_likes')
        .delete()
        .eq('music_id', musicId)
        .eq('user_id', user.id)

      if (unlikeError) {
        return NextResponse.json({ error: 'Failed to unlike music' }, { status: 500 })
      }

      return NextResponse.json({ liked: false, message: 'Music unliked successfully' })
    } else {
      // Like
      const { error: likeError } = await supabase
        .from('music_likes')
        .insert({
          music_id: musicId,
          user_id: user.id
        })

      if (likeError) {
        return NextResponse.json({ error: 'Failed to like music' }, { status: 500 })
      }

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
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const musicId = searchParams.get('musicId')
    
    if (!musicId) {
      return NextResponse.json({ error: 'Music ID is required' }, { status: 400 })
    }

    // Check if user liked this music
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