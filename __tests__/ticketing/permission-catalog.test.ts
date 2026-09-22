/**
 * VEN-147/148/149 — single permission catalog, authority mappings and
 * elevation guards.
 */

import { describe, expect, it } from 'vitest'
import {
  FINANCE_ROLE_PERMISSIONS,
  ORG_BASELINE_PERMISSIONS,
  TICKETING_PERMISSION_CATALOG,
  VENUE_TICKETING_AUTHORITY,
  isTicketingPermission,
  venuePermissionsForTicketingPermission,
} from '@/lib/ticketing/permissions'
import { resolveTicketingOwnerUserIds } from '@/lib/ticketing/account-resolver'

/** Mirrors the event_ticketing_grants.permission CHECK constraint. */
const DB_CHECK_PERMISSIONS = [
  'view_overview', 'manage_ticket_types', 'publish_sales', 'view_attendees',
  'view_attendee_contact', 'view_orders', 'view_full_financials', 'view_assigned_share',
  'issue_comps', 'manage_guestlist', 'transfer_reassign', 'process_refunds',
  'operate_box_office', 'scan_tickets', 'reverse_checkin', 'export_attendees',
  'export_financials', 'manage_grants',
]

describe('ticketing permission catalog (VEN-149)', () => {
  it('matches the database CHECK constraint exactly', () => {
    const catalog = TICKETING_PERMISSION_CATALOG.map((entry) => entry.permission).sort()
    expect(catalog).toEqual([...DB_CHECK_PERMISSIONS].sort())
  })

  it('validates permission strings against the catalog only', () => {
    expect(isTicketingPermission('view_overview')).toBe(true)
    expect(isTicketingPermission('paid')).toBe(false)
    expect(isTicketingPermission('super_admin')).toBe(false)
  })
})

describe('authority mapping guards', () => {
  it('org membership baseline is view_overview ONLY (VEN-147)', () => {
    expect([...ORG_BASELINE_PERMISSIONS]).toEqual(['view_overview'])
  })

  it('finance role never gains operational powers', () => {
    for (const operational of ['scan_tickets', 'issue_comps', 'operate_box_office', 'process_refunds', 'manage_grants'] as const) {
      expect(FINANCE_ROLE_PERMISSIONS.has(operational)).toBe(false)
    }
  })

  it('no venue role maps to manage_grants — grants cannot self-elevate', () => {
    const mapped = new Set(Object.values(VENUE_TICKETING_AUTHORITY).flat())
    expect(mapped.has('manage_grants')).toBe(false)
    expect(venuePermissionsForTicketingPermission('manage_grants')).toEqual([])
  })

  it('venue ticketing authority excludes refunds and full financials', () => {
    const ops = VENUE_TICKETING_AUTHORITY.manage_ticketing
    expect(ops).not.toContain('process_refunds')
    expect(ops).not.toContain('view_full_financials')
    expect(ops).not.toContain('manage_grants')
    // Refunds require venue finance authority instead.
    expect(VENUE_TICKETING_AUTHORITY.manage_finances).toContain('process_refunds')
  })
})

describe('account-aware owner resolution (VEN-148)', () => {
  function mockSupabase(handlers: Record<string, any>) {
    return {
      from(table: string) {
        const handler = handlers[table] || { data: null }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        limit: () => builder,
        maybeSingle: async () => handler,
        single: async () => handler,
        // supabase-js builders are thenable ({ data, error }).
        then: (resolve: (value: any) => void) => Promise.resolve(handler).then(resolve),
      }
        return builder
      },
    }
  }

  it('passes human anchors straight through', async () => {
    const supabase = mockSupabase({})
    await expect(resolveTicketingOwnerUserIds(supabase, 'user', 'user-1' as any)).resolves.toEqual(['user-1'])
    await expect(resolveTicketingOwnerUserIds(supabase, 'admin', 'admin-1' as any)).resolves.toEqual(['admin-1'])
  })

  it('expands organization owners to creator + owner/admin members', async () => {
    const supabase = mockSupabase({
      organizations: { data: { created_by: 'creator-1' } },
      org_members: { data: [{ user_id: 'admin-a' }, { user_id: 'owner-b' }] },
    })
    const owners = await resolveTicketingOwnerUserIds(supabase as any, 'organization', 'org-1' as any)
    expect(owners.sort()).toEqual(['admin-a', 'creator-1', 'owner-b'].sort())
  })

  it('resolves artist profiles to their owning user', async () => {
    const supabase = mockSupabase({ artist_profiles: { data: { user_id: 'artist-user' } } })
    await expect(resolveTicketingOwnerUserIds(supabase as any, 'artist', 'ap-1' as any)).resolves.toEqual(['artist-user'])
  })

  it('resolves venue events through settings link then bridge', async () => {
    const viaSettings = mockSupabase({
      events_v2: { data: { settings: { venue_profile_id: 'vp-1' }, venue_id: null } },
      venue_profiles: { data: { user_id: 'venue-owner', main_profile_id: null } },
    })
    await expect(resolveTicketingOwnerUserIds(viaSettings as any, 'venue', 'whatever' as any, 'event-1')).resolves.toEqual(['venue-owner'])

    const viaBridge = mockSupabase({
      events_v2: { data: { settings: {}, venue_id: 'venues-v2-row' } },
      venue_identity_bridges: { data: { venue_profile_id: 'vp-2' } },
      venue_profiles: { data: { user_id: 'bridge-owner', main_profile_id: 'co-owner' } },
    })
    const owners = await resolveTicketingOwnerUserIds(viaBridge as any, 'venue', 'x' as any, 'event-1')
    expect(owners.sort()).toEqual(['bridge-owner', 'co-owner'].sort())
  })

  it('returns empty for unknown accounts rather than guessing', async () => {
    const supabase = mockSupabase({})
    await expect(resolveTicketingOwnerUserIds(supabase as any, 'venue', 'missing' as any, 'event-1')).resolves.toEqual([])
  })
})

describe('workforce door authority (VEN-160)', () => {
  async function permitted(handlers: Record<string, any>, permission: 'scan_tickets' | 'reverse_checkin') {
    const supabase = {
      from(table: string) {
        const handler = handlers[table] || { data: null }
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          in: () => builder,
          limit: () => builder,
          maybeSingle: async () => handler,
          single: async () => handler,
          // Awaited list queries resolve like supabase-js ({ data: rows[] }).
          then: (resolve: (v: any) => void) =>
            Promise.resolve({ data: Array.isArray(handler.data) ? handler.data : handler.data ? [handler.data] : [] }).then(resolve),
        }
        return builder
      },
    }
    const { hasTicketingPermission } = await import('@/lib/ticketing/permissions')
    return hasTicketingPermission({
      supabase: supabase as any,
      userId: 'worker-1',
      eventId: 'event-1',
      permission,
    })
  }

  it('derives scan authority from an active door assignment flag', async () => {
    const allowed = await permitted(
      {
        events_v2: { data: null },
        event_ticketing_config: { data: null },
        org_members: { data: null },
        event_ticketing_grants: { data: null },
        employment_assignments: { data: { id: 'asg-1', permissions: { door_check_in: true } } },
      },
      'scan_tickets',
    )
    expect(allowed).toBe(true)
  })

  it('revokes scan authority once the assignment is no longer active', async () => {
    // No confirmed/active row exists → the scoped query returns nothing.
    const denied = await permitted(
      {
        events_v2: { data: null },
        event_ticketing_config: { data: null },
        org_members: { data: null },
        event_ticketing_grants: { data: null },
        employment_assignments: { data: null },
      },
      'scan_tickets',
    )
    expect(denied).toBe(false)
  })
})
