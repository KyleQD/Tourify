import { NextRequest, NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { applyConversationAccountScope } from '@/lib/messaging/account-scope'

/**
 * Lightweight badge source for the top-nav Messages icon. Direct conversations
 * have no per-user read state, so we surface the number of threads whose most
 * recent message was sent by the other participant — i.e. threads awaiting the
 * viewer's attention. Scoped to the acting account inbox when headers/session
 * select a non-general account.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return NextResponse.json({ count: 0 }, { status: 200 })

    const supabase = createServiceRoleClient()
    const inboxScope = {
      userId: ctx.userId,
      profileId: ctx.profileId,
      accountType: ctx.accountType,
    }

    let query = applyConversationAccountScope(
      supabase.from('conversations').select(`
        id,
        last_message:messages!last_message_id (sender_id)
      `),
      inboxScope,
    )

    let { data, error } = await query

    if (error && (
      String(error.message || '').toLowerCase().includes('participant_1_account_type')
      || String(error.message || '').toLowerCase().includes('participant_1_profile_id')
    )) {
      const fallback = await supabase
        .from('conversations')
        .select(`
          id,
          last_message:messages!last_message_id (sender_id)
        `)
        .or(`participant_1.eq.${ctx.userId},participant_2.eq.${ctx.userId}`)
      data = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error('Unread-count route error:', error)
      return NextResponse.json({ count: 0, inbox: { profileId: ctx.profileId, accountType: ctx.accountType } }, { status: 200 })
    }

    const count = (data || []).reduce((total, conversation: any) => {
      const lastMessage = Array.isArray(conversation.last_message)
        ? conversation.last_message[0]
        : conversation.last_message
      if (lastMessage && lastMessage.sender_id && lastMessage.sender_id !== ctx.userId)
        return total + 1
      return total
    }, 0)

    return NextResponse.json({
      count,
      inbox: { profileId: ctx.profileId, accountType: ctx.accountType },
    })
  } catch (error) {
    console.error('Unread-count route error:', error)
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
