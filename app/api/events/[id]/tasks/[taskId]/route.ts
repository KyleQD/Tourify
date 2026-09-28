import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../../_lib/event-permissions'
import { resolveEventReference } from '../../../_lib/event-reference'
import {
  EVENT_WORKFLOW_TASK_SELECT,
  getEventWorkflowContext,
  recordEventTaskAudit,
} from '@/lib/events/event-task-workflow'
import { sendWorkforceActivityNotification } from '@/lib/rebuild/workforce-activity-notify'

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().nullable().optional(),
  status: z.enum(['todo', 'doing', 'done', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  labels: z.array(z.string()).optional(),
})

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id: eventParam, taskId } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      const canEditTasks = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditTasks) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

      const body = await request.json()
      const validated = updateTaskSchema.parse(body)
      const { threadId } = await getEventWorkflowContext({ supabase, reference, userId: user.id })

      const { data: existingTask } = await supabase
        .from('workflow_tasks')
        .select('id, title, status, created_by')
        .eq('id', taskId)
        .eq('thread_id', threadId)
        .maybeSingle()

      const { data, error } = await supabase
        .from('workflow_tasks')
        .update(validated)
        .eq('id', taskId)
        .eq('thread_id', threadId)
        .select(EVENT_WORKFLOW_TASK_SELECT)
        .single()

      if (error) {
        console.error('[event tasks PATCH]', error)
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      }
      if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

      await recordEventTaskAudit({
        supabase,
        threadId,
        userId: user.id,
        action: 'task.updated.event',
        taskId,
        metadata: validated,
      })

      if (existingTask?.status !== 'done' && data.status === 'done') {
        const recipientUserId = existingTask.created_by !== user.id
          ? existingTask.created_by
          : reference.ownerUserId !== user.id ? reference.ownerUserId : null
        if (recipientUserId) {
          await sendWorkforceActivityNotification({
            recipientUserId,
            actorUserId: user.id,
            type: 'workflow_task_completed',
            title: 'Task completed',
            content: `${existingTask.title || data.title || 'An event task'} was marked complete.`,
            sourceType: 'workflow_task',
            sourceId: taskId,
            link: `/admin/dashboard/events/${eventParam}?tab=tasks`,
          }).catch((notifyError) => console.warn('[event tasks PATCH] completion notification failed', notifyError))
        }
      }

      return NextResponse.json({ success: true, task: data, source: 'workflow_tasks' })
    } catch (err) {
      if (err instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id: eventParam, taskId } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      const canEditTasks = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditTasks) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

      const { threadId } = await getEventWorkflowContext({ supabase, reference, userId: user.id })
      const { error } = await supabase
        .from('workflow_tasks')
        .delete()
        .eq('id', taskId)
        .eq('thread_id', threadId)

      if (error) {
        console.error('[event tasks DELETE]', error)
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
      }

      await recordEventTaskAudit({
        supabase,
        threadId,
        userId: user.id,
        action: 'task.deleted.event',
        taskId,
      })

      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
