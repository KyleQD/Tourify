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
    if (table === 'creator_public_outbox') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'creator_public_audit_events') return { insert: auditInsert }
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

vi.mock('@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags', () => ({
  resolveCreatorPublicInfrastructureFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/creator-public-infrastructure/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/creator-public-infrastructure/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Creator-public-infrastructure platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled admin-ops response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_public_infrastructure_admin_ops_enabled: false })

    const response = await POST(opsRequest({ action_type: 'trust_compromise_stop' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and infrastructure flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_public_infrastructure_admin_ops_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', event_type: 'trust.changed', status: 'pending' }],
    })
    mocks.flagLike.mockResolvedValueOnce({
      data: [{ key: 'creator_public_infrastructure_trust_registry_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagLike).toHaveBeenCalledWith('key', 'creator_public_infrastructure_%')
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', event_type: 'trust.changed', status: 'pending' }],
        flags: [{ key: 'creator_public_infrastructure_trust_registry_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves trust-compromise keys, schema defaults, and actor-attributed audit fields', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_public_infrastructure_admin_ops_enabled: true })
    const expectedKeys = [
      'creator_public_infrastructure_trust_registry_enabled',
      'creator_public_infrastructure_credentials_enabled',
      'creator_public_infrastructure_rights_resolver_enabled',
      'creator_public_infrastructure_service_directory_enabled',
      'creator_public_infrastructure_public_api_enabled',
    ]

    const response = await POST(opsRequest({ action_type: 'trust_compromise_stop' }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      actor_user_id: mocks.context.user.id,
      event_type: 'trust_compromise_stop',
      object_type: 'feature_flags',
      object_id: 'creator_public_infrastructure',
      payload: { flagKeys: expectedKeys, dual_control_required: true },
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
