import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { POST } from '../route'

const originalFlag = process.env.WORK_HIRING_BILLING_V1_ENABLED
const userClient = vi.mocked(createClient)
const serviceClient = vi.mocked(createServiceRoleClient)
const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const future = new Date(Date.now() + 20 * 86400000).toISOString()
const auditEvents: Record<string, unknown>[] = []

function dbQuery(data: unknown, error: unknown = null) {
  const chain: Record<string, any> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.maybeSingle = async () => ({ data, error })
  return chain
}

function setup({
  authenticated = true, admin = true, accountType = 'artist', owner = 'owner-1',
  subscriber = 'owner-1', status = 'active', price = 'price_hiring',
  expires = future, planTypes = ['artist'], approvedPlan = true, failAudit = false,
}: {
  authenticated?: boolean; admin?: boolean; accountType?: string; owner?: string;
  subscriber?: string; status?: string; price?: string; expires?: string | null;
  planTypes?: string[]; approvedPlan?: boolean; failAudit?: boolean;
} = {}) {
  userClient.mockResolvedValue({ auth: { getUser: async () => ({
    data: { user: authenticated ? { id: 'billing-admin-user' } : null },
    error: authenticated ? null : { message: 'auth missing' },
  }) } } as any)

  serviceClient.mockReturnValue({
    auth: { admin: { getUserById: async () => ({
      data: { user: { app_metadata: { work_hiring_billing_admin: admin } } },
      error: null,
    }) } },
    from(table: string) {
      if (table === 'accounts')
        return dbQuery({
          id: accountId, account_type: accountType,
          profile_table: accountType === 'artist' ? 'artist_profiles' : 'profiles',
          owner_user_id: owner, is_active: true,
        })
      if (table === 'subscriptions')
        return dbQuery({
          stripe_price_id: price, status, current_period_end: expires, user_id: subscriber,
        })
      if (table === 'work_hiring_plans')
        return dbQuery(approvedPlan ? {
          stripe_price_id: price, allowed_account_types: planTypes,
          active_listing_limit: 3,
        } : null)
      if (table === 'work_hiring_entitlement_events')
        return { insert(event: Record<string, unknown>) {
          auditEvents.push(event)
          return { select() { return {
            single: async () => failAudit
              ? { data: null, error: { message: 'constraint conflict' } }
              : { data: { id: 'audit-123' }, error: null },
          } } }
        } }
      throw Error('Unexpected table ' + table)
    },
  } as any)
}

function request(body: Record<string, unknown> | null, origin = 'https://tourify.live') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (origin) headers.origin = origin
  return POST(new NextRequest('https://tourify.live/api/admin/work/hiring-entitlements', {
    method: 'POST', headers, body: JSON.stringify(body),
  }))
}

const grant = {
  accountId,
  subscriptionId: 'sub_ABC123',
  decision: 'grant',
  reason: 'Approved billing assignment for professional artist',
}

describe('account-scoped Work hiring billing decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auditEvents.length = 0
    process.env.WORK_HIRING_BILLING_V1_ENABLED = 'true'
  })
  afterEach(() => {
    if (originalFlag === undefined) delete process.env.WORK_HIRING_BILLING_V1_ENABLED
    else process.env.WORK_HIRING_BILLING_V1_ENABLED = originalFlag
  })

  it('is disabled by default and does not call auth or service role', async () => {
    delete process.env.WORK_HIRING_BILLING_V1_ENABLED
    expect((await request(grant)).status).toBe(404)
    expect(userClient).not.toHaveBeenCalled()
    expect(serviceClient).not.toHaveBeenCalled()
  })

  it('requires same origin and a real authenticated billing admin claim', async () => {
    expect((await request(grant, 'https://evil.example')).status).toBe(403)
    setup({ authenticated: false })
    expect((await request(grant)).status).toBe(401)
    setup({ admin: false })
    expect((await request({ ...grant, work_hiring_billing_admin: true })).status).toBe(403)
    expect(auditEvents).toHaveLength(0)
  })

  it('requires an exact active professional account and strict request schema', async () => {
    setup()
    expect((await request({ ...grant, accountId: 'fake-id' })).status).toBe(400)
    expect((await request({ ...grant, reason: 'short' })).status).toBe(400)
    expect((await request({ ...grant, extra: true })).status).toBe(400)
    setup({ accountType: 'general' })
    expect((await request(grant)).status).toBe(404)
    expect(auditEvents).toHaveLength(0)
  })

  it('rejects cross-user, canceled, expired and invalid-plan subscriptions', async () => {
    setup({ subscriber: 'someone-else' })
    expect((await request(grant)).status).toBe(409)
    setup({ status: 'canceled' })
    expect((await request(grant)).status).toBe(409)
    setup({ expires: '2020-01-01T00:00:00Z' })
    expect((await request(grant)).status).toBe(409)
    setup({ planTypes: ['venue'] })
    expect((await request(grant)).status).toBe(409)
    setup({ approvedPlan: false })
    expect((await request(grant)).status).toBe(409)
    expect(auditEvents).toHaveLength(0)
  })

  it('grants only through one append-only billing decision event', async () => {
    setup()
    const response = await request(grant)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true, accountId, subscriptionId: 'sub_ABC123',
      decision: 'grant', auditEventId: 'audit-123',
    })
    expect(auditEvents).toEqual([{
      account_id: accountId, stripe_subscription_id: 'sub_ABC123',
      billing_admin_user_id: 'billing-admin-user',
      decision: 'grant', reason: grant.reason,
    }])
  })

  it('allows an authorized revocation, leaving verification of active binding to the DB trigger', async () => {
    setup({ status: 'canceled', expires: null })
    const response = await request({ ...grant, decision: 'revoke' })
    expect(response.status).toBe(200)
    expect(auditEvents).toHaveLength(1)
    expect(auditEvents[0].decision).toBe('revoke')
  })

  it('fails closed when the database rejects a conflicting entitlement', async () => {
    setup({ failAudit: true })
    expect((await request(grant)).status).toBe(409)
  })
})
