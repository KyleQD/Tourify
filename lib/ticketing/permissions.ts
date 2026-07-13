/**
 * Event-level ticketing permission checks.
 */

export type TicketingPermission =
  | 'view_overview'
  | 'manage_ticket_types'
  | 'publish_sales'
  | 'view_attendees'
  | 'view_attendee_contact'
  | 'view_orders'
  | 'view_full_financials'
  | 'view_assigned_share'
  | 'issue_comps'
  | 'manage_guestlist'
  | 'transfer_reassign'
  | 'process_refunds'
  | 'operate_box_office'
  | 'scan_tickets'
  | 'reverse_checkin'
  | 'export_attendees'
  | 'export_financials'
  | 'manage_grants'

const ORG_ADMIN_ROLES = new Set(['owner', 'admin', 'production', 'tour_manager'])

export interface TicketingPermissionClient {
  from: (table: string) => any
  rpc?: (fn: string, args?: Record<string, unknown>) => any
}

export async function hasTicketingPermission(params: {
  supabase: TicketingPermissionClient
  userId: string
  eventId: string
  permission: TicketingPermission
}): Promise<boolean> {
  const { supabase, userId, eventId, permission } = params

  const { data: event } = await supabase
    .from('events_v2')
    .select('org_id, created_by')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return false
  if (event.created_by === userId) return true

  // Explicit ticketing owner (venue/artist/org/user) from config
  const { data: config } = await supabase
    .from('event_ticketing_config')
    .select('ticketing_owner_type, ticketing_owner_id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (config?.ticketing_owner_id && config.ticketing_owner_id === userId) {
    // Owners get full operational access except they still need grants for nothing — they are admins
    return true
  }

  if (event.org_id) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', event.org_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (membership?.role && ORG_ADMIN_ROLES.has(String(membership.role)))
      return true

    // Finance role: financial view only
    if (membership?.role === 'finance' && (
      permission === 'view_full_financials'
      || permission === 'view_overview'
      || permission === 'view_orders'
      || permission === 'view_assigned_share'
    ))
      return true
  }

  const { data: grant } = await supabase
    .from('event_ticketing_grants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('permission', permission)
    .maybeSingle()

  if (grant?.id) return true

  // Scan permission also granted via employment assignment + scan grant fallback
  if (permission === 'scan_tickets' || permission === 'reverse_checkin') {
    const { data: assignment } = await supabase
      .from('employment_assignments')
      .select('id, permissions')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'active'])
      .limit(1)
      .maybeSingle()

    if (assignment?.id) {
      const perms = assignment.permissions as Record<string, unknown> | null
      if (perms?.scan_tickets === true || perms?.door_check_in === true || perms?.check_in_out === true)
        return true
    }
  }

  return false
}

export async function requireTicketingPermission(params: {
  supabase: TicketingPermissionClient
  userId: string
  eventId: string
  permission: TicketingPermission
}): Promise<void> {
  const allowed = await hasTicketingPermission(params)
  if (!allowed)
    throw new Error(`Missing ticketing permission: ${params.permission}`)
}
