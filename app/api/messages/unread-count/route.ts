import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Lightweight badge source for the top-nav Messages icon. Direct conversations
 * have no per-user read state, so we surface the number of threads whose most
 * recent message was sent by the other participant — i.e. threads awaiting the
 * viewer's attention.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ count: 0 }, { status: 200 })

    const { user } = auth
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        last_message:messages!last_message_id (sender_id)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)

    if (error) {
      console.error('Unread-count route error:', error)
      return NextResponse.json({ count: 0 }, { status: 200 })
    }

    const count = (data || []).reduce((total, conversation: any) => {
      const lastMessage = Array.isArray(conversation.last_message)
        ? conversation.last_message[0]
        : conversation.last_message
      if (lastMessage && lastMessage.sender_id && lastMessage.sender_id !== user.id) {
        return total + 1
      }
      return total
    }, 0)

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Unread-count route error:', error)
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
