import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const threadIdSchema = z.string().uuid({ message: 'Invalid thread id' })
const messageBodySchema = z.object({
  content: z.string().trim().max(2000).optional(),
  message_type: z.string().max(40).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    name: z.string().min(1),
    type: z.enum(['image', 'file', 'audio']),
    size: z.number().int().nonnegative(),
  })).default([]),
}).refine((data) => Boolean(data.content?.trim()) || data.attachments.length > 0, {
  message: 'Message content or attachments are required',
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
})

function getThreadIdFromPath(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/')
  return parts[parts.length - 2]
}

async function ensureMembership(
  supabase: ReturnType<typeof createServiceRoleClient>,
  threadId: string,
  userId: string,
) {
  const { data } = await supabase
    .from('thread_members')
    .select('thread_id, role')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .is('left_at', null)
    .maybeSingle()

  return data
}

function extractMentionUsernames(content: string): string[] {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g
  const matches = new Set<string>()
  let match = mentionRegex.exec(content)
  while (match) {
    matches.add(match[1])
    match = mentionRegex.exec(content)
  }
  return Array.from(matches)
}

export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawThreadId = getThreadIdFromPath(request)
    const parsedId = threadIdSchema.safeParse(rawThreadId)
    if (!parsedId.success)
      return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const membership = await ensureMembership(supabase, parsedId.data, user.id)
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const parsedQuery = listQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      before: request.nextUrl.searchParams.get('before') ?? undefined,
    })
    if (!parsedQuery.success)
      return NextResponse.json({ error: 'Invalid query', details: parsedQuery.error.flatten() }, { status: 400 })
    const { limit, before } = parsedQuery.data

    let query = supabase
      .from('group_messages')
      .select(`
        id,
        thread_id,
        sender_id,
        content,
        message_type,
        mentions,
        attachments,
        read_by,
        created_at,
        sender:profiles!sender_id(id, username, full_name, avatar_url)
      `)
      .eq('thread_id', parsedId.data)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (before) query = query.lt('created_at', before)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })

    const rawMessages = (data || []).slice().reverse()
    const nextCursor = data && data.length === limit ? data[data.length - 1].created_at : null

    // Fetch and aggregate reactions for all messages in one query
    const messageIds = rawMessages.map((m: { id: string }) => m.id)
    const reactionsMap: Record<string, { emoji: string; count: number; user_ids: string[] }[]> = {}

    if (messageIds.length > 0) {
      const { data: rawReactions } = await supabase
        .from('group_message_reactions')
        .select('message_id, emoji, user_id')
        .in('message_id', messageIds)

      for (const r of rawReactions ?? []) {
        if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = []
        const existing = reactionsMap[r.message_id].find((x) => x.emoji === r.emoji)
        if (existing) {
          existing.count++
          existing.user_ids.push(r.user_id)
        } else {
          reactionsMap[r.message_id].push({ emoji: r.emoji, count: 1, user_ids: [r.user_id] })
        }
      }
    }

    const messages = rawMessages.map((m: { id: string }) => ({
      ...m,
      reactions: reactionsMap[m.id] ?? [],
    }))

    return NextResponse.json({ messages, nextCursor })
  } catch (error) {
    console.error('Group thread messages GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawThreadId = getThreadIdFromPath(request)
    const parsedId = threadIdSchema.safeParse(rawThreadId)
    if (!parsedId.success)
      return NextResponse.json({ error: 'Invalid thread id' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const membership = await ensureMembership(supabase, parsedId.data, user.id)
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const rawBody = await request.json().catch(() => null)
    const parsedBody = messageBodySchema.safeParse(rawBody)
    if (!parsedBody.success)
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 },
      )

    const { content, message_type, attachments } = parsedBody.data
    const usernames = extractMentionUsernames(content || '')
    let mentionIds: string[] = []
    if (usernames.length > 0) {
      const { data: mentionProfiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', usernames)

      const candidateIds = (mentionProfiles || []).map((profile) => profile.id)
      if (candidateIds.length > 0) {
        const { data: membersOfThread } = await supabase
          .from('thread_members')
          .select('user_id')
          .eq('thread_id', parsedId.data)
          .is('left_at', null)
          .in('user_id', candidateIds)
        mentionIds = (membersOfThread || []).map((row) => row.user_id)
      }
    }

    const { data, error } = await supabase
      .from('group_messages')
      .insert({
        thread_id: parsedId.data,
        sender_id: user.id,
        content: content?.trim() || '(attachment)',
        message_type: message_type || 'text',
        mentions: mentionIds,
        attachments,
      })
      .select(`
        id,
        thread_id,
        sender_id,
        content,
        message_type,
        mentions,
        attachments,
        read_by,
        created_at,
        sender:profiles!sender_id(id, username, full_name, avatar_url)
      `)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })

    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    console.error('Group thread messages POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
