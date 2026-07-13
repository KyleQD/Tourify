/**
 * Permission helper smoke tests (mocked supabase client).
 */

import { describe, expect, it, vi } from 'vitest'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'

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
      }
      return builder
    },
  }
}

describe('hasTicketingPermission', () => {
  it('allows event creator', async () => {
    const supabase = mockSupabase({
      events_v2: { data: { org_id: 'org-1', created_by: 'user-1' } },
    })

    const allowed = await hasTicketingPermission({
      supabase,
      userId: 'user-1',
      eventId: 'event-1',
      permission: 'scan_tickets',
    })

    expect(allowed).toBe(true)
  })

  it('allows explicit grant', async () => {
    const supabase = mockSupabase({
      events_v2: { data: { org_id: 'org-1', created_by: 'other' } },
      org_members: { data: null },
      event_ticketing_grants: { data: { id: 'grant-1' } },
    })

    const allowed = await hasTicketingPermission({
      supabase,
      userId: 'scanner-1',
      eventId: 'event-1',
      permission: 'scan_tickets',
    })

    expect(allowed).toBe(true)
  })

  it('denies when no membership or grant', async () => {
    const supabase = mockSupabase({
      events_v2: { data: { org_id: 'org-1', created_by: 'other' } },
      org_members: { data: null },
      event_ticketing_grants: { data: null },
      employment_assignments: { data: null },
    })

    const allowed = await hasTicketingPermission({
      supabase,
      userId: 'stranger',
      eventId: 'event-1',
      permission: 'process_refunds',
    })

    expect(allowed).toBe(false)
  })
})
