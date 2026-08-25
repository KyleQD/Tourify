/**
 * VEN-291/292/295/296 — venue fanout routing engine: recipient resolution,
 * subscription fallback, dedupe and the PII boundary.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  DEFAULT_WORKFLOW_ROUTES,
  resolveVenueRecipients,
  resolveWorkflowRoute,
  sanitizeFanoutPayload,
} from '@/lib/notifications/venue-fanout'

const VENUE = '33333333-3333-3333-3333-333333333333'

function serviceMock(handlers: Record<string, any> = {}) {
  return {
    from(table: string) {
      const handler = handlers[table] || { data: null }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        contains: () => builder,
        limit: () => builder,
        maybeSingle: async () => handler,
        single: async () => handler,
        then: (resolve: (v: any) => void) =>
          Promise.resolve({ data: Array.isArray(handler.data) ? handler.data : handler.data ? [handler.data] : [] }).then(resolve),
      }
      return builder
    },
  }
}

beforeEach(() => {
  process.env.MARKETPLACE_INTEGRATION_SECRET ||= 'test-secret'
})

describe('recipient resolution (VEN-292)', () => {
  it('resolves humans through role grants and includes owners as floor', async () => {
    const service = serviceMock({
      rbac_user_entity_roles: { data: [{ user_id: 'manager-1', role_id: 'role-a' }, { user_id: 'crew-9', role_id: 'role-b' }] },
      rbac_role_permissions: { data: [{ role_id: 'role-a' }] }, // only role-a holds manage_bookings
      venue_profiles: { data: { user_id: 'owner-1', main_profile_id: 'co-owner-2' } },
    })

    const recipients = await resolveVenueRecipients(service as any, VENUE, 'manage_bookings')
    expect(recipients.sort()).toEqual(['co-owner-2', 'manager-1', 'owner-1'])
  })

  it('matches both RBAC entity_type casings', async () => {
    let captured: string[] | null = null
    const service = {
      from(table: string) {
        if (table === 'rbac_user_entity_roles') {
          return {
            select: () => ({
              in: (_col: string, values: string[]) => {
                captured = values
                return {
                  eq: () => ({ eq: () => ({ then: (r: any) => Promise.resolve({ data: [] }).then(r) }) }),
                }
              },
            }),
          }
        }
        const handler = handlersDefault(table)
        const b: any = { select: () => b, eq: () => b, maybeSingle: async () => handler }
        return b
      },
    }
    function handlersDefault(_t: string) {
      return { data: null }
    }
    await resolveVenueRecipients(service as any, VENUE, 'manage_team')
    expect(captured).toEqual(['Venue', 'venue'])
  })
})

describe('subscription fallback (VEN-254)', () => {
  it('uses the venue subscription when active', async () => {
    const service = serviceMock({
      venue_workflow_subscriptions: { data: { target_permission: 'manage_events', min_priority: 'urgent' } },
    })
    const route = await resolveWorkflowRoute(service as any, VENUE, 'booking_request')
    expect(route).toEqual({ permission: 'manage_events', priority: 'urgent', source: 'subscription' })
  })

  it('falls back to the built-in route map otherwise', async () => {
    const service = serviceMock({})
    const route = await resolveWorkflowRoute(service as any, VENUE, 'shift_published')
    expect(route.source).toBe('default')
    expect(route.permission).toBe(DEFAULT_WORKFLOW_ROUTES.shift_published.permission)
  })
})

describe('PII boundary (VEN-296)', () => {
  it('strips known sensitive keys unless explicitly permitted', () => {
    const payload = {
      booking_request_id: 'br-1',
      buyer_email: 'fan@example.com',
      contact_phone: '555-0100',
      salary: 120000,
      event_name: 'Summer Kickoff',
    }
    const safe = sanitizeFanoutPayload(payload, { includeSensitive: false })
    expect(safe).toEqual({ booking_request_id: 'br-1', event_name: 'Summer Kickoff' })

    const full = sanitizeFanoutPayload(payload, { includeSensitive: true })
    expect(full).toEqual(payload)
  })

  it('keeps deep-link and workflow metadata intact', () => {
    const meta = { link: '/venue/bookings?request_id=x', workflow: 'booking_transition', actor_user_id: 'u1' }
    expect(sanitizeFanoutPayload(meta, { includeSensitive: false })).toEqual(meta)
  })
})

describe('route map sanity', () => {
  it('covers every shipped workflow with a permission', () => {
    for (const workflow of Object.keys(DEFAULT_WORKFLOW_ROUTES)) {
      expect(DEFAULT_WORKFLOW_ROUTES[workflow as keyof typeof DEFAULT_WORKFLOW_ROUTES].permission.length).toBeGreaterThan(3)
    }
  })
})
