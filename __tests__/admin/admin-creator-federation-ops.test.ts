import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const resolveFlags = vi.fn()
  const getTrustedMusicWriteClient = vi.fn()

  const outboxLimit = vi.fn()
  const outboxOrder = vi.fn(() => ({ limit: outboxLimit }))
  const outboxIn = vi.fn(() => ({ order: outboxOrder }))
  const outboxSelect = vi.fn(() => ({ in: outboxIn }))

  const flagLike = vi.fn()
  const flagSelect = vi.fn(() => ({ like: flagLike }))
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))

  const auditInsert = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'creator_federation_outbox_events') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'creator_federation_audit_events') return { insert: auditInsert }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    resolveFlags,
    getTrustedMusicWriteClient,
    outboxLimit,
    outboxIn,
    flagLike,
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

vi.mock('@/lib/music/creator-federation/creator-federation-flags', () => ({
  resolveCreatorFederationFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/creator-federation/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/creator-federation/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Creator-federation platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-feature response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_federation_admin_ops_enabled: false })

    const response = await POST(opsRequest({ action_type: 'federation_partition_stop' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and federation flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_federation_admin_ops_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', event_type: 'federation.partitioned', status: 'pending' }],
    })
    mocks.flagLike.mockResolvedValueOnce({
      data: [{ key: 'creator_federation_membership_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagLike).toHaveBeenCalledWith('key', 'creator_federation_%')
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', event_type: 'federation.partitioned', status: 'pending' }],
        flags: [{ key: 'creator_federation_membership_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves federation partition-stop keys and actor-attributed audit metadata', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_federation_admin_ops_enabled: true })
    const expectedKeys = [
      'creator_federation_membership_enabled',
      'creator_federation_credentials_enabled',
      'creator_federation_mandates_enabled',
      'creator_federation_service_directory_enabled',
      'creator_federation_cross_border_data_enabled',
      'creator_federation_governance_enabled',
      'creator_federation_voting_enabled',
      'creator_federation_representation_network_enabled',
    ]

    const response = await POST(opsRequest({
      action_type: 'federation_partition_stop',
      dual_control_required: false,
      payload: { ticket: 'SEC-107' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      actor_id: mocks.context.user.id,
      action: 'federation_partition_stop',
      subject_type: 'feature_flags',
      metadata: {
        flagKeys: expectedKeys,
        dual_control_required: false,
        ticket: 'SEC-107',
      },
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
