import type { SupabaseClient } from '@supabase/supabase-js'
import { checkAdminPermissions } from '@/lib/auth/api-auth'
import { hasEventPermission } from '@/app/api/events/_lib/event-permissions'

interface ScopeAccessInput {
  supabase: SupabaseClient
  userId: string
  scopeType: 'event' | 'tour'
  scopeId: string
  permission: 'read' | 'write' | 'manage'
}

export async function hasWorkflowScopeAccess(input: ScopeAccessInput): Promise<boolean> {
  if (input.scopeType === 'tour') {
    if (input.permission === 'read') return hasTourReadAccess(input.supabase, input.scopeId, input.userId)
    return checkAdminPermissions({ id: input.userId }, { tourId: input.scopeId })
  }

  return hasEventScopeAccess(input)
}

async function hasTourReadAccess(supabase: SupabaseClient, tourId: string, userId: string) {
  const [owned, member] = await Promise.all([
    supabase.from('tours').select('id').eq('id', tourId).eq('user_id', userId).maybeSingle(),
    supabase.from('tour_team_members').select('id').eq('tour_id', tourId).eq('user_id', userId).maybeSingle(),
  ])

  return Boolean((!owned.error && owned.data) || (!member.error && member.data))
}

async function hasEventScopeAccess({
  supabase,
  userId,
  scopeId,
  permission,
}: ScopeAccessInput): Promise<boolean> {
  const eventOwner = await resolveEventOwnerUserId(supabase, scopeId)
  if (!eventOwner && permission === 'read') return false
  if (eventOwner === userId) return true

  const permissionName = permission === 'read' ? 'VIEW_EVENT' : 'EDIT_EVENT_LOGISTICS'
  return hasEventPermission({
    supabase,
    eventId: scopeId,
    userId,
    ownerUserId: eventOwner,
    permissionName,
  })
}

async function resolveEventOwnerUserId(supabase: SupabaseClient, eventId: string): Promise<string | null> {
  const [artistEvent, eventV2, eventLegacy] = await Promise.all([
    supabase.from('artist_events').select('user_id').eq('id', eventId).maybeSingle(),
    supabase.from('events_v2').select('created_by').eq('id', eventId).maybeSingle(),
    supabase.from('events').select('artist_id').eq('id', eventId).maybeSingle(),
  ])

  if (!artistEvent.error && artistEvent.data?.user_id) return artistEvent.data.user_id
  if (!eventV2.error && eventV2.data?.created_by) return eventV2.data.created_by
  if (!eventLegacy.error && eventLegacy.data?.artist_id) return eventLegacy.data.artist_id
  return null
}

export async function hasWorkflowThreadPermission({
  supabase,
  threadId,
  userId,
  permission,
}: {
  supabase: SupabaseClient
  threadId: string
  userId: string
  permission: 'read' | 'write' | 'manage'
}): Promise<boolean> {
  const { data: participant, error: participantError } = await supabase
    .from('workflow_participants')
    .select('role, permissions, status')
    .eq('thread_id', threadId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!participantError && participant?.status === 'active') {
    if (participant.role === 'owner' || participant.role === 'admin') return true
    if (permission === 'read') return true
    const participantPermissions = Array.isArray(participant.permissions) ? participant.permissions : []
    if (permission === 'write') return participantPermissions.includes('messages.write') || participantPermissions.includes('tasks.manage')
    return participantPermissions.includes('thread.manage') || participantPermissions.includes('participants.manage')
  }

  const { data: thread, error: threadError } = await supabase
    .from('workflow_threads')
    .select('scope_type, scope_id')
    .eq('id', threadId)
    .maybeSingle()

  if (threadError || !thread) return false

  return hasWorkflowScopeAccess({
    supabase,
    userId,
    scopeType: thread.scope_type,
    scopeId: thread.scope_id,
    permission,
  })
}
