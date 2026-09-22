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
    if (table === 'creator_commons_outbox') return { select: outboxSelect }
    if (table === 'feature_flags') return { select: flagSelect, update }
    if (table === 'creator_commons_audit_events') return { insert: auditInsert }
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

vi.mock('@/lib/music/creator-digital-commons/creator-digital-commons-flags', () => ({
  resolveCreatorDigitalCommonsFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { GET, POST } from '@/app/api/admin/creator-digital-commons/ops/route'

function opsRequest(body?: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/creator-digital-commons/ops', body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } : undefined)
}

describe('Creator-digital-commons platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-feature response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_digital_commons_readiness_enabled: false })

    const response = await POST(opsRequest({ action_type: 'tourify_exit_freeze' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('preserves the enabled pending-outbox and digital-commons flag read model', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_digital_commons_readiness_enabled: true })
    mocks.outboxLimit.mockResolvedValueOnce({
      data: [{ id: 'outbox-1', topic: 'commons.transition', status: 'pending' }],
    })
    mocks.flagLike.mockResolvedValueOnce({
      data: [{ key: 'creator_digital_commons_readiness_enabled', enabled: true }],
    })

    const response = await GET(opsRequest())

    expect(response.status).toBe(200)
    expect(mocks.outboxIn).toHaveBeenCalledWith('status', ['pending', 'failed'])
    expect(mocks.flagLike).toHaveBeenCalledWith('key', 'creator_digital_commons_%')
    await expect(response.json()).resolves.toEqual({
      data: {
        pendingOutbox: [{ id: 'outbox-1', topic: 'commons.transition', status: 'pending' }],
        flags: [{ key: 'creator_digital_commons_readiness_enabled', enabled: true }],
      },
      enabled: true,
    })
  })

  it('preserves the Tourify exit-freeze keys and full actor-attributed audit payload', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ creator_digital_commons_readiness_enabled: true })
    const expectedKeys = [
      'creator_digital_commons_readiness_enabled',
      'creator_digital_commons_participation_enabled',
      'creator_digital_commons_transition_escrow_enabled',
      'creator_digital_commons_limited_production_enabled',
    ]

    const response = await POST(opsRequest({
      action_type: 'tourify_exit_freeze',
      dual_control_required: false,
      payload: { ticket: 'SEC-106' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledTimes(expectedKeys.length)
    expect(mocks.updateEq.mock.calls).toEqual(expectedKeys.map((key) => ['key', key]))
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      actor_user_id: mocks.context.user.id,
      event_type: 'tourify_exit_freeze',
      aggregate_type: 'feature_flags',
      aggregate_id: 'creator_digital_commons',
      payload: {
        flagKeys: expectedKeys,
        dual_control_required: false,
        ticket: 'SEC-106',
      },
      policy_version: '1.0.0',
      idempotency_key: expect.stringMatching(
        /^cc-ops:tourify_exit_freeze:00000000-0000-4000-8000-000000000001:\d+$/,
      ),
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: expectedKeys },
      enabled: true,
    })
  })
})
