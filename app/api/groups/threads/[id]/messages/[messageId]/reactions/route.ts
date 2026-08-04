import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const emojiSchema = z.object({
  emoji: z.string().trim().min(1).max(8),
})

function getIdsFromPath(request: NextRequest): { threadId: string; messageId: string } {
  // Path: /api/groups/threads/[id]/messages/[messageId]/reactions
  const parts = request.nextUrl.pathname.split('/')
  // parts: ['', 'api', 'groups', 'threads', threadId, 'messages', messageId, 'reactions']
  return { threadId: parts[4], messageId: parts[6] }
}

// POST /api/groups/threads/[id]/messages/[messageId]/reactions
// Toggles an emoji reaction on a message (add if absent, remove if present).
export async function POST(request: NextRequest) {
  const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { threadId, messageId } = getIdsFromPath(request)

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(threadId) || !uuidRe.test(messageId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const rawBody = await request.json().catch(() => null)
  const parsed = emojiSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid emoji', details: parsed.error.flatten() }, { status: 400 })
  }
  const { emoji } = parsed.data

  const svc = createServiceRoleClient()

  // Verify message belongs to this thread and user is a member
  const { data: msg } = await svc
    .from('group_messages')
    .select('thread_id')
    .eq('id', messageId)
    .eq('thread_id', threadId)
    .maybeSingle()

  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

  const { data: membership } = await svc
    .from('thread_members')
    .select('user_id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check if reaction already exists
  const { data: existing } = await svc
    .from('group_message_reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    // Toggle off — delete the reaction
    await svc.from('group_message_reactions').delete().eq('id', existing.id)

    const { count } = await svc
      .from('group_message_reactions')
      .select('id', { count: 'exact', head: true })
      .eq('message_id', messageId)
      .eq('emoji', emoji)

    return NextResponse.json({ success: true, added: false, emoji, count: count ?? 0 })
  }

  // Toggle on — insert the reaction
  const { error: insertErr } = await svc
    .from('group_message_reactions')
    .insert({ message_id: messageId, user_id: user.id, emoji })

  if (insertErr) {
    console.error('[reactions] Insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 })
  }

  const { count } = await svc
    .from('group_message_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('message_id', messageId)
    .eq('emoji', emoji)

  return NextResponse.json({ success: true, added: true, emoji, count: count ?? 0 })
}
