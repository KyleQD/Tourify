import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { user } = auth
    const hasAdmin = await checkAdminPermissions(user)
    if (!hasAdmin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const svc = createServiceRoleClient()
    const { data: rows, error } = await svc
      .from('conversations')
      .select('id, updated_at, participant_1, participant_2, last_message_id')
      .order('updated_at', { ascending: false })
      .limit(40)

    if (error) {
      console.error('[Admin Messages Threads API] Query error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch threads' }, { status: 500 })
    }

    const lastIds = [...new Set((rows || []).map((r: any) => r.last_message_id).filter(Boolean))] as string[]
    let contentByMessageId: Record<string, { content: string; created_at: string }> = {}
    if (lastIds.length > 0) {
      const { data: msgs } = await svc
        .from('messages')
        .select('id, content, created_at')
        .in('id', lastIds)
      for (const m of msgs || []) {
        contentByMessageId[m.id as string] = {
          content: (m.content as string) || '',
          created_at: (m.created_at as string) || '',
        }
      }
    }

    const ids = new Set<string>()
    for (const row of rows || []) {
      if (row.participant_1) ids.add(row.participant_1 as string)
      if (row.participant_2) ids.add(row.participant_2 as string)
    }

    const idList = [...ids]
    let nameById: Record<string, string> = {}
    if (idList.length > 0) {
      const { data: profiles } = await svc
        .from('profiles')
        .select('id, full_name, username')
        .in('id', idList)

      for (const p of profiles || []) {
        const label = (p.full_name as string) || (p.username as string) || (p.id as string).slice(0, 8)
        nameById[p.id as string] = label
      }
    }

    const threads = (rows || []).map((row: any) => {
      const a = row.participant_1 as string
      const b = row.participant_2 as string
      const labelA = nameById[a] || a?.slice(0, 8) || 'User'
      const labelB = nameById[b] || b?.slice(0, 8) || 'User'
      const lm = row.last_message_id ? contentByMessageId[row.last_message_id as string] : null
      const preview = lm?.content ? lm.content.slice(0, 120) : ''
      return {
        id: row.id as string,
        groupName: `${labelA} · ${labelB}`,
        lastMessage: preview || 'No messages yet',
        unreadCount: 0,
        updatedAt: row.updated_at as string,
      }
    })

    return NextResponse.json({ success: true, threads })
  } catch (error) {
    console.error('[Admin Messages Threads API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch threads' }, { status: 500 })
  }
}
