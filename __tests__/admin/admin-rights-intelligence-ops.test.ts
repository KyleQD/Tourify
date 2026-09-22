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
    if (table === 'music_intelligence_outbox') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'music_intelligence_audit_events') return { insert: auditInsert }
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

vi.mock('@/lib/music/rights-intelligence/music-rights-intelligence-flags', () => ({
  resolveMusicRightsIntelligenceFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/rights-intelligence/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/rights-intelligence/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Rights-intelligence platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-feature response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_rights_intelligence_admin_ops_enabled: false })

    const response = await POST(opsRequest({ action_type: 'competition_stop' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and rights-intelligence flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_rights_intelligence_admin_ops_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', event_type: 'rights.updated', status: 'pending' }],
    })
    mocks.flagLike.mockResolvedValueOnce({
      data: [{ key: 'music_rights_intelligence_metrics_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagLike).toHaveBeenCalledWith('key', 'music_rights_intelligence_%')
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', event_type: 'rights.updated', status: 'pending' }],
        flags: [{ key: 'music_rights_intelligence_metrics_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves the multi-key competition stop and actor-attributed audit event', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_rights_intelligence_admin_ops_enabled: true })
    const expectedKeys = [
      'music_rights_intelligence_benchmarks_enabled',
      'music_rights_intelligence_groups_enabled',
      'music_rights_intelligence_external_negotiation_enabled',
      'music_rights_intelligence_collective_licensing_enabled',
      'music_rights_intelligence_benchmark_public_publish_enabled',
    ]

    const response = await POST(opsRequest({
      action_type: 'competition_stop',
      dual_control_required: false,
      payload: { ticket: 'SEC-104' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      actor_id: mocks.context.user.id,
      action: 'competition_stop',
      subject_type: 'feature_flags',
      metadata: {
        flagKeys: expectedKeys,
        dual_control_required: false,
        ticket: 'SEC-104',
      },
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
