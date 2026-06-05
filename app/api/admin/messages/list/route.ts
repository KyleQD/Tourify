import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface ThreadItem {
  id: string
  name: string
  type: 'group'
  last_message: string | null
  unread_count: number
  member_count: number
  last_activity: string | null
}

interface DmItem {
  id: string
  participant_id: string
  participant_name: string
  participant_avatar: string | null
  last_message: string | null
  unread_count: number
  is_trusted: boolean
  last_activity: string | null
}

export const GET = withAdminAuth(async (request: NextRequest, { user }) => {
  try {
    const svc = createServiceRoleClient()
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '50', 10), 100)

    const { data: memberships, error: membershipError } = await svc
      .from('thread_members')
      .select('thread_id, last_read_at')
      .eq('user_id', user.id)
      .is('left_at', null)

    if (membershipError) {
      console.error('[Admin Messages List] membership error:', membershipError)
      return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 })
    }

    const threadIds = (memberships || []).map((m) => m.thread_id as string)
    const lastReadByThread = new Map(
      (memberships || []).map((m) => [m.thread_id as string, m.last_read_at as string | null]),
    )
    let threads: ThreadItem[] = []

    if (threadIds.length > 0) {
      const { data: groupThreads, error: threadsError } = await svc
        .from('group_threads')
        .select(`
          id,
          name,
          updated_at,
          last_message:group_messages!last_message_id(content, created_at)
        `)
        .in('id', threadIds)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (threadsError) {
        console.error('[Admin Messages List] threads error:', threadsError)
        return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 })
      }

      const [memberCounts, unreadCounts] = await Promise.all([
        Promise.all(
          (groupThreads || []).map(async (thread) => {
            const { count } = await svc
              .from('thread_members')
              .select('user_id', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .is('left_at', null)
            return { id: thread.id as string, count: count || 0 }
          }),
        ),
        Promise.all(
          (groupThreads || []).map(async (thread) => {
            const lastRead = lastReadByThread.get(thread.id as string)
            let q = svc
              .from('group_messages')
              .select('id', { count: 'exact', head: true })
              .eq('thread_id', thread.id)
              .neq('sender_id', user.id)
            if (lastRead) q = q.gt('created_at', lastRead)
            const { count } = await q
            return { id: thread.id as string, count: count || 0 }
          }),
        ),
      ])
      const countByThread = new Map(memberCounts.map((row) => [row.id, row.count]))
      const unreadByThread = new Map(unreadCounts.map((row) => [row.id, row.count]))

      threads = (groupThreads || []).map((thread: any) => {
        const lastMessage = Array.isArray(thread.last_message) ? thread.last_message[0] : thread.last_message
        return {
          id: thread.id as string,
          name: thread.name as string,
          type: 'group' as const,
          last_message: lastMessage?.content ?? null,
          unread_count: unreadByThread.get(thread.id as string) || 0,
          member_count: countByThread.get(thread.id) || 0,
          last_activity: lastMessage?.created_at ?? thread.updated_at ?? null,
        }
      })
    }

    const { data: conversations, error: convError } = await svc
      .from('conversations')
      .select(`
        id,
        updated_at,
        participant_1,
        participant_2,
        trust_tier,
        accepted_at,
        last_message:messages!last_message_id(content, created_at)
      `)
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (convError) {
      console.error('[Admin Messages List] conversations error:', convError)
      return NextResponse.json({ error: 'Failed to load DMs' }, { status: 500 })
    }

    const otherIds = new Set<string>()
    for (const conv of conversations || []) {
      const other = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
      if (other) otherIds.add(other as string)
    }

    let profileById: Record<string, { full_name: string | null; username: string | null; avatar_url: string | null }> = {}
    if (otherIds.size > 0) {
      const { data: profiles } = await svc
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', [...otherIds])

      for (const profile of profiles || []) {
        profileById[profile.id as string] = {
          full_name: profile.full_name as string | null,
          username: profile.username as string | null,
          avatar_url: profile.avatar_url as string | null,
        }
      }
    }

    // Fetch unread counts for DMs — messages from the other party not yet read
    const dmUnreadMap = new Map<string, number>()
    if ((conversations || []).length > 0) {
      const unreadResults = await Promise.all(
        (conversations || []).map(async (conv: any) => {
          const { count } = await svc
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null)
          return { id: conv.id as string, count: count || 0 }
        }),
      )
      unreadResults.forEach(({ id, count }) => dmUnreadMap.set(id, count))
    }

    const dms: DmItem[] = (conversations || []).map((conv: any) => {
      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
      const profile = profileById[otherId as string]
      const lastMessage = Array.isArray(conv.last_message) ? conv.last_message[0] : conv.last_message
      const isTrusted = conv.trust_tier === 'open' || conv.trust_tier === 'context' || Boolean(conv.accepted_at)

      return {
        id: conv.id as string,
        participant_id: otherId as string,
        participant_name: profile?.full_name || profile?.username || `User ${(otherId as string).slice(0, 8)}`,
        participant_avatar: profile?.avatar_url ?? null,
        last_message: lastMessage?.content ?? null,
        unread_count: dmUnreadMap.get(conv.id as string) || 0,
        is_trusted: isTrusted,
        last_activity: lastMessage?.created_at ?? conv.updated_at ?? null,
      }
    })

    return NextResponse.json({ success: true, threads, dms })
  } catch (error) {
    console.error('[Admin Messages List] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
