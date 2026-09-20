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
    if (table === 'creator_treaty_renewal_outbox') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'creator_treaty_renewal_audit_events') return { insert: auditInsert }
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

vi.mock('@/lib/music/creator-treaty-system-renewal/creator-treaty-renewal-flags', () => ({
  resolveCreatorTreatyRenewalFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/creator-treaty-system-renewal/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/creator-treaty-system-renewal/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Creator-treaty-system-renewal platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-readiness response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_treaty_renewal_readiness_enabled: false })

    const response = await POST(opsRequest({ action_type: 'renewal_freeze' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and treaty-renewal flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_treaty_renewal_readiness_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', event_type: 'renewal.changed', status: 'pending' }],
    })
    mocks.flagLike.mockResolvedValueOnce({
      data: [{ key: 'creator_treaty_renewal_sunset_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagLike).toHaveBeenCalledWith('key', 'creator_treaty_renewal_%')
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', event_type: 'renewal.changed', status: 'pending' }],
        flags: [{ key: 'creator_treaty_renewal_sunset_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves renewal-freeze keys, schema defaults, and audit fields', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_treaty_renewal_readiness_enabled: true })
    const expectedKeys = [
      'creator_treaty_renewal_readiness_enabled',
      'creator_treaty_renewal_repeated_cycles_enabled',
      'creator_treaty_renewal_legal_character_enabled',
      'creator_treaty_renewal_future_generations_enabled',
      'creator_treaty_renewal_sunset_enabled',
      'creator_treaty_renewal_authority_revalidation_enabled',
      'creator_treaty_renewal_archives_enabled',
      'creator_treaty_renewal_succession_enabled',
      'creator_treaty_renewal_public_consultation_enabled',
    ]

    const response = await POST(opsRequest({ action_type: 'renewal_freeze' }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      event_type: 'renewal_freeze',
      actor_type: 'admin',
      actor_id: mocks.context.user.id,
      subject_type: 'feature_flags',
      subject_id: 'creator_treaty_renewal',
      payload: { flagKeys: expectedKeys, dual_control_required: true },
      event_hash: expect.stringMatching(
        /^p18-ops:renewal_freeze:00000000-0000-4000-8000-000000000001:\d+$/,
      ),
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
