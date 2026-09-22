import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { applyConversationAccountScope } from '@/lib/messaging/account-scope'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().datetime().optional(),
  section: z.enum(['all', 'messages', 'channels', 'tasks', 'docs']).default('all'),
})

type Source = 'direct' | 'group' | 'event_group' | 'task' | 'bulletin' | 'document' | 'work_mode'

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
  action_url?: string | null
  priority?: string | null
  status?: string | null
}

function deriveDirectBadge(trustTier: string | null | undefined, contextType: string | null | undefined): string {
  if (trustTier === 'request') return 'Request'
  if (contextType && contextType !== 'workflow') return 'Work'
  if (contextType === 'workflow') return 'Workflow'
  return 'Primary'
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const parsedQuery = querySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      cursor: request.nextUrl.searchParams.get('cursor') ?? undefined,
      section: request.nextUrl.searchParams.get('section') ?? undefined,
    })
    if (!parsedQuery.success)
      return NextResponse.json({ error: 'Invalid query', details: parsedQuery.error.flatten() }, { status: 400 })
    const { limit, cursor, section } = parsedQuery.data

    const supabase = createServiceRoleClient()
    const userId = ctx.userId
    const inboxScope = {
      userId,
      profileId: ctx.profileId,
      accountType: ctx.accountType,
    }

    const includeMessages = section === 'all' || section === 'messages'
    const includeChannels = section === 'all' || section === 'channels'
    const includeTasks = section === 'all' || section === 'tasks'
    const includeDocs = section === 'all' || section === 'docs'

    let directQuery = includeMessages
      ? applyConversationAccountScope(
        supabase.from('conversations').select(`
          id,
          updated_at,
          trust_tier,
          context_type,
          last_message:messages!last_message_id(content, created_at)
        `),
        inboxScope,
      )
        // Work = ops/context threads only — never social account_follow brand DMs
        .in('context_type', ['event_team', 'venue_staff', 'job_application', 'workflow', 'org_staff'])
        .order('updated_at', { ascending: false })
        .limit(limit)
      : null
    if (directQuery && cursor) directQuery.lt('updated_at', cursor)

    const eventGroupsQuery = includeChannels
      ? (() => {
        const q = supabase
          .from('event_group_chats')
          .select(`
            id,
            event_id,
            name,
            created_at,
            member_ids,
            last_message:event_group_messages(content, created_at)
          `)
          .contains('member_ids', [userId])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (cursor) q.lt('created_at', cursor)
        return q
      })()
      : null

    const tasksQuery = includeTasks
      ? (() => {
        const q = supabase
          .from('event_task_messages')
          .select(`
            id,
            event_id,
            title,
            description,
            action_url,
            priority,
            status,
            created_at,
            updated_at,
            recipient_ids
          `)
          .contains('recipient_ids', [userId])
          .order('created_at', { ascending: false })
          .limit(limit)
        if (cursor) q.lt('created_at', cursor)
        return q
      })()
      : null

    const [directResult, membershipsResult, eventGroupsResult, tasksResult, participantEventsResult] = await Promise.all([
      directQuery ? directQuery : Promise.resolve({ data: [], error: null }),
      includeChannels
        ? supabase
          .from('thread_members')
          .select('thread_id')
          .eq('user_id', userId)
          .is('left_at', null)
        : Promise.resolve({ data: [], error: null }),
      eventGroupsQuery ? eventGroupsQuery : Promise.resolve({ data: [], error: null }),
      tasksQuery ? tasksQuery : Promise.resolve({ data: [], error: null }),
      includeDocs
        ? supabase
          .from('event_participants')
          .select('event_id')
          .eq('participant_id', userId)
          .eq('participant_type', 'Individual')
          .limit(50)
        : Promise.resolve({ data: [], error: null }),
    ])

    // Schema lag fallback for account-scoped direct query
    let directRows = directResult.data || []
    if (directResult.error && includeMessages) {
      const fallback = await supabase
        .from('conversations')
        .select(`
          id,
          updated_at,
          trust_tier,
          context_type,
          last_message:messages!last_message_id(content, created_at)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .in('context_type', ['event_team', 'venue_staff', 'job_application', 'workflow', 'org_staff'])
        .order('updated_at', { ascending: false })
        .limit(limit)
      directRows = fallback.data || []
    }

    const threadIds = (membershipsResult.data || []).map((membership: { thread_id: string }) => membership.thread_id)
    const groupThreadsQuery = includeChannels && threadIds.length > 0
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

    const eventIds = Array.from(
      new Set(
        (participantEventsResult.data || [])
          .map((row: { event_id: string }) => row.event_id)
          .filter(Boolean),
      ),
    )

    let bulletinItems: UnifiedItem[] = []
    let documentItems: UnifiedItem[] = []
    let workModeItems: UnifiedItem[] = []

    if (includeDocs && eventIds.length > 0) {
      const [bulletinsResult, documentsResult, publicationsResult] = await Promise.all([
        supabase
          .from('event_bulletins')
          .select('id, event_id, title, content, created_at, pinned')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('event_documents')
          .select('id, event_id, title, content, document_type, created_at')
          .in('event_id', eventIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        supabase
          .from('work_mode_publications')
          .select('id, event_id, title, publication_type, published_at, created_at')
          .in('event_id', eventIds)
          .order('published_at', { ascending: false })
          .limit(limit),
      ])

      bulletinItems = (bulletinsResult.data || []).map((item: any) => ({
        id: item.id,
        source: 'bulletin' as const,
        badge: item.pinned ? 'Pinned' : 'Bulletin',
        name: item.title,
        last_message: item.content || null,
        last_activity: item.created_at,
        event_id: item.event_id,
        action_url: `/admin/dashboard/events/${item.event_id}?tab=communications`,
      }))

      documentItems = (documentsResult.data || []).map((item: any) => ({
        id: item.id,
        source: 'document' as const,
        badge: 'Doc',
        name: item.title,
        last_message: item.document_type ? `${item.document_type} document` : 'Event document',
        last_activity: item.created_at,
        event_id: item.event_id,
        action_url: `/admin/dashboard/events/${item.event_id}?tab=communications`,
      }))

      workModeItems = (publicationsResult.data || []).map((item: any) => ({
        id: item.id,
        source: 'work_mode' as const,
        badge: 'Work Mode',
        name: item.title || item.publication_type,
        last_message: `Published ${item.publication_type || 'update'}`,
        last_activity: item.published_at || item.created_at,
        event_id: item.event_id,
        action_url: `/admin/dashboard/events/${item.event_id}`,
      }))
    }

    const directItems: UnifiedItem[] = directRows.map((item: any) => {
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
      const badge = item.thread_type === 'logistics' ? 'Logistics' : 'Group'
      return {
        id: item.id,
        source: 'group',
        badge,
        last_message: lastMessage?.content || null,
        last_activity: lastMessage?.created_at || item.updated_at,
        name: item.name,
        action_url: `/groups/${item.id}`,
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
        badge: 'Channel',
        last_message: latest?.content ?? null,
        last_activity: latest?.created_at ?? item.created_at,
        name: item.name,
        event_id: item.event_id,
        action_url: item.event_id
          ? `/admin/dashboard/events/${item.event_id}?tab=communications&chat=${item.id}`
          : null,
      }
    })

    const taskItems: UnifiedItem[] = (tasksResult.data || []).map((item: any) => ({
      id: item.id,
      source: 'task' as const,
      badge: item.priority === 'high' || item.priority === 'urgent' ? 'Urgent task' : 'Task',
      name: item.title,
      last_message: item.description || null,
      last_activity: item.updated_at || item.created_at,
      event_id: item.event_id,
      action_url: item.action_url || null,
      priority: item.priority || null,
      status: item.status || null,
    }))

    const merged = [
      ...directItems,
      ...groupItems,
      ...eventGroupItems,
      ...taskItems,
      ...bulletinItems,
      ...documentItems,
      ...workModeItems,
    ].sort((a, b) => {
      const aTime = a.last_activity ? new Date(a.last_activity).getTime() : 0
      const bTime = b.last_activity ? new Date(b.last_activity).getTime() : 0
      return bTime - aTime
    })

    const sliced = merged.slice(0, limit)
    const nextCursor = sliced.length === limit ? sliced[sliced.length - 1]?.last_activity ?? null : null

    return NextResponse.json({
      data: sliced,
      nextCursor,
      inbox: { profileId: ctx.profileId, accountType: ctx.accountType },
      sections: {
        messages: directItems.length,
        channels: groupItems.length + eventGroupItems.length,
        tasks: taskItems.length,
        docs: bulletinItems.length + documentItems.length + workModeItems.length,
      },
    })
  } catch (error) {
    console.error('Unified messages list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
