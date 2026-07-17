import type { SupabaseClient } from '@supabase/supabase-js'

import type { EventReference } from '@/app/api/events/_lib/event-reference'
import { ensureThreadForScope } from '@/lib/workflows/workflow-threads'

export const EVENT_WORKFLOW_TASK_SELECT =
  'id, thread_id, title, description, assignee_id, status, priority, due_at, dependency_task_ids, labels, metadata, created_by, created_at, updated_at'

export interface EventWorkflowContext {
  threadId: string
  orgId: string | null
}

export async function getEventWorkflowContext({
  supabase,
  reference,
  userId,
}: {
  supabase: SupabaseClient
  reference: EventReference
  userId: string
}): Promise<EventWorkflowContext> {
  const orgId = await resolveEventOrgId({ supabase, reference })
  const thread = await ensureThreadForScope({
    supabase,
    scopeType: 'event',
    scopeId: reference.id,
    orgId,
    userId,
    title: 'Event workflow',
  })

  return { threadId: thread.id, orgId }
}

async function resolveEventOrgId({
  supabase,
  reference,
}: {
  supabase: SupabaseClient
  reference: EventReference
}) {
  if (reference.table !== 'events_v2') return null

  const { data } = await supabase
    .from('events_v2')
    .select('org_id')
    .eq('id', reference.id)
    .maybeSingle()

  return (data?.org_id as string | null | undefined) ?? null
}

export async function recordEventTaskAudit({
  supabase,
  threadId,
  userId,
  action,
  taskId,
  metadata = {},
}: {
  supabase: SupabaseClient
  threadId: string
  userId: string
  action: string
  taskId: string
  metadata?: Record<string, unknown>
}) {
  const { error } = await supabase.from('workflow_events_audit').insert({
    thread_id: threadId,
    actor_user_id: userId,
    action,
    entity_type: 'task',
    entity_id: taskId,
    metadata,
  })

  if (error) {
    console.warn('[event tasks audit]', error)
  }
}
