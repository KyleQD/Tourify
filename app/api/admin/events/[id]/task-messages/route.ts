import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@supabase/supabase-js'
import { resolveTaskLink, isTaskSensitive } from '@/lib/messaging/task-link-registry'
import type { TaskAction, TaskLinkContext } from '@/lib/messaging/task-link-registry'

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const taskMessageSchema = z.object({
  recipient_ids: z.array(z.string().uuid()).min(1).max(50),
  task_action: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  due_date: z.string().optional(),
  context: z.object({
    eventId: z.string().optional(),
    tourId: z.string().optional(),
    venueId: z.string().optional(),
    jobId: z.string().optional(),
    documentId: z.string().optional(),
    onboardingToken: z.string().optional(),
    bulletinId: z.string().optional(),
    contractId: z.string().optional(),
    customUrl: z.string().optional(),
  }).optional(),
  is_sensitive: z.boolean().default(false),
  require_completion: z.boolean().default(false),
})

export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assigned_to')

    const svc = createServiceClient()

    let q = svc
      .from('event_task_messages')
      .select('*')
      .eq('event_id', eventId)

    if (status && status !== 'all') q = q.eq('status', status)
    if (assignedTo) q = q.contains('recipient_ids', [assignedTo])

    q = q.order('created_at', { ascending: false })

    const { data, error } = await q

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, tasks: [], _notice: 'table not yet created' })
      }
      console.error('[Task Messages] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch task messages' }, { status: 500 })
    }

    const isEventOwner = await checkEventOwnership(svc, eventId, user.id)
    const visibleTasks = isEventOwner
      ? data
      : (data || []).filter((t: any) => t.recipient_ids?.includes(user.id) || t.sender_id === user.id)

    return NextResponse.json({ success: true, tasks: visibleTasks || [] })
  } catch (error) {
    console.error('[Task Messages] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()

    const isOwner = await checkEventOwnership(svc, eventId, user.id)
    const participant = await getParticipantRole(svc, eventId, user.id)
    const isAdmin = isOwner || participant?.role === 'admin' || participant?.role === 'manager'

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins and managers can assign tasks' }, { status: 403 })
    }

    const body = await request.json()
    const validated = taskMessageSchema.parse(body)

    const taskAction = validated.task_action as TaskAction
    const linkContext: TaskLinkContext = {
      eventId,
      ...validated.context,
    }
    const actionUrl = resolveTaskLink(taskAction, linkContext)
    const sensitive = validated.is_sensitive || isTaskSensitive(taskAction)

    const { data: senderProfile } = await svc
      .from('profiles')
      .select('full_name, display_name, username')
      .eq('id', user.id)
      .single()

    const senderName = senderProfile?.display_name || senderProfile?.full_name || senderProfile?.username || 'Admin'

    const { data: taskMsg, error: insertError } = await svc
      .from('event_task_messages')
      .insert({
        event_id: eventId,
        sender_id: user.id,
        sender_name: senderName,
        recipient_ids: validated.recipient_ids,
        task_action: taskAction,
        title: validated.title,
        description: validated.description || null,
        action_url: actionUrl,
        priority: validated.priority,
        due_date: validated.due_date || null,
        is_sensitive: sensitive,
        require_completion: validated.require_completion,
        status: 'pending',
        completed_by: [],
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '42P01') {
        return NextResponse.json({ error: 'table not yet created — run migration' }, { status: 501 })
      }
      console.error('[Task Messages] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create task message' }, { status: 500 })
    }

    if (sensitive) {
      await svc.from('secure_audit_log').insert({
        event_id: eventId,
        actor_id: user.id,
        action: 'task_message.created',
        resource_type: 'event_task_message',
        resource_id: taskMsg.id,
        metadata: {
          task_action: taskAction,
          recipient_count: validated.recipient_ids.length,
          is_sensitive: true,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      })
    }

    for (const recipientId of validated.recipient_ids) {
      await svc.from('notifications').insert({
        user_id: recipientId,
        type: 'task_assigned',
        title: `Task: ${validated.title}`,
        content: `${senderName} assigned you a task${sensitive ? ' (contains sensitive material)' : ''}`,
        related_content_id: eventId,
        related_content_type: 'event',
        metadata: {
          event_id: eventId,
          task_id: taskMsg.id,
          task_action: taskAction,
          action_url: actionUrl,
          is_sensitive: sensitive,
          priority: validated.priority,
        },
        is_read: false,
      })
    }

    return NextResponse.json({ success: true, task: taskMsg })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Task Messages] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    const eventId = request.nextUrl.pathname.split('/')[5]
    const svc = createServiceClient()
    const body = await request.json()
    const { id, action } = body

    if (!id) return NextResponse.json({ error: 'Missing task id' }, { status: 400 })

    if (action === 'complete') {
      const { data: task } = await svc
        .from('event_task_messages')
        .select('completed_by, recipient_ids, require_completion, is_sensitive')
        .eq('id', id)
        .eq('event_id', eventId)
        .single()

      if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

      const completedBy = Array.isArray(task.completed_by) ? task.completed_by : []
      if (!completedBy.includes(user.id)) completedBy.push(user.id)

      const allComplete = task.recipient_ids?.every((rid: string) => completedBy.includes(rid))
      const newStatus = allComplete ? 'completed' : 'in_progress'

      await svc
        .from('event_task_messages')
        .update({ completed_by: completedBy, status: newStatus })
        .eq('id', id)

      if (task.is_sensitive) {
        await svc.from('secure_audit_log').insert({
          event_id: eventId,
          actor_id: user.id,
          action: 'task_message.completed',
          resource_type: 'event_task_message',
          resource_id: id,
          metadata: { completed_by_user: user.id },
          ip_address: request.headers.get('x-forwarded-for') || null,
        })
      }

      return NextResponse.json({ success: true, status: newStatus })
    }

    if (action === 'cancel') {
      const isOwner = await checkEventOwnership(svc, eventId, user.id)
      if (!isOwner) return NextResponse.json({ error: 'Only event admin can cancel tasks' }, { status: 403 })

      await svc.from('event_task_messages').update({ status: 'cancelled' }).eq('id', id).eq('event_id', eventId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Task Messages] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

async function checkEventOwnership(svc: any, eventId: string, userId: string): Promise<boolean> {
  const { data } = await svc
    .from('events_v2')
    .select('id')
    .eq('id', eventId)
    .eq('created_by', userId)
    .maybeSingle()
  return !!data
}

async function getParticipantRole(svc: any, eventId: string, userId: string) {
  const { data } = await svc
    .from('event_participants')
    .select('role')
    .eq('event_id', eventId)
    .eq('participant_id', userId)
    .eq('participant_type', 'Individual')
    .maybeSingle()
  return data
}
