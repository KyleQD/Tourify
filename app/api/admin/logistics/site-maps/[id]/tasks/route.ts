import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Fetch tasks from activity log entries with action = 'ASSIGN_TASK'
    const { data, error } = await supabase
      .from('site_map_activity_log')
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('site_map_id', siteMapId)
      .in('action', ['ASSIGN_TASK', 'COMPLETE_TASK', 'UPDATE_TASK'])
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[Tasks API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build a task state map by aggregating events per task (entity_id)
    const taskMap = new Map<string, any>()
    const items = (data || []).reverse()

    for (const item of items) {
      const taskId = item.new_values?.taskId || item.id
      const profile = Array.isArray(item.user) ? item.user[0] : item.user
      if (item.action === 'ASSIGN_TASK') {
        taskMap.set(taskId, {
          id: taskId,
          elementId: item.entity_id,
          title: item.new_values?.title || 'Untitled Task',
          description: item.new_values?.description || '',
          priority: item.new_values?.priority || 'medium',
          assignedTo: item.new_values?.assignedTo || null,
          assignedToName: item.new_values?.assignedToName || null,
          status: 'pending',
          createdBy: profile?.full_name || profile?.username || 'Unknown',
          createdAt: item.created_at,
          completedAt: null
        })
      }
      if (item.action === 'COMPLETE_TASK' && taskMap.has(taskId)) {
        const task = taskMap.get(taskId)!
        task.status = 'completed'
        task.completedAt = item.created_at
        task.completedBy = profile?.full_name || profile?.username
      }
      if (item.action === 'UPDATE_TASK' && taskMap.has(taskId)) {
        const task = taskMap.get(taskId)!
        if (item.new_values?.status) task.status = item.new_values.status
      }
    }

    const tasks = Array.from(taskMap.values()).sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1
      if (a.status !== 'completed' && b.status === 'completed') return -1
      const prio = { high: 0, medium: 1, low: 2 }
      return (prio[a.priority as keyof typeof prio] ?? 1) - (prio[b.priority as keyof typeof prio] ?? 1)
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
    const { action = 'ASSIGN_TASK', title, description, priority = 'medium', assignedTo, assignedToName, elementId, taskId } = body

    if (action === 'ASSIGN_TASK' && !title?.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    const newTaskId = taskId || `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Log the task action
    const { data: logEntry, error } = await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action,
        entity_type: 'task',
        entity_id: elementId || null,
        new_values: {
          taskId: newTaskId,
          title,
          description,
          priority,
          assignedTo,
          assignedToName,
          status: action === 'COMPLETE_TASK' ? 'completed' : 'pending'
        }
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('[Tasks API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

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
            taskId: newTaskId,
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
          metadata: { siteMapId, taskId: newTaskId, title },
        })
      } catch {}
    }

    return NextResponse.json({ success: true, data: { id: logEntry.id, taskId: newTaskId } })
  } catch (error) {
    console.error('[Tasks API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to process task' }, { status: 500 })
  }
}
