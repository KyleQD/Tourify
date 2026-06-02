import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const mapTaskStatusToEventTaskStatus: Record<string, 'todo' | 'doing' | 'done' | 'blocked'> = {
  pending: 'todo',
  in_progress: 'doing',
  completed: 'done',
  blocked: 'blocked',
  cancelled: 'blocked',
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id: siteMapId, taskId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const updates: Record<string, any> = {}
    if (body.title) updates.title = body.title
    if (body.description !== undefined) updates.task_description = body.description
    if (body.priority) {
      const pMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 }
      updates.priority = pMap[body.priority] ?? 2
    }
    if (body.status) updates.status = body.status
    if (body.dueDate !== undefined) updates.due_date = body.dueDate
    if (body.assignedTo !== undefined) updates.assigned_user_id = body.assignedTo || null
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
          ...(body.assignedTo !== undefined ? { assignee_id: body.assignedTo || null } : {}),
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
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

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
