import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

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

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('event_id', reference.id)
        .order('due_at', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('[event tasks GET]', error)
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
      }

      return NextResponse.json({ success: true, tasks: data || [] })
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
      if (!canEditTasks) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      const body = await request.json()
      const validated = createTaskSchema.parse(body)

      const { data: event } = await supabase
        .from('events_v2')
        .select('org_id')
        .eq('id', reference.id)
        .single()

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...validated,
          event_id: reference.id,
          org_id: event.org_id,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[event tasks POST]', error)
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
      }

      return NextResponse.json({ success: true, task: data })
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation error', details: err.errors }, { status: 400 })
      }
      console.error('[event tasks POST]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
