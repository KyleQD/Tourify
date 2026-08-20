import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_ACTIONS = new Set(['COMPLETE_TASK', 'BLOCK_TASK', 'UPDATE_CHECKLIST'])

function siteMapError(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' ? body.action : ''
    const taskId = typeof body?.taskId === 'string' ? body.taskId : ''
    if (!ALLOWED_ACTIONS.has(action)) return siteMapError('Unsupported worker task action', 422)
    if (!taskId) return siteMapError('taskId is required', 422)

    const { data: siteMap, error: siteMapReadError } = await supabase
      .from('site_maps')
      .select('id, event_id, tour_id')
      .eq('id', siteMapId)
      .maybeSingle()
    if (siteMapReadError) return siteMapError(siteMapReadError.message, 500)
    if (!siteMap) return siteMapError('Site map not found', 404)

    let assignmentQuery = supabase
      .from('employment_assignments')
      .select('id, department, event_id, status')
      .eq('user_id', user.id)
      .in('status', ['confirmed', 'active'])
    if (siteMap.event_id) assignmentQuery = assignmentQuery.eq('event_id', siteMap.event_id)
    const { data: assignment } = await assignmentQuery.limit(1).maybeSingle()
    const department = assignment?.department || null

    const { data: existingTask, error: taskReadError } = await supabase
      .from('map_task_assignments')
      .select('id, title, assigned_user_id, assigned_role, status, checklist, event_task_id')
      .eq('id', taskId)
      .eq('site_map_id', siteMapId)
      .maybeSingle()
    if (taskReadError) return siteMapError(taskReadError.message, 500)
    if (!existingTask) return siteMapError('Task not found', 404)

    const assignedToUser = existingTask.assigned_user_id === user.id
    const assignedToDepartment =
      department &&
      existingTask.assigned_role &&
      String(existingTask.assigned_role).toLowerCase().includes(String(department).toLowerCase())
    if (!assignment && !assignedToUser) {
      return siteMapError('Task not available for this Work Mode assignment', 403)
    }
    if (!assignedToUser && !assignedToDepartment) {
      return siteMapError('Task not assigned to this worker', 403)
    }

    const updates: Record<string, unknown> = {}
    if (action === 'COMPLETE_TASK') {
      updates.status = 'completed'
      updates.actual_end_time = new Date().toISOString()
    }
    if (action === 'BLOCK_TASK') {
      updates.status = 'blocked'
      updates.blocker_reason =
        typeof body?.blockerReason === 'string' && body.blockerReason.trim()
          ? body.blockerReason.trim()
          : null
    }
    if (action === 'UPDATE_CHECKLIST') {
      if (!Array.isArray(body?.checklist)) return siteMapError('checklist is required', 422)
      updates.checklist = body.checklist
    }

    const { data: updatedTask, error: updateError } = await supabase
      .from('map_task_assignments')
      .update(updates)
      .eq('id', taskId)
      .eq('site_map_id', siteMapId)
      .select('id, status, event_task_id')
      .maybeSingle()
    if (updateError) return siteMapError(updateError.message, 500)
    if (!updatedTask) return siteMapError('Task changed. Refresh and try again.', 409)

    if (updatedTask.event_task_id && typeof updates.status === 'string') {
      await supabase
        .from('tasks')
        .update({ status: updates.status === 'completed' ? 'done' : 'blocked' })
        .eq('id', updatedTask.event_task_id)
    }

    await supabase.from('site_map_activity_log').insert({
      site_map_id: siteMapId,
      user_id: user.id,
      action,
      entity_type: 'task',
      entity_id: taskId,
      new_values: {
        taskId,
        status: updates.status ?? existingTask.status,
        checklist: updates.checklist ?? existingTask.checklist ?? [],
        blockerReason: updates.blocker_reason ?? null,
        source: 'work_mode',
      },
    })

    return NextResponse.json({ success: true, data: updatedTask })
  } catch (error) {
    console.error('[Work Site Map Tasks POST]', error)
    return siteMapError(error instanceof Error ? error.message : 'Failed to update worker task', 500)
  }
}
