import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'
import {
  EVENT_WORKFLOW_TASK_SELECT,
  getEventWorkflowContext,
  recordEventTaskAudit,
} from '@/lib/events/event-task-workflow'

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignee_id: z.string().uuid().optional(),
  due_at: z.string().optional(),
  status: z.enum(['todo', 'doing', 'done', 'blocked']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  labels: z.array(z.string()).default([]),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      const canViewTasks = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canViewTasks) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const { threadId } = await getEventWorkflowContext({ supabase, reference, userId: user.id })
      const { data, error } = await supabase
        .from('workflow_tasks')
        .select(EVENT_WORKFLOW_TASK_SELECT)
        .eq('thread_id', threadId)
        .order('due_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[event tasks GET]', error)
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
      }

      return NextResponse.json({ success: true, tasks: data || [], source: 'workflow_tasks' })
    } catch (err) {
      console.error('[event tasks GET]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }
      const canEditTasks = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditTasks) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = createTaskSchema.parse(body)

      const { threadId, orgId } = await getEventWorkflowContext({ supabase, reference, userId: user.id })
      const { data, error } = await supabase.from('workflow_tasks').insert({
        ...validated,
        thread_id: threadId,
        metadata: { event_id: reference.id, org_id: orgId },
        created_by: user.id,
      }).select(EVENT_WORKFLOW_TASK_SELECT).single()

      if (error) {
        console.error('[event tasks POST]', error)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
      }

      await recordEventTaskAudit({
        supabase,
        threadId,
        userId: user.id,
        action: 'task.created.event',
        taskId: data.id,
        metadata: { assignee_id: data.assignee_id, priority: data.priority },
      })

      return NextResponse.json({ success: true, task: data, source: 'workflow_tasks' }, { status: 201 })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event tasks POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
