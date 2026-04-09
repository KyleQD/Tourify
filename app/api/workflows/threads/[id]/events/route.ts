import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'

function isWorkflowEnabled() {
  return process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === '1'
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    if (!isWorkflowEnabled())
      return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

    const canRead = await hasWorkflowThreadPermission({
      supabase,
      threadId: id,
      userId: user.id,
      permission: 'read',
    })
    if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const limitParam = Number(url.searchParams.get('limit') || 100)
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 100

    const { data, error } = await supabase
      .from('workflow_events_audit')
      .select('id, thread_id, actor_user_id, action, entity_type, entity_id, metadata, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[workflow events GET]', error)
      return NextResponse.json({ error: 'Failed to fetch thread events' }, { status: 500 })
    }

    return NextResponse.json({ success: true, events: data || [] })
  })(request)
}
