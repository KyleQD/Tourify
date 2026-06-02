import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

const priorityRankMap: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const priorityLabelMap: Record<number, string> = {
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'critical',
}

const mapTaskStatusToEventTaskStatus: Record<string, 'todo' | 'doing' | 'done' | 'blocked'> = {
  pending: 'todo',
  in_progress: 'doing',
  completed: 'done',
  blocked: 'blocked',
  cancelled: 'blocked',
}

function toPriorityRank(priority?: string | number): number {
  if (typeof priority === 'number') return Math.min(4, Math.max(1, Math.round(priority)))
  if (!priority) return 2
  return priorityRankMap[priority] ?? 2
}

function toPriorityLabel(priority?: number | null): string {
  if (!priority) return 'medium'
  return priorityLabelMap[priority] ?? 'medium'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data, error } = await supabase
      .from('map_task_assignments')
      .select(`
        id,
        site_map_id,
        element_id,
        element_type,
        assigned_user_id,
        task_type,
        title,
        task_description,
        priority,
        status,
        due_date,
        scheduled_start_time,
        scheduled_end_time,
        actual_start_time,
        actual_end_time,
        created_by,
        created_at,
        updated_at,
        event_task_id,
        assigned_user:profiles!map_task_assignments_assigned_user_id_fkey(id, username, full_name, avatar_url),
        creator:profiles!map_task_assignments_created_by_fkey(id, username, full_name, avatar_url)
      `)
      .eq('site_map_id', siteMapId)
      .order('status', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Tasks API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tasks = (data || []).map((task: any) => {
      const assignedUser = Array.isArray(task.assigned_user) ? task.assigned_user[0] : task.assigned_user
      const creator = Array.isArray(task.creator) ? task.creator[0] : task.creator

      return {
        id: task.id,
        siteMapId: task.site_map_id,
        elementId: task.element_id,
        elementType: task.element_type,
        title: task.title || task.task_type || 'Untitled Task',
        description: task.task_description || '',
        priority: toPriorityLabel(task.priority),
        status: task.status,
        dueDate: task.due_date,
        assignedTo: task.assigned_user_id,
        assignedToName: assignedUser?.full_name || assignedUser?.username || null,
        createdBy: creator?.full_name || creator?.username || 'Unknown',
        createdAt: task.created_at,
        updatedAt: task.updated_at,
        completedAt: task.actual_end_time,
        eventTaskId: task.event_task_id,
      }
    })

    return NextResponse.json({ success: true, data: tasks })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const {
      action = 'ASSIGN_TASK',
      title,
      description,
      priority = 'medium',
      status,
      assignedTo,
      assignedToName,
      elementId,
      taskId,
      dueDate,
    } = body

    if (action === 'ASSIGN_TASK' && !title?.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    let dbTaskId = taskId as string | undefined
    let eventTaskId: string | null = null

    if (action === 'ASSIGN_TASK') {
      const taskStatus = status || 'pending'
      const taskPriority = toPriorityRank(priority)

      const { data: insertedTask, error } = await supabase
        .from('map_task_assignments')
        .insert({
          site_map_id: siteMapId,
          element_id: elementId || null,
          element_type: 'element',
          assigned_user_id: assignedTo || null,
          task_type: 'site_map',
          title: title?.trim(),
          task_description: description || null,
          priority: taskPriority,
          status: taskStatus,
          due_date: dueDate || null,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[Tasks API] Insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      dbTaskId = insertedTask.id

      const { data: siteMap } = await supabase
        .from('site_maps')
        .select('id, event_id, name')
        .eq('id', siteMapId)
        .single()

      if (siteMap?.event_id) {
        const { data: eventRow } = await supabase
          .from('events_v2')
          .select('org_id')
          .eq('id', siteMap.event_id)
          .maybeSingle()

        const { data: createdEventTask } = await supabase
          .from('tasks')
          .insert({
            event_id: siteMap.event_id,
            org_id: eventRow?.org_id || null,
            title: title?.trim(),
            description: description || null,
            assignee_id: assignedTo || null,
            due_at: dueDate || null,
            status: mapTaskStatusToEventTaskStatus[taskStatus] || 'todo',
            priority: priority in priorityRankMap ? priority : 'medium',
            labels: ['site_map'],
            created_by: user.id,
          })
          .select('id')
          .maybeSingle()

        if (createdEventTask?.id) {
          eventTaskId = createdEventTask.id
          await supabase
            .from('map_task_assignments')
            .update({ event_task_id: createdEventTask.id })
            .eq('id', dbTaskId)
        }
      }

      if (assignedTo) {
        await supabase
          .from('site_map_collaborators')
          .upsert(
            {
              site_map_id: siteMapId,
              user_id: assignedTo,
              can_edit: false,
              can_manage_tents: false,
              can_manage_zones: false,
              can_invite_users: false,
              can_export: true,
              is_active: true,
              invited_by: user.id,
              invited_at: new Date().toISOString(),
            },
            { onConflict: 'site_map_id,user_id' }
          )
      }
    } else {
      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required for task updates' }, { status: 400 })
      }

      const nextStatus = action === 'COMPLETE_TASK' ? 'completed' : status || 'in_progress'
      const updates: Record<string, any> = { status: nextStatus }
      if (action === 'COMPLETE_TASK') updates.actual_end_time = new Date().toISOString()
      if (dueDate) updates.due_date = dueDate

      const { data: updatedTask, error } = await supabase
        .from('map_task_assignments')
        .update(updates)
        .eq('id', taskId)
        .eq('site_map_id', siteMapId)
        .select('id, event_task_id')
        .single()

      if (error) {
        console.error('[Tasks API] Update error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      dbTaskId = updatedTask.id
      eventTaskId = updatedTask.event_task_id || null

      if (eventTaskId) {
        await supabase
          .from('tasks')
          .update({
            status: mapTaskStatusToEventTaskStatus[nextStatus] || 'doing',
            ...(dueDate ? { due_at: dueDate } : {}),
          })
          .eq('id', eventTaskId)
      }
    }

    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action,
        entity_type: 'task',
        entity_id: elementId || null,
        new_values: {
          taskId: dbTaskId,
          title,
          description,
          priority,
          assignedTo,
          assignedToName,
          status: action === 'COMPLETE_TASK' ? 'completed' : status || 'pending',
          dueDate: dueDate || null,
          eventTaskId,
        },
      })

    // Send notification to the assigned staff member
    if (action === 'ASSIGN_TASK' && assignedTo) {
      try {
        // Fetch assigner's name for the notification
        const { data: assignerProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single()

        const assignerName = assignerProfile?.full_name || assignerProfile?.username || 'Someone'

        // Fetch site map name
        const { data: siteMap } = await supabase
          .from('site_maps')
          .select('name, event_id')
          .eq('id', siteMapId)
          .single()

        await OptimizedNotificationService.createNotification({
          userId: assignedTo,
          type: 'site_map_task_assigned',
          title: 'New Task Assigned',
          content: `${assignerName} assigned you a task: "${title}" on site map "${siteMap?.name || 'Unknown'}"`,
          relatedUserId: user.id,
          metadata: {
            siteMapId,
            siteMapName: siteMap?.name,
            eventId: siteMap?.event_id,
            taskId: dbTaskId,
            title,
            priority,
            assignedBy: user.id,
            assignedByName: assignerName,
          },
        })
      } catch (notifErr) {
        console.warn('[Tasks API] Notification failed:', notifErr)
      }
    }

    // Notification for task completion
    if (action === 'COMPLETE_TASK' && assignedTo && assignedTo !== user.id) {
      try {
        const { data: completerProfile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single()

        await OptimizedNotificationService.createNotification({
          userId: assignedTo,
          type: 'site_map_task_completed',
          title: 'Task Completed',
          content: `${completerProfile?.full_name || 'Someone'} completed the task: "${title}"`,
          relatedUserId: user.id,
          metadata: { siteMapId, taskId: dbTaskId, title },
        })
      } catch {}
    }

    return NextResponse.json({ success: true, data: { taskId: dbTaskId, eventTaskId } })
  } catch (error) {
    console.error('[Tasks API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process task' }, { status: 500 })
  }
}
