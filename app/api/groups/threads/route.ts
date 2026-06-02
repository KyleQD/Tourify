import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

const createThreadSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional(),
  thread_type: z.enum(['social', 'project', 'tour']).optional(),
  member_ids: z.array(z.string().uuid()).max(50).default([]),
  context_type: z.string().max(40).optional(),
  context_id: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedQuery = listQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    })
    if (!parsedQuery.success)
      return NextResponse.json({ error: 'Invalid query', details: parsedQuery.error.flatten() }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { data: memberships, error: membershipError } = await supabase
      .from('thread_members')
      .select('thread_id, role, muted_until')
      .eq('user_id', user.id)
      .is('left_at', null)

    if (membershipError) {
      console.error('Failed to load thread memberships:', membershipError)
      return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 })
    }

    const threadIds = (memberships || []).map((membership) => membership.thread_id)
    if (threadIds.length === 0) return NextResponse.json({ threads: [] })

    const { data: threads, error: threadsError } = await supabase
      .from('group_threads')
      .select(`
        id,
        name,
        description,
        thread_type,
        created_by,
        last_message_id,
        context_type,
        context_id,
        is_admin_only,
        created_at,
        updated_at,
        last_message:group_messages!last_message_id(id, content, created_at, sender_id)
      `)
      .in('id', threadIds)
      .order('updated_at', { ascending: false })
      .limit(parsedQuery.data.limit)

    if (threadsError) {
      console.error('Failed to load threads:', threadsError)
      return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 })
    }

    const membershipMap = new Map((memberships || []).map((membership) => [membership.thread_id, membership]))
    const data = (threads || []).map((thread) => ({
      ...thread,
      membership: membershipMap.get(thread.id) || null,
    }))

    return NextResponse.json({ threads: data })
  } catch (error) {
    console.error('Group threads GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody = await request.json().catch(() => null)
    const parsedBody = createThreadSchema.safeParse(rawBody)
    if (!parsedBody.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )

    const supabase = createServiceRoleClient()
    const { name, description, thread_type, member_ids, context_type, context_id } = parsedBody.data

    const { data: thread, error: threadError } = await supabase
      .from('group_threads')
      .insert({
        name,
        description: description || null,
        thread_type: thread_type || 'social',
        created_by: user.id,
        context_type: context_type || null,
        context_id: context_id || null,
      })
      .select('*')
      .single()

    if (threadError || !thread) {
      console.error('Failed to create group thread:', threadError)
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 })
    }

    const uniqueMembers = Array.from(new Set([user.id, ...member_ids.filter((id) => id !== user.id)]))
    const memberships = uniqueMembers.map((memberId) => ({
      thread_id: thread.id,
      user_id: memberId,
      role: memberId === user.id ? 'owner' : 'member',
      left_at: null,
    }))

    const { error: membersError } = await supabase
      .from('thread_members')
      .upsert(memberships, { onConflict: 'thread_id,user_id' })

    if (membersError) {
      console.error('Failed to create group members:', membersError)
      return NextResponse.json({ error: 'Failed to add group members' }, { status: 500 })
    }

    return NextResponse.json({ success: true, thread })
  } catch (error) {
    console.error('Group threads POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
