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
    if (table === 'creator_treaty_legacy_outbox') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'creator_treaty_legacy_audit_events') return { insert: auditInsert }
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

vi.mock('@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags', () => ({
  resolveCreatorTreatyLegacyFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/creator-treaty-system-legacy/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/creator-treaty-system-legacy/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Creator-treaty-system-legacy platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-readiness response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_treaty_legacy_readiness_enabled: false })

    const response = await POST(opsRequest({ action_type: 'legacy_freeze' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and treaty-legacy flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_treaty_legacy_readiness_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', event_type: 'legacy.changed', status: 'pending' }],
    })
    mocks.flagLike.mockResolvedValueOnce({
      data: [{ key: 'creator_treaty_legacy_open_specs_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagLike).toHaveBeenCalledWith('key', 'creator_treaty_legacy_%')
    expect(mocks.auditInsert).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', event_type: 'legacy.changed', status: 'pending' }],
        flags: [{ key: 'creator_treaty_legacy_open_specs_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves legacy-freeze keys, schema defaults, and audit fields', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_treaty_legacy_readiness_enabled: true })
    const expectedKeys = [
      'creator_treaty_legacy_readiness_enabled',
      'creator_treaty_legacy_century_scale_strategy_enabled',
      'creator_treaty_legacy_successor_custody_enabled',
      'creator_treaty_legacy_cultural_continuity_enabled',
      'creator_treaty_legacy_identifier_resolution_enabled',
      'creator_treaty_legacy_protocol_resolution_enabled',
      'creator_treaty_legacy_post_dissolution_stewardship_enabled',
      'creator_treaty_legacy_sensitive_archive_ethics_enabled',
      'creator_treaty_legacy_open_specs_enabled',
      'creator_treaty_legacy_funding_continuity_enabled',
      'creator_treaty_legacy_disaster_recovery_enabled',
      'creator_treaty_legacy_provider_independence_enabled',
      'creator_treaty_legacy_public_legitimacy_enabled',
    ]

    const response = await POST(opsRequest({ action_type: 'legacy_freeze' }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      event_type: 'legacy_freeze',
      actor_type: 'admin',
      actor_id: mocks.context.user.id,
      subject_type: 'feature_flags',
      subject_id: 'creator_treaty_legacy',
      payload: { flagKeys: expectedKeys, dual_control_required: true },
      event_hash: expect.stringMatching(
        /^p19-ops:legacy_freeze:00000000-0000-4000-8000-000000000001:\d+$/,
      ),
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
