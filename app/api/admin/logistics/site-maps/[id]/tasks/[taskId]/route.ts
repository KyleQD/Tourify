import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError } from '@/lib/site-map/access'

const mapTaskStatusToEventTaskStatus: Record<string, 'todo' | 'doing' | 'done' | 'blocked'> = {
  pending: 'todo',
  in_progress: 'doing',
  completed: 'done',
  blocked: 'blocked',
  cancelled: 'blocked',
}

function isUuid(value?: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: siteMapId, taskId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const body = await request.json()
    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'completeTask')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const { data: existingTask } = await supabase
      .from('map_task_assignments')
      .select('id, assigned_user_id')
      .eq('id', taskId)
      .eq('site_map_id', siteMapId)
      .single()

    if (!existingTask) return siteMapError('Task not found', 404)
    if (!access.canEdit && existingTask.assigned_user_id !== user.id) return siteMapError('Forbidden', 403)

    const updates: Record<string, any> = {}
    if (access.canEdit && body.title) updates.title = body.title
    if (access.canEdit && body.description !== undefined) updates.task_description = body.description
    if (access.canEdit && body.priority) {
      const pMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
      updates.priority = pMap[body.priority] ?? 2
    }
    if (body.status) updates.status = body.status
    if (access.canEdit && body.dueDate !== undefined) updates.due_date = body.dueDate
    if (access.canEdit && (body.assignedTo !== undefined || body.assignedUserId !== undefined)) {
      updates.assigned_user_id = body.assignedUserId || body.assignedTo || null
    }
    if (access.canEdit && body.assignedTeamId !== undefined) {
      updates.assigned_team_id = isUuid(body.assignedTeamId) ? body.assignedTeamId : null
      if (!isUuid(body.assignedTeamId) && body.assignedTeamId) updates.assigned_role = body.assignedTeamId
    }
    if (access.canEdit && body.assignedRole !== undefined) updates.assigned_role = body.assignedRole || updates.assigned_role || null
    if (access.canEdit && body.coordinate !== undefined) updates.coordinate = body.coordinate || null
    if (Array.isArray(body.checklist)) updates.checklist = body.checklist
    if (body.blockerReason !== undefined) updates.blocker_reason = body.blockerReason || null
    if (body.status === 'completed') updates.actual_end_time = new Date().toISOString()

    const { data: updatedTask, error } = await supabase
      .from('map_task_assignments')
      .update(updates)
      .eq('id', taskId)
      .eq('site_map_id', siteMapId)
      .select('id, site_map_id, event_task_id, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (updatedTask.event_task_id) {
      await supabase
        .from('tasks')
        .update({
          ...(body.title ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description || null } : {}),
          ...(body.assignedTo !== undefined || body.assignedUserId !== undefined ? { assignee_id: body.assignedUserId || body.assignedTo || null } : {}),
          ...(body.dueDate !== undefined ? { due_at: body.dueDate || null } : {}),
          ...(updatedTask.status ? { status: mapTaskStatusToEventTaskStatus[updatedTask.status] || 'doing' } : {}),
          ...(body.priority ? { priority: body.priority } : {}),
        })
        .eq('id', updatedTask.event_task_id)
    }

    return NextResponse.json({ success: true, data: updatedTask })
  } catch {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: siteMapId, taskId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const { data: task } = await supabase
      .from('map_task_assignments')
      .select('event_task_id')
      .eq('id', taskId)
      .eq('site_map_id', siteMapId)
      .single()

    const { error } = await supabase
      .from('map_task_assignments')
      .delete()
      .eq('id', taskId)
      .eq('site_map_id', siteMapId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (task?.event_task_id) {
      await supabase.from('tasks').delete().eq('id', task.event_task_id)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
