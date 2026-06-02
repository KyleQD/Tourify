import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().datetime().optional(),
})

type Source = 'direct' | 'group' | 'event_group'

interface UnifiedItem {
  id: string
  source: Source
  badge: string
  name?: string | null
  last_message: string | null
  last_activity: string | null
  event_id?: string | null
  trust_tier?: string | null
  context_type?: string | null
}

function deriveDirectBadge(trustTier: string | null | undefined, contextType: string | null | undefined): string {
  if (trustTier === 'request') return 'Request'
  if (contextType && contextType !== 'workflow') return 'Work'
  if (contextType === 'workflow') return 'Workflow'
  return 'Primary'
}

export async function GET(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parsedQuery = querySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
    })
    if (!parsedQuery.success)
      return NextResponse.json({ error: 'Invalid query', details: parsedQuery.error.flatten() }, { status: 400 })
    const { limit, cursor } = parsedQuery.data

    const supabase = createServiceRoleClient()

    const directQuery = supabase
      .from('conversations')
      .select(`
        id,
        updated_at,
        trust_tier,
        context_type,
        last_message:messages!last_message_id(content, created_at)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(limit)
    if (cursor) directQuery.lt('updated_at', cursor)

    const eventGroupsQuery = supabase
      .from('event_group_chats')
      .select(`
        id,
        event_id,
        name,
        created_at,
        member_ids,
        last_message:event_group_messages(content, created_at)
      `)
      .contains('member_ids', [user.id])
      .order('created_at', { ascending: false })
      .limit(limit)
    if (cursor) eventGroupsQuery.lt('created_at', cursor)

    const [directResult, membershipsResult, eventGroupsResult] = await Promise.all([
      directQuery,
      supabase
        .from('thread_members')
        .select('thread_id')
        .eq('user_id', user.id)
        .is('left_at', null),
      eventGroupsQuery,
    ])

    const threadIds = (membershipsResult.data || []).map((membership) => membership.thread_id)
    const groupThreadsQuery = threadIds.length > 0
      ? supabase
        .from('group_threads')
        .select(`
          id,
          name,
          updated_at,
          thread_type,
          last_message:group_messages!last_message_id(content, created_at)
        `)
        .in('id', threadIds)
        .order('updated_at', { ascending: false })
        .limit(limit)
      : null
    if (groupThreadsQuery && cursor) groupThreadsQuery.lt('updated_at', cursor)
    const groupThreadsResult = groupThreadsQuery ? await groupThreadsQuery : { data: [], error: null }

    const directItems: UnifiedItem[] = (directResult.data || []).map((item: any) => {
      const lastMessage = Array.isArray(item.last_message) ? item.last_message[0] : item.last_message
      return {
        id: item.id,
        source: 'direct',
        badge: deriveDirectBadge(item.trust_tier, item.context_type),
        last_message: lastMessage?.content || null,
        last_activity: lastMessage?.created_at || item.updated_at,
        trust_tier: item.trust_tier ?? null,
        context_type: item.context_type ?? null,
      }
    })

    const groupItems: UnifiedItem[] = (groupThreadsResult.data || []).map((item: any) => {
      const lastMessage = Array.isArray(item.last_message) ? item.last_message[0] : item.last_message
      return {
        id: item.id,
        source: 'group',
        badge: 'Group',
        last_message: lastMessage?.content || null,
        last_activity: lastMessage?.created_at || item.updated_at,
        name: item.name,
      }
    })

    const eventGroupItems: UnifiedItem[] = (eventGroupsResult.data || []).map((item: any) => {
      const lastMessages = Array.isArray(item.last_message) ? item.last_message : []
      const latest = lastMessages
        .slice()
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      return {
        id: item.id,
        source: 'event_group',
        badge: 'Event',
        last_message: latest?.content ?? null,
        last_activity: latest?.created_at ?? item.created_at,
        name: item.name,
        event_id: item.event_id,
      }
    })

    const merged = [...directItems, ...groupItems, ...eventGroupItems].sort((a, b) => {
      const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0
      const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0
      return bTime - aTime
    })

    const sliced = merged.slice(0, limit)
    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1]?.last_activity ?? null : null

    return NextResponse.json({ data: sliced, nextCursor })
  } catch (error) {
    console.error('Unified messages list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
