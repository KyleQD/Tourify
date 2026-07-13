import type { SupabaseClient } from '@supabase/supabase-js'

interface SyncZoneOwnershipToRosterArgs {
  supabase: SupabaseClient
  siteMapZoneId: string
  eventId: string
  leadUserId?: string | null
  assignedDepartment?: string | null
  actorUserId: string
}

interface BulkAssignZoneArgs {
  supabase: SupabaseClient
  siteMapId: string
  zoneId: string
  leadUserId?: string | null
  assignedDepartment?: string | null
  starterTasks?: Array<{ title: string; assignedUserId?: string }>
  actorUserId: string
}

/**
 * Keep roster / staff_shifts zone linkage aligned with map zone ownership
 * via the shared event_zones bridge.
 */
export async function syncZoneOwnershipToRoster({
  supabase,
  siteMapZoneId,
  eventId,
  leadUserId,
  assignedDepartment,
  actorUserId,
}: SyncZoneOwnershipToRosterArgs) {
  const { data: zone } = await supabase
    .from('site_map_zones')
    .select('id, name, event_zone_id, lead_user_id, assigned_department')
    .eq('id', siteMapZoneId)
    .maybeSingle()

  if (!zone) return { synced: false, reason: 'zone_not_found' as const }

  const eventZoneId = zone.event_zone_id
  if (!eventZoneId) return { synced: false, reason: 'missing_event_zone' as const }

  const resolvedLead = leadUserId !== undefined ? leadUserId : zone.lead_user_id
  const resolvedDept = assignedDepartment !== undefined ? assignedDepartment : zone.assigned_department

  await supabase
    .from('event_zones')
    .update({
      supervisor_id: resolvedLead || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', eventZoneId)

  // Update open shifts that already reference this event zone
  if (resolvedLead) {
    const { data: staffMember } = await supabase
      .from('staff_members')
      .select('id')
      .eq('user_id', resolvedLead)
      .limit(1)
      .maybeSingle()

    if (staffMember?.id) {
      await supabase
        .from('staff_members')
        .update({
          assigned_zone: zone.name,
          assigned_manager_id: actorUserId,
          department: resolvedDept || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffMember.id)

      await supabase
        .from('staff_shifts')
        .update({ zone_id: eventZoneId, zone_assignment: zone.name })
        .eq('event_id', eventId)
        .eq('staff_member_id', staffMember.id)
    }
  }

  // Refresh staffing count from open map tasks linked to this zone
  const { count } = await supabase
    .from('map_task_assignments')
    .select('id', { count: 'exact', head: true })
    .eq('element_id', siteMapZoneId)
    .eq('element_type', 'zone')
    .neq('status', 'completed')

  await supabase
    .from('event_zones')
    .update({ assigned_staff_count: count || 0 })
    .eq('id', eventZoneId)

  return { synced: true as const, eventZoneId, assignedStaffCount: count || 0 }
}

export async function bulkAssignTeamToZone({
  supabase,
  siteMapId,
  zoneId,
  leadUserId,
  assignedDepartment,
  starterTasks = [],
  actorUserId,
}: BulkAssignZoneArgs) {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (leadUserId !== undefined) updatePayload.lead_user_id = leadUserId
  if (assignedDepartment !== undefined) updatePayload.assigned_department = assignedDepartment

  const { data: zone, error } = await supabase
    .from('site_map_zones')
    .update(updatePayload)
    .eq('id', zoneId)
    .eq('site_map_id', siteMapId)
    .select('*, site_maps:site_map_id(event_id)')
    .single()

  if (error) throw new Error(error.message)

  const eventId = (zone as any).site_maps?.event_id || (zone as any).event_id
  if (eventId) {
    await syncZoneOwnershipToRoster({
      supabase,
      siteMapZoneId: zoneId,
      eventId,
      leadUserId,
      assignedDepartment,
      actorUserId,
    })
  }

  const createdTasks = []
  for (const task of starterTasks) {
    if (!task.title?.trim()) continue
    const { data: inserted } = await supabase
      .from('map_task_assignments')
      .insert({
        site_map_id: siteMapId,
        element_id: zoneId,
        element_type: 'zone',
        assigned_user_id: task.assignedUserId || leadUserId || null,
        assigned_role: assignedDepartment || null,
        task_type: 'site_map',
        title: task.title.trim(),
        status: 'pending',
        priority: 2,
        created_by: actorUserId,
      })
      .select('id, title')
      .single()
    if (inserted) createdTasks.push(inserted)
  }

  return { zone, createdTasks }
}

export async function refreshEventZoneStaffingCounts({
  supabase,
  siteMapId,
}: {
  supabase: SupabaseClient
  siteMapId: string
}) {
  const { data: zones } = await supabase
    .from('site_map_zones')
    .select('id, event_zone_id')
    .eq('site_map_id', siteMapId)
    .not('event_zone_id', 'is', null)

  if (!zones?.length) return { updated: 0 }

  let updated = 0
  for (const zone of zones) {
    const { count } = await supabase
      .from('map_task_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('element_id', zone.id)
      .eq('element_type', 'zone')
      .neq('status', 'completed')

    const { error } = await supabase
      .from('event_zones')
      .update({ assigned_staff_count: count || 0 })
      .eq('id', zone.event_zone_id)

    if (!error) updated += 1
  }

  return { updated }
}
