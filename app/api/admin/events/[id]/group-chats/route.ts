import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  member_ids: z.array(z.string().uuid()).min(1),
  group_type: z.enum(['general', 'staff', 'crew', 'vendors', 'management', 'custom']).default('general'),
})

const sendMessageSchema = z.object({
  group_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
  message_type: z.enum(['text', 'announcement', 'update']).default('text'),
})

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const messagesOnly = searchParams.get('messages') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const svc = createServiceClient()

    const { data: participant } = await svc
      .from('event_participants')
      .select('participant_id, participant_type, role')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .eq('participant_type', 'Individual')
      .maybeSingle()

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!participant && !eventOwner) {
      return NextResponse.json({ error: 'Not a member of this event' }, { status: 403 })
    }

    if (messagesOnly && groupId) {
      const { data: messages, error } = await svc
        .from('event_group_messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ success: true, messages: [], _notice: 'table not yet created' })
        }
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
      }

      return NextResponse.json({ success: true, messages: messages || [] })
    }

    const { data: groups, error } = await svc
      .from('event_group_chats')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({
          success: true,
          groups: [],
          _notice: 'event_group_chats table not yet created'
        })
      }
      return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
    }

    const userGroups = (groups || []).filter((g: any) => {
      if (eventOwner) return true
      return g.member_ids?.includes(user.id) || g.created_by === user.id
    })

    return NextResponse.json({ success: true, groups: userGroups })
  } catch (error) {
    console.error('[Event Group Chats] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()
    const body = await request.json()

    if (body.content && body.group_id) {
      const validated = sendMessageSchema.parse(body)

      const { data: group } = await svc
        .from('event_group_chats')
        .select('member_ids, created_by')
        .eq('id', validated.group_id)
        .eq('event_id', eventId)
        .single()

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 })
      }

      const { data: eventOwner } = await svc
        .from('events_v2')
        .select('id')
        .eq('id', eventId)
        .eq('created_by', user.id)
        .maybeSingle()

      const isMember = eventOwner || group.member_ids?.includes(user.id) || group.created_by === user.id
      if (!isMember) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 })
      }

      const { data: message, error } = await svc
        .from('event_group_messages')
        .insert({
          group_id: validated.group_id,
          event_id: eventId,
          sender_id: user.id,
          content: validated.content,
          message_type: validated.message_type,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ success: false, error: 'table not yet created' }, { status: 501 })
        }
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message })
    }

    const validated = createGroupSchema.parse(body)

    const { data: eventOwner } = await svc
      .from('events_v2')
      .select('id')
      .eq('id', eventId)
      .eq('created_by', user.id)
      .maybeSingle()

    const { data: participant } = await svc
      .from('event_participants')
      .select('role')
      .eq('event_id', eventId)
      .eq('participant_id', user.id)
      .eq('participant_type', 'Individual')
      .maybeSingle()

    const isAdmin = !!eventOwner || participant?.role === 'admin' || participant?.role === 'manager'

    const allMemberIds = [...new Set([...validated.member_ids, user.id])]

    const { data: group, error } = await svc
      .from('event_group_chats')
      .insert({
        event_id: eventId,
        name: validated.name,
        description: validated.description || null,
        group_type: validated.group_type,
        member_ids: allMemberIds,
        created_by: user.id,
        is_admin_only: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: false, error: 'table not yet created' }, { status: 501 })
      }
      console.error('[Event Group Chats] Insert error:', error)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    return NextResponse.json({ success: true, group })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Event Group Chats] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
