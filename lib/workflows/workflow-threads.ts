import type { SupabaseClient } from '@supabase/supabase-js'

interface EnsureThreadForScopeInput {
  supabase: SupabaseClient
  scopeType: 'event' | 'tour'
  scopeId: string
  orgId?: string | null
  userId?: string | null
  title?: string
}

export interface WorkflowThreadRecord {
  id: string
  scope_type: 'event' | 'tour'
  scope_id: string
  org_id: string | null
  status: 'active' | 'archived' | 'closed'
}

export async function ensureThreadForScope({
  supabase,
  scopeType,
  scopeId,
  orgId,
  userId,
  title,
}: EnsureThreadForScopeInput): Promise<WorkflowThreadRecord> {
  const { data: existing, error: existingError } = await supabase
    .from('workflow_threads')
    .select('id, scope_type, scope_id, org_id, status')
    .eq('scope_type', scopeType)
    .eq('scope_id', scopeId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing as WorkflowThreadRecord

  const { data: created, error: createError } = await supabase
    .from('workflow_threads')
    .insert({
      scope_type: scopeType,
      scope_id: scopeId,
      org_id: orgId ?? null,
      created_by: userId ?? null,
      title: title ?? `${scopeType} workflow`,
      status: 'active',
    })
    .select('id, scope_type, scope_id, org_id, status')
    .single()

  if (createError) throw createError
  if (!created) throw new Error('Failed to create workflow thread')

  if (userId) {
    await supabase.from('workflow_participants').upsert(
      {
        thread_id: created.id,
        user_id: userId,
        role: 'owner',
        permissions: ['thread.manage', 'tasks.manage', 'messages.write', 'participants.manage'],
        status: 'active',
        added_by: userId,
      },
      { onConflict: 'thread_id,user_id' }
    )
  }

  return created as WorkflowThreadRecord
}

export async function hasWorkflowThreadAccess({
  supabase,
  threadId,
  userId,
}: {
  supabase: SupabaseClient
  threadId: string
  userId: string
}): Promise<boolean> {
  const { data: participant, error: participantError } = await supabase
    .from('workflow_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (participantError) return false
  if (participant) return true

  const { data: thread, error: threadError } = await supabase
    .from('workflow_threads')
    .select('scope_type, scope_id, created_by')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError || !thread) return false
  if (thread.created_by === userId) return true

  if (thread.scope_type === 'tour') return hasTourMembership({ supabase, tourId: thread.scope_id, userId })
  return hasEventOwnership({ supabase, eventId: thread.scope_id, userId })
}

async function hasTourMembership({
  supabase,
  tourId,
  userId,
}: {
  supabase: SupabaseClient
  tourId: string
  userId: string
}): Promise<boolean> {
  const { data: ownedTour, error: ownerError } = await supabase
    .from('tours')
    .select('id')
    .eq('id', tourId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!ownerError && ownedTour) return true

  const { data: member, error } = await supabase
    .from('tour_team_members')
    .select('id')
    .eq('tour_id', tourId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return false
  return Boolean(member)
}

async function hasEventOwnership({
  supabase,
  eventId,
  userId,
}: {
  supabase: SupabaseClient
  eventId: string
  userId: string
}): Promise<boolean> {
  const checks = await Promise.all([
    supabase.from('artist_events').select('id').eq('id', eventId).eq('user_id', userId).maybeSingle(),
    supabase.from('events_v2').select('id').eq('id', eventId).eq('created_by', userId).maybeSingle(),
    supabase.from('events').select('id').eq('id', eventId).eq('artist_id', userId).maybeSingle(),
  ])

  return checks.some(({ data, error }) => !error && Boolean(data))
}
