import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasWorkflowThreadPermission } from '@/lib/workflows/workflow-permissions'
import { recordAchievementMetricEvent } from '@/lib/services/achievement-metric-events.service'

const createTaskSchema = z.object({
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional(),
  assignee_id: z.string().uuid().optional(),
  status: z.enum(['todo', 'doing', 'done', 'blocked']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  due_at: z.string().datetime().optional(),
  dependency_task_ids: z.array(z.string().uuid()).default([]),
  labels: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
})

const updateTaskSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(['todo', 'doing', 'done', 'blocked']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignee_id: z.string().uuid().nullable().optional(),
  due_at: z.string().datetime().nullable().optional(),
  title: z.string().min(1).max(240).optional(),
  description: z.string().max(4000).nullable().optional(),
  dependency_task_ids: z.array(z.string().uuid()).optional(),
  labels: z.array(z.string()).optional(),
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
    const status = url.searchParams.get('status')
    const assigneeId = url.searchParams.get('assignee_id')

    let query = supabase
      .from('workflow_tasks')
      .select('id, thread_id, title, description, assignee_id, status, priority, due_at, dependency_task_ids, labels, metadata, created_by, created_at, updated_at')
      .eq('thread_id', id)
      .order('created_at', { ascending: false })
      .limit(300)

    if (status) query = query.eq('status', status)
    if (assigneeId) query = query.eq('assignee_id', assigneeId)

    const { data, error } = await query
    if (error) {
      console.error('[workflow tasks GET]', error)
      return NextResponse.json({ error: 'Failed to fetch thread tasks' }, { status: 500 })
    }

    return NextResponse.json({ success: true, tasks: data || [] })
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
      const validated = createTaskSchema.parse(body)

      const { data, error } = await supabase
        .from('workflow_tasks')
        .insert({
          thread_id: id,
          title: validated.title,
          description: validated.description ?? null,
          assignee_id: validated.assignee_id ?? null,
          status: validated.status,
          priority: validated.priority,
          due_at: validated.due_at ?? null,
          dependency_task_ids: validated.dependency_task_ids,
          labels: validated.labels,
          metadata: validated.metadata ?? {},
          created_by: user.id,
        })
        .select('id, thread_id, title, description, assignee_id, status, priority, due_at, dependency_task_ids, labels, metadata, created_by, created_at, updated_at')
        .single()

      if (error) {
        console.error('[workflow tasks POST]', error)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
      }

      await Promise.all([
        supabase.from('workflow_threads').update({ updated_at: new Date().toISOString() }).eq('id', id),
        supabase.from('workflow_events_audit').insert({
          thread_id: id,
          actor_user_id: user.id,
          action: 'task.created',
          entity_type: 'task',
          entity_id: data.id,
          metadata: { assignee_id: data.assignee_id, priority: data.priority },
        }),
      ])

      return NextResponse.json({ success: true, task: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
      console.error('[workflow tasks POST]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function PATCH(
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
      const validated = updateTaskSchema.parse(body)
      const { data: existingTask } = await supabase
        .from('workflow_tasks')
        .select('id, status')
        .eq('id', validated.task_id)
        .eq('thread_id', id)
        .maybeSingle()

      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
      if (validated.status !== undefined) updatePayload.status = validated.status
      if (validated.priority !== undefined) updatePayload.priority = validated.priority
      if (validated.assignee_id !== undefined) updatePayload.assignee_id = validated.assignee_id
      if (validated.due_at !== undefined) updatePayload.due_at = validated.due_at
      if (validated.title !== undefined) updatePayload.title = validated.title
      if (validated.description !== undefined) updatePayload.description = validated.description
      if (validated.dependency_task_ids !== undefined) updatePayload.dependency_task_ids = validated.dependency_task_ids
      if (validated.labels !== undefined) updatePayload.labels = validated.labels
      if (validated.metadata !== undefined) updatePayload.metadata = validated.metadata

      const { data, error } = await supabase
        .from('workflow_tasks')
        .update(updatePayload)
        .eq('id', validated.task_id)
        .eq('thread_id', id)
        .select('id, thread_id, title, description, assignee_id, status, priority, due_at, dependency_task_ids, labels, metadata, created_by, created_at, updated_at')
        .single()

      if (error) {
        console.error('[workflow tasks PATCH]', error)
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      }

      await supabase.from('workflow_events_audit').insert({
        thread_id: id,
        actor_user_id: user.id,
        action: 'task.updated',
        entity_type: 'task',
        entity_id: validated.task_id,
        metadata: updatePayload,
      })

      const becameDone =
        existingTask?.status !== 'done' &&
        (validated.status === 'done' || data.status === 'done')
      if (becameDone) {
        await recordAchievementMetricEvent({
          supabase,
          userId: user.id,
          metricKey: 'tasks_completed_total',
          eventType: 'workflow_task_completed',
          delta: 1,
          eventData: {
            thread_id: id,
            task_id: validated.task_id,
          },
          relatedCollaborationId: id,
        })
      }

      return NextResponse.json({ success: true, task: data })
    } catch (error) {
      if (error instanceof z.ZodError)
        return NextResponse.json({ error: 'Validation error', details: error.flatten() }, { status: 400 })
      console.error('[workflow tasks PATCH]', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
