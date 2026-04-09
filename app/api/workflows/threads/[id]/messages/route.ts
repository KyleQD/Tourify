import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'

const createMessageSchema = z.object({
  body: z.string().min(1).max(5000),
  message_type: z.enum(['text', 'system', 'task_update', 'approval', 'file']).default('text'),
  metadata: z.record(z.string(), z.any()).optional(),
})

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
      .from('workflow_messages')
      .select('id, thread_id, sender_id, message_type, body, metadata, created_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[workflow messages GET]', error)
      return NextResponse.json({ error: 'Failed to fetch thread messages' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messages: data || [] })
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAuth(async (req, { supabase, user }) => {
    if (!isWorkflowEnabled())
      return NextResponse.json({ error: 'Workflow threads are disabled' }, { status: 404 })

    const canWrite = await hasWorkflowThreadPermission({
      supabase,
      threadId: id,
      userId: user.id,
      permission: 'write',
    })
    if (!canWrite) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    try {
      const body = await req.json()
      const validated = createMessageSchema.parse(body)

      const { data, error } = await supabase
        .from('workflow_messages')
        .insert({
          thread_id: id,
          sender_id: user.id,
          message_type: validated.message_type,
          body: validated.body.trim(),
          metadata: validated.metadata ?? {},
        })
        .select('id, thread_id, sender_id, message_type, body, metadata, created_at')
        .single()

      if (error) {
        console.error('[workflow messages POST]', error)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
      }

      await Promise.all([
        supabase.from('workflow_threads').update({ updated_at: new Date().toISOString() }).eq('id', id),
        supabase.from('workflow_events_audit').insert({
          thread_id: id,
          actor_user_id: user.id,
          action: 'message.created',
          entity_type: 'message',
          entity_id: data.id,
          metadata: { message_type: data.message_type },
        }),
      ])

      return NextResponse.json({ success: true, message: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
      console.error('[workflow messages POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
