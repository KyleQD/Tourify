import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../../_lib/event-permissions'
import { resolveEventReference } from '../../../_lib/event-reference'

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
      if (reference.table !== 'events_v2') {
        return NextResponse.json(
          { error: 'Task operations currently require an events_v2 event' },
          { status: 400 }
        )
      }
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

      const { data, error } = await supabase
        .from('tasks')
        .update(validated)
        .eq('id', taskId)
        .eq('event_id', reference.id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

      return NextResponse.json({ success: true, task: data })
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
      if (reference.table !== 'events_v2') {
        return NextResponse.json(
          { error: 'Task operations currently require an events_v2 event' },
          { status: 400 }
        )
      }
      const canEditTasks = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canEditTasks) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('event_id', reference.id)

      if (error) return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
