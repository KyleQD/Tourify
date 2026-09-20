import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const resolveFlags = vi.fn()
  const getTrustedMusicWriteClient = vi.fn()

  const outboxLimit = vi.fn()
  const outboxOrder = vi.fn(() => ({ limit: outboxLimit }))
  const outboxIn = vi.fn(() => ({ order: outboxOrder }))
  const outboxSelect = vi.fn(() => ({ in: outboxIn }))

  const flagOr = vi.fn()
  const flagSelect = vi.fn(() => ({ or: flagOr }))
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))

  const auditInsert = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'creator_cooperative_outbox') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'creator_cooperative_audit_events') return { insert: auditInsert }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    resolveFlags,
    getTrustedMusicWriteClient,
    outboxLimit,
    outboxIn,
    flagOr,
    updateEq,
    update,
    auditInsert,
    from,
    context: {
      user: { id: '00000000-0000-4000-8000-000000000001' },
      supabase: {},
    },
  }
})

vi.mock('@/lib/auth/api-auth', () => ({
  withPlatformAdmin: vi.fn(
    (handler: (request: NextRequest, context: typeof mocks.context) => unknown) =>
      (request: NextRequest) => handler(request, mocks.context),
  ),
}))

vi.mock('@/lib/music/creator-cooperative/creator-cooperative-flags', () => ({
  resolveCreatorCooperativeFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/creator-cooperative/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/creator-cooperative/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Creator-cooperative platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-feature response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_cooperative_admin_ops_enabled: false })

    const response = await POST(opsRequest({ action_type: 'privacy_incident_stop' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and cooperative flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_cooperative_admin_ops_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', event_type: 'cooperative.updated', status: 'failed' }],
    })
    mocks.flagOr.mockResolvedValueOnce({
      data: [{ key: 'creator_cooperative_membership_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagOr).toHaveBeenCalledWith(
      'key.like.creator_cooperative_%,key.like.creator_data_%,key.like.research_%,key.like.policy_%,key.like.standards_%,key.like.collective_%,key.like.member_benefit_%,key.like.cooperative_token_%,key.like.cross_border_%,key.like.public_policy_%',
    )
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', event_type: 'cooperative.updated', status: 'failed' }],
        flags: [{ key: 'creator_cooperative_membership_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves the privacy incident stop keys and actor-attributed audit event', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_cooperative_admin_ops_enabled: true })
    const expectedKeys = [
      'creator_data_contribution_enabled',
      'creator_data_vault_enabled',
      'research_exchange_private_beta_enabled',
      'research_clean_room_enabled',
      'external_research_licensing_enabled',
      'cross_border_research_enabled',
    ]

    const response = await POST(opsRequest({
      action_type: 'privacy_incident_stop',
      dual_control_required: false,
      payload: { ticket: 'SEC-105' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      actor_id: mocks.context.user.id,
      action: 'privacy_incident_stop',
      subject_type: 'feature_flags',
      metadata: {
        flagKeys: expectedKeys,
        dual_control_required: false,
        ticket: 'SEC-105',
      },
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
