import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const resolveFlags = vi.fn()
  const getTrustedMusicWriteClient = vi.fn()
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))
  const actionSingle = vi.fn()
  const actionSelect = vi.fn(() => ({ single: actionSingle }))
  const actionInsert = vi.fn(() => ({ select: actionSelect }))
  const from = vi.fn((table: string) => {
    if (table === 'feature_flags') return { update }
    if (table === 'music_institutional_admin_actions') return { insert: actionInsert }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    resolveFlags,
    getTrustedMusicWriteClient,
    updateEq,
    update,
    actionSingle,
    actionInsert,
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

vi.mock('@/lib/music/institutional/music-institutional-flags', () => ({
  resolveMusicInstitutionalFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { POST } from '@/app/api/admin/institutional/ops/route'

function opsRequest(body: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/institutional/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Institutional platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('preserves the disabled-feature response without requesting a trusted client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_institutional_admin_ops_enabled: false })

    const response = await POST(opsRequest({ action_type: 'kill_switch_funds' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.actionInsert).not.toHaveBeenCalled()
  })

  it('scopes the kill switch and attributes the recorded action to the platform actor', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_institutional_admin_ops_enabled: true })
    mocks.actionSingle.mockResolvedValueOnce({
      data: {
        id: 'action-1',
        action_type: 'kill_switch_funds',
        dual_control_required: false,
        created_at: '2026-09-18T00:00:00.000Z',
      },
      error: null,
    })

    const response = await POST(opsRequest({
      action_type: 'kill_switch_funds',
      subject_type: 'fund',
      subject_id: '00000000-0000-4000-8000-000000000099',
      dual_control_required: false,
      payload: { ticket: 'SEC-102' },
    }))

    expect(response.status).toBe(201)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      rollout_percentage: 0,
      updated_at: expect.any(String),
    }))
    expect(mocks.updateEq).toHaveBeenCalledWith('key', 'music_institutional_funds_enabled')
    expect(mocks.actionInsert).toHaveBeenCalledWith({
      actor_user_id: mocks.context.user.id,
      action_type: 'kill_switch_funds',
      subject_type: 'fund',
      subject_id: '00000000-0000-4000-8000-000000000099',
      dual_control_required: false,
      payload: { ticket: 'SEC-102' },
    })
    await expect(response.json()).resolves.toMatchObject({
      data: { id: 'action-1', action_type: 'kill_switch_funds' },
    })
  })
})
