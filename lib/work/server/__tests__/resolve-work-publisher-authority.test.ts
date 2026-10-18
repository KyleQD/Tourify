import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { resolveProtectedWorkPublisherAuthority } from '../resolve-work-publisher-authority'
import type { ActingContext } from '@/lib/auth/acting-context'
import { canPublishWorkOpportunity, classifyWorkPosting } from '../../opportunity-publication-policy'

const mockedServiceClient = vi.mocked(createServiceRoleClient)
const now = new Date()
const tomorrow = new Date(now.getTime() + 86400000 * 30).toISOString()
const yesterday = new Date(now.getTime() - 86400000).toISOString()
const accountId = 'aaaa-1111'

type TableName =
  | 'accounts'
  | 'work_employer_approvals'
  | 'work_hiring_entitlements'
  | 'subscriptions'
  | 'work_hiring_plans'

const baseData: Record<TableName, Record<string, unknown>[]> = {
  accounts: [{ id: accountId, owner_user_id: 'user1', profile_id: 'artist1', account_type: 'artist', is_active: true }],
  work_employer_approvals: [{
    account_id: accountId,
    approval_type: 'employer',
    status: 'approved',
    approved_at: yesterday,
    expires_at: tomorrow,
    revoked_at: null,
  }],
  work_hiring_entitlements: [{
    account_id: accountId, stripe_subscription_id: 'sub_1', revoked_at: null,
  }],
  subscriptions: [{
    stripe_subscription_id: 'sub_1', stripe_price_id: 'price_artist_plus',
    user_id: 'user1', status: 'active', current_period_end: tomorrow,
  }],
  work_hiring_plans: [{
    stripe_price_id: 'price_artist_plus',
    allowed_account_types: ['artist'],
    active_listing_limit: 3,
  }],
}

function mockQuery(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, any> = {}
  for (const operation of ['select', 'eq', 'in', 'is']) {
    builder[operation] = () => builder
  }
  builder.maybeSingle = async () => ({
    data: Array.isArray(result.data) ? (result.data as unknown[])[0] ?? null : result.data,
    error: result.error,
  })
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return builder
}

function setup(rows: Partial<typeof baseData> = {}, rpcAllowed = true) {
  const data = { ...baseData, ...rows }
  mockedServiceClient.mockReturnValue({
    from: (table: string) => {
      if (!(table in data)) throw new Error('Unexpected table ' + table)
      return mockQuery({ data: data[table as TableName], error: null })
    },
  } as any)
  const actor: ActingContext = {
    userId: 'user1',
    profileId: 'artist1',
    accountType: 'artist',
    supabase: {
      rpc: vi.fn().mockResolvedValue({ data: rpcAllowed, error: null }),
    },
  }
  return actor
}

const paid = classifyWorkPosting({ jobType: 'one_time', paymentType: 'paid', paymentAmount: 125 })

describe('server-only protected Work publishing authority', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves an exact account-scoped Stripe entitlement and hiring permission', async () => {
    const actor = setup()
    const result = await resolveProtectedWorkPublisherAuthority(actor, 2)
    expect(result.accountId).toBe(accountId)
    expect(result.authority).toMatchObject({
      accountType: 'artist', isVerifiedEmployer: true,
      hasPaidPostingEntitlement: true, canManageHiring: true,
      activeJobCount: 2, activeJobLimit: 3,
    })
    expect(canPublishWorkOpportunity(paid, result.authority)).toEqual({ allowed: true, kind: 'paid_work' })
    expect(actor.supabase.rpc).toHaveBeenCalledWith('can_manage_hiring', {
      p_user_id: 'user1', p_entity_type: 'artist', p_entity_id: 'artist1',
    })
  })

  it('denies billing for a subscription owned by another personal account', async () => {
    const actor = setup({ subscriptions: [{ ...baseData.subscriptions[0], user_id: 'user2' }] })
    const result = await resolveProtectedWorkPublisherAuthority(actor, 0)
    expect(result.authority.hasPaidPostingEntitlement).toBe(false)
  })

  it('denies a client with no workforce management permission', async () => {
    const actor = setup({}, false)
    const result = await resolveProtectedWorkPublisherAuthority(actor, 0)
    expect(result.authority.canManageHiring).toBe(false)
    expect(result.authority.hasPaidPostingEntitlement).toBe(false)
  })

  it('denies account without independently approved employer record', async () => {
    const actor = setup({ work_employer_approvals: [] })
    const result = await resolveProtectedWorkPublisherAuthority(actor, 0)
    expect(result.authority.isVerifiedEmployer).toBe(false)
  })

  it('denies wrong Stripe price even with an active paid subscription', async () => {
    const actor = setup({ subscriptions: [{
      ...baseData.subscriptions[0], stripe_price_id: 'price_wrong_product',
    }] })
    const result = await resolveProtectedWorkPublisherAuthority(actor, 0)
    expect(result.authority.hasPaidPostingEntitlement).toBe(false)
  })

  it('denies missing professional account, generic accounts, and invalid quota counts', async () => {
    const missing = setup({ accounts: [] })
    expect((await resolveProtectedWorkPublisherAuthority(missing, 0)).authority.hasPaidPostingEntitlement).toBe(false)
    const general = setup()
    general.accountType = 'general'
    expect((await resolveProtectedWorkPublisherAuthority(general, 0)).authority.canManageHiring).toBe(false)
    expect((await resolveProtectedWorkPublisherAuthority(setup(), -1)).authority.hasPaidPostingEntitlement).toBe(false)
  })
})
