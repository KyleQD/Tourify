import { createClient } from '@supabase/supabase-js'

interface WorkflowAutomationResult {
  processedThreads: number
  reminderCount: number
  escalationCount: number
  nudgeCount: number
}

interface WorkflowThreadSummary {
  id: string
  scope_type: 'event' | 'tour'
  scope_id: string
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function runWorkflowAutomations(): Promise<WorkflowAutomationResult> {
  const admin = createServiceClient()
  if (!admin) return { processedThreads: 0, reminderCount: 0, escalationCount: 0, nudgeCount: 0 }

  const nowIso = new Date().toISOString()
  const soonIso = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

  const { data: threads } = await admin
    .from('workflow_threads')
    .select('id, scope_type, scope_id')
    .eq('status', 'active')
    .limit(500)

  const threadRows = ((threads || []) as WorkflowThreadSummary[])
  const threadIds = threadRows.map((item) => item.id)
  if (threadIds.length === 0)
    return { processedThreads: 0, reminderCount: 0, escalationCount: 0, nudgeCount: 0 }

  const threadById = new Map(threadRows.map((thread) => [thread.id, thread]))

  const { data: tasks } = await admin
    .from('workflow_tasks')
    .select('id, thread_id, status, due_at, assignee_id, metadata')
    .in('thread_id', threadIds)

  const taskRows = tasks || []
  const reassignmentReminderTasks = taskRows.filter(
    (task) => task.status !== 'done' && task.assignee_id && task.due_at && task.due_at <= soonIso
  )
  const escalationTasks = taskRows.filter(
    (task) => task.status === 'blocked' || (task.status !== 'done' && task.due_at && task.due_at < nowIso)
  )

  const approvalsNeededByThread = new Map<string, number>()
  for (const task of taskRows) {
    const metadata = (task as any).metadata || {}
    if (metadata?.approval_required === true && task.status !== 'done') {
      approvalsNeededByThread.set(task.thread_id, (approvalsNeededByThread.get(task.thread_id) || 0) + 1)
    }
  }

  if (reassignmentReminderTasks.length > 0) {
    await admin.from('workflow_events_audit').insert(
      reassignmentReminderTasks.map((task) => ({
        thread_id: task.thread_id,
        action: 'automation.task_reassignment_reminder',
        entity_type: 'task',
        entity_id: task.id,
        metadata: { due_at: task.due_at, assignee_id: task.assignee_id },
      }))
    )
  }

  if (escalationTasks.length > 0) {
    await admin.from('workflow_events_audit').insert(
      escalationTasks.map((task) => ({
        thread_id: task.thread_id,
        action: 'automation.blocked_task_escalation',
        entity_type: 'task',
        entity_id: task.id,
        metadata: { status: task.status, due_at: task.due_at },
      }))
    )
  }

  if (approvalsNeededByThread.size > 0) {
    await admin.from('workflow_events_audit').insert(
      Array.from(approvalsNeededByThread.entries()).map(([threadId, count]) => ({
        thread_id: threadId,
        action: 'automation.approval_required_nudge',
        entity_type: 'thread',
        entity_id: threadId,
        metadata: { pending_approval_tasks: count },
      }))
    )
  }

  if (process.env.WORKFLOW_ALERTS_WEBHOOK_URL && escalationTasks.length > 0) {
    try {
      const deepLinks = Array.from(
        new Set(
          escalationTasks
            .map((task) => threadById.get(task.thread_id))
            .filter((thread): thread is WorkflowThreadSummary => Boolean(thread))
            .map((thread) =>
              buildWorkflowActivityDeepLink({
                scopeType: thread.scope_type,
                scopeId: thread.scope_id,
                filter: 'task',
              })
            )
            .filter(Boolean)
        )
      ).slice(0, 20)

      await fetch(process.env.WORKFLOW_ALERTS_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          source: 'workflow_automation',
          event: 'critical_workflow_sla',
          blocked_or_overdue_count: escalationTasks.length,
          generated_at: new Date().toISOString(),
          deep_link_label: 'Open workflow task timeline',
          deep_link_type: 'workflow_task',
          deep_link: deepLinks[0] || null,
          deep_links: deepLinks,
        }),
      })
    } catch (error) {
      console.warn('[workflow automation] webhook dispatch failed:', error)
    }
  }

  return {
    processedThreads: threadIds.length,
    reminderCount: reassignmentReminderTasks.length,
    escalationCount: escalationTasks.length,
    nudgeCount: approvalsNeededByThread.size,
  }
}

function buildWorkflowActivityDeepLink(input: {
  scopeType: 'event' | 'tour'
  scopeId: string
  filter: 'task' | 'message' | 'participant' | 'automation' | 'thread'
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
  if (input.scopeType === 'tour') {
    const path = `/admin/dashboard/tours/${input.scopeId}?tab=overview&workflowFilter=${input.filter}&workflowDialog=1`
    return appUrl ? `${appUrl}${path}` : path
  }

  const eventPath = `/artist/events/${input.scopeId}?tab=collaboration`
  return appUrl ? `${appUrl}${eventPath}` : eventPath
}
