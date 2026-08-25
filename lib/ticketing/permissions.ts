/**
 * VEN-149 — Single ticketing permission catalog.
 *
 * One vocabulary shared by UI capability checks, API authorization and the
 * event_ticketing_grants RLS check constraint. Grants can never elevate beyond
 * grant-management authority: only `manage_grants` holders (or the event
 * creator / resolved ticketing owner) may assign grants, and `manage_grants`
 * itself is deliberately NOT mapped from any venue or org role — it must be
 * granted explicitly by an existing authority.
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

export type TicketingOwnerType = 'organization' | 'venue' | 'artist' | 'admin' | 'user'

export interface TicketingPermissionDefinition {
  permission: TicketingPermission
  label: string
  description: string
  category: 'visibility' | 'operations' | 'finance' | 'door' | 'administration'
}

/**
 * Mirrors the event_ticketing_grants.permission CHECK constraint exactly.
 * If the DB constraint changes, this catalog must change with it (tested).
 */
export const TICKETING_PERMISSION_CATALOG: readonly TicketingPermissionDefinition[] = [
  { permission: 'view_overview', label: 'View overview', description: 'See ticketing dashboard and sale state for the event.', category: 'visibility' },
  { permission: 'manage_ticket_types', label: 'Manage ticket types', description: 'Create, edit and archive ticket types and ticketing configuration.', category: 'operations' },
  { permission: 'publish_sales', label: 'Publish sales', description: 'Open, pause or close public ticket sales.', category: 'operations' },
  { permission: 'view_attendees', label: 'View attendees', description: 'See the attendee/guest list without contact details.', category: 'visibility' },
  { permission: 'view_attendee_contact', label: 'View attendee contact', description: 'See attendee names, emails and contact details.', category: 'visibility' },
  { permission: 'view_orders', label: 'View orders', description: 'Look up individual orders for the event.', category: 'operations' },
  { permission: 'view_full_financials', label: 'View full financials', description: 'See gross revenue, fees and complete order financials.', category: 'finance' },
  { permission: 'view_assigned_share', label: 'View assigned share', description: "See only this account's allocated revenue share.", category: 'finance' },
  { permission: 'issue_comps', label: 'Issue comps', description: 'Issue complimentary tickets from allocation pools.', category: 'operations' },
  { permission: 'manage_guestlist', label: 'Manage guest list', description: 'Create and manage guest list allocations.', category: 'operations' },
  { permission: 'transfer_reassign', label: 'Transfer tickets', description: 'Reassign or transfer tickets between attendees.', category: 'operations' },
  { permission: 'process_refunds', label: 'Process refunds', description: 'Refund orders in whole or part.', category: 'finance' },
  { permission: 'operate_box_office', label: 'Operate box office', description: 'Sell tickets and look up guests at the door/box office.', category: 'door' },
  { permission: 'scan_tickets', label: 'Scan tickets', description: 'Validate tickets at door checkpoints.', category: 'door' },
  { permission: 'reverse_checkin', label: 'Reverse check-in', description: 'Undo an erroneous check-in with reason.', category: 'door' },
  { permission: 'export_attendees', label: 'Export attendees', description: 'Download the attendee list as CSV.', category: 'operations' },
  { permission: 'export_financials', label: 'Export financials', description: 'Download settlement and revenue reports.', category: 'finance' },
  { permission: 'manage_grants', label: 'Manage grants', description: 'Grant/revoke other people’s ticketing permissions.', category: 'administration' },
] as const

const CATALOG_PERMISSIONS = new Set<string>(TICKETING_PERMISSION_CATALOG.map((entry) => entry.permission))

export function isTicketingPermission(value: string): value is TicketingPermission {
  return CATALOG_PERMISSIONS.has(value)
}

/**
 * VEN-147/VEN-149 — Organization membership implies ONLY the read-only
 * baseline. Every granular capability requires an explicit grant row.
 */
export const ORG_BASELINE_PERMISSIONS: ReadonlySet<TicketingPermission> = new Set<TicketingPermission>(['view_overview'])

/** Org roles that carry full operational ticketing authority. */
export const ORG_ADMIN_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'production', 'tour_manager'])

/** Org finance role: financial visibility only, never operations. */
export const FINANCE_ROLE_PERMISSIONS: ReadonlySet<TicketingPermission> = new Set<TicketingPermission>([
  'view_overview',
  'view_orders',
  'view_full_financials',
  'view_assigned_share',
])

/**
 * VEN-149 — Venue authority mapping (entity RBAC → ticketing capabilities).
 * Venue `manage_ticketing` maps to OPERATIONAL capabilities only; refunds,
 * full financials and exports require venue finance authority; grants
 * management is intentionally unmapped so a venue role cannot self-elevate
 * to grant administration.
 */
export const VENUE_TICKETING_AUTHORITY: Record<
  'manage_ticketing' | 'manage_finances' | 'view_finances' | 'export_finances',
  readonly TicketingPermission[]
> = {
  manage_ticketing: [
    'view_overview',
    'manage_ticket_types',
    'publish_sales',
    'view_attendees',
    'view_orders',
    'issue_comps',
    'manage_guestlist',
    'transfer_reassign',
    'operate_box_office',
    'scan_tickets',
    'reverse_checkin',
    'export_attendees',
  ],
  manage_finances: ['view_full_financials', 'process_refunds', 'export_financials'],
  view_finances: ['view_full_financials'],
  export_finances: ['export_financials'],
} as const

const VENUE_PERMISSION_TO_TICKETING: Record<string, TicketingPermission[]> = (() => {
  const map: Record<string, TicketingPermission[]> = {}
  for (const [venuePerm, perms] of Object.entries(VENUE_TICKETING_AUTHORITY)) {
    map[venuePerm] = [...perms]
  }
  return map
})()

export function venuePermissionsForTicketingPermission(permission: TicketingPermission): string[] {
  return Object.entries(VENUE_PERMISSION_TO_TICKETING)
    .filter(([, perms]) => perms.includes(permission))
    .map(([venuePerm]) => venuePerm)
}

/**
 * Workforce door assignment JSON permissions that satisfy door capabilities
 * (canonical staff_shifts / employment_assignments path).
 */
export const WORKFORCE_DOOR_MAPPING: Readonly<Record<'scan_tickets' | 'reverse_checkin', readonly string[]>> = {
  scan_tickets: ['scan_tickets', 'door_check_in', 'check_in_out'],
  reverse_checkin: ['reverse_checkin', 'door_check_in'],
} as const

export interface TicketingPermissionClient {
  from: (table: string) => any
}

async function isEventCreator(supabase: TicketingPermissionClient, userId: string, eventId: string): Promise<boolean> {
  const { data: event } = await supabase.from('events_v2').select('created_by').eq('id', eventId).maybeSingle()
  return Boolean(event?.created_by && event.created_by === userId)
}

/**
 * Central server-side ticketing authorization.
 * Resolution order:
 *   1. Event creator (ownership anchor)
 *   2. Resolved ticketing owner account humans (VEN-148 typed resolver)
 *   3. Org admin roles / finance-role restricted set
 *   4. Explicit event_ticketing_grants row (exact permission)
 *   5. Canonical venue authority bridge (VEN-149; never grants manage_grants)
 *   6. Workforce door assignments for scan/reverse capabilities
 */
export async function hasTicketingPermission(params: {
  supabase: TicketingPermissionClient
  userId: string
  eventId: string
  permission: TicketingPermission
}): Promise<boolean> {
  const { supabase, userId, eventId, permission } = params
  if (!userId || !eventId || !isTicketingPermission(permission)) return false

  if (await isEventCreator(supabase, userId, eventId)) return true

  // VEN-148 — account-aware owner resolution.
  const { data: config } = await supabase
    .from('event_ticketing_config')
    .select('ticketing_owner_type, ticketing_owner_id')
    .eq('event_id', eventId)
    .maybeSingle()
  if (config?.ticketing_owner_id && config?.ticketing_owner_type) {
    try {
      const { resolveTicketingOwnerUserIds } = await import('./account-resolver')
      const owners = await resolveTicketingOwnerUserIds(
        supabase,
        config.ticketing_owner_type as TicketingOwnerType,
        config.ticketing_owner_id,
        eventId,
      )
      if (owners.includes(userId)) return true
    } catch {
      // Fall through to explicit authority checks below.
    }
  }

  const { data: event } = await supabase.from('events_v2').select('org_id').eq('id', eventId).maybeSingle()
  if (event?.org_id) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', event.org_id)
      .eq('user_id', userId)
      .maybeSingle()
    if (membership?.role) {
      if (ORG_ADMIN_ROLES.has(String(membership.role))) return true
      // Finance role: financial visibility only (never operational powers).
      if (String(membership.role) === 'finance' && FINANCE_ROLE_PERMISSIONS.has(permission)) return true
    }
  }

  const { data: grant } = await supabase
    .from('event_ticketing_grants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .eq('permission', permission)
    .maybeSingle()
  if (grant?.id) return true

  // VEN-149 — canonical venue authority bridge. Deliberately skipped for
  // manage_grants so delegated managers cannot mint further authorities.
  if (permission !== 'manage_grants') {
    try {
      const [{ resolveEventVenueProfileId }, venueAccess] = await Promise.all([
        import('./event-venue-link'),
        import('@/lib/venue/venue-access'),
      ])
      const venueProfileId = await resolveEventVenueProfileId(supabase, eventId)
      if (venueProfileId) {
        for (const venuePerm of venuePermissionsForTicketingPermission(permission)) {
          const access = await venueAccess.canManageVenue(supabase as any, userId, venueProfileId, venuePerm as any)
          if (access.allowed) return true
        }
      }
    } catch {
      // Venue bridge unavailable → explicit-grant semantics remain authoritative.
    }
  }

  // Workforce door assignments (canonical staff path).
  const doorMapping = WORKFORCE_DOOR_MAPPING[permission as 'scan_tickets' | 'reverse_checkin']
  if (doorMapping) {
    const { data: assignments } = await supabase
      .from('employment_assignments')
      .select('id, permissions')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .in('status', ['confirmed', 'active'])
      .limit(1)
    const assignment = (assignments || [])[0]
    if (assignment?.permissions) {
      const perms = assignment.permissions as Record<string, unknown>
      if (doorMapping.some((flag) => perms?.[flag] === true)) return true
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
