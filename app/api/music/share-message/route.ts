import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { musicId, recipientId, message } = await request.json()

    if (!musicId || !recipientId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the music track exists and is public
    const { data: music, error: musicError } = await supabase
      .from('artist_music')
      .select('id, title, is_public')
      .eq('id', musicId)
      .single()

    if (musicError || !music) {
      return NextResponse.json({ error: 'Music track not found' }, { status: 404 })
    }

    if (!music.is_public) {
      return NextResponse.json({ error: 'Cannot share private music' }, { status: 403 })
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Create the message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content: message || `Check out this track: ${music.title}`,
        message_type: 'music',
        music_id: musicId
      })
      .select()
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Record the share
    await supabase
      .from('music_shares')
      .insert({
        music_id: musicId,
        user_id: user.id,
        share_type: 'message',
        share_data: {
          recipient_id: recipientId,
          message: message || `Check out this track: ${music.title}`
        }
      })

    return NextResponse.json({ 
      success: true, 
      message: messageData 
    })

  } catch (error) {
    console.error('Error sharing music in message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
