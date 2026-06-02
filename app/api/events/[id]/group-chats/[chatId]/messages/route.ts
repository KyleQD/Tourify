import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const eventIdSchema = z.string().uuid({ message: 'Invalid event id' })
const chatIdSchema = z.string().uuid({ message: 'Invalid chat id' })

const messageBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
  message_type: z.string().max(40).optional(),
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
})

function getIds(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/')
  // /api/events/[id]/group-chats/[chatId]/messages → indices 3 and 5
  return { eventId: parts[3], chatId: parts[5] }
}

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const rawIds = getIds(request)
    const parsedEvent = eventIdSchema.safeParse(rawIds.eventId)
    const parsedChat = chatIdSchema.safeParse(rawIds.chatId)
    if (!parsedEvent.success || !parsedChat.success) {
      return NextResponse.json({ error: 'Invalid identifier in path' }, { status: 400 })
    }

    const parsedQuery = listQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      before: request.nextUrl.searchParams.get('before') ?? undefined,
    })
    if (!parsedQuery.success)
      return NextResponse.json({ error: 'Invalid query', details: parsedQuery.error.flatten() }, { status: 400 })

    const svc = createServiceRoleClient()

    const { data: group } = await svc
      .from('event_group_chats')
      .select('id, event_id, member_ids, created_by')
      .eq('id', parsedChat.data)
      .eq('event_id', parsedEvent.data)
      .single()

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    if (!group.member_ids?.includes(user.id) && group.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = svc
      .from('event_group_messages')
      .select('*')
      .eq('event_id', parsedEvent.data)
      .eq('group_id', parsedChat.data)
      .order('created_at', { ascending: false })
      .limit(parsedQuery.data.limit)
    if (parsedQuery.data.before) query = query.lt('created_at', parsedQuery.data.before)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })

    const messages = (data || []).slice().reverse()
    const nextCursor = data && data.length === parsedQuery.data.limit ? data[data.length - 1].created_at : null

    return NextResponse.json({ success: true, messages, nextCursor })
  } catch (error) {
    console.error('Event group messages GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const rawIds = getIds(request)
    const parsedEvent = eventIdSchema.safeParse(rawIds.eventId)
    const parsedChat = chatIdSchema.safeParse(rawIds.chatId)
    if (!parsedEvent.success || !parsedChat.success) {
      return NextResponse.json({ error: 'Invalid identifier in path' }, { status: 400 })
    }

    const rawBody = await request.json().catch(() => null)
    const parsedBody = messageBodySchema.safeParse(rawBody)
    if (!parsedBody.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )

    const svc = createServiceRoleClient()

    const { data: group } = await svc
      .from('event_group_chats')
      .select('id, event_id, member_ids, created_by')
      .eq('id', parsedChat.data)
      .eq('event_id', parsedEvent.data)
      .single()

    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    if (!group.member_ids?.includes(user.id) && group.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await svc
      .from('event_group_messages')
      .insert({
        event_id: parsedEvent.data,
        group_id: parsedChat.data,
        sender_id: user.id,
        content: parsedBody.data.content,
        message_type: parsedBody.data.message_type || 'text',
      })
      .select('*')
      .single()

    if (error || !data) return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    console.error('Event group messages POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
