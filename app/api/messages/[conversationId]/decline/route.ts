import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const conversationIdSchema = z.string().uuid({ message: 'Invalid conversation id' })

function getConversationIdFromPath(request: NextRequest) {
  const pathParts = request.nextUrl.pathname.split('/')
  return pathParts[pathParts.length - 3]
}

export async function POST(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawId = getConversationIdFromPath(request)
    const parsed = conversationIdSchema.safeParse(rawId)
    if (!parsed.success)
      return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 })

    const conversationId = parsed.data
    const supabase = createServiceRoleClient()

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, participant_1, participant_2, trust_tier, accepted_at')
      .eq('id', conversationId)
      .single()

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const isParticipant = conversation.participant_1 === user.id || conversation.participant_2 === user.id
    if (!isParticipant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (conversation.trust_tier !== 'request' || conversation.accepted_at) {
      return NextResponse.json(
        { error: 'Only pending requests can be declined' },
        { status: 409 }
      )
    }

    const { data: firstMessage, error: firstMessageError } = await supabase
      .from('messages')
      .select('id, sender_id')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstMessageError) {
      console.error('Failed to load intro message:', firstMessageError)
      return NextResponse.json({ error: 'Failed to verify request state' }, { status: 500 })
    }

    if (firstMessage && firstMessage.sender_id === user.id) {
      return NextResponse.json(
        { error: 'Only the recipient can decline this request' },
        { status: 403 }
      )
    }

    const { error: deleteMessagesError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversation.id)

    if (deleteMessagesError) {
      console.error('Failed to delete request messages:', deleteMessagesError)
      return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 })
    }

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversation.id)
      .eq('trust_tier', 'request')
      .is('accepted_at', null)

    if (deleteError) {
      console.error('Failed to decline conversation request:', deleteError)
      return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Decline conversation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
