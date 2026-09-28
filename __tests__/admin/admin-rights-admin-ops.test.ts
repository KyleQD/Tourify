import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const resolveFlags = vi.fn()
  const getTrustedMusicWriteClient = vi.fn()
  const updateEq = vi.fn()
  const update = vi.fn(() => ({ eq: updateEq }))
  const auditInsert = vi.fn()
  const from = vi.fn((table: string) => {
    if (table === 'feature_flags') return { update }
    if (table === 'music_rights_admin_audit_events') return { insert: auditInsert }
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    resolveFlags,
    getTrustedMusicWriteClient,
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

vi.mock('@/lib/music/rights-admin/music-rights-admin-flags', () => ({
  resolveMusicRightsAdminFlags: mocks.resolveFlags,
}))

vi.mock('@/lib/music/music-access', () => ({
  getTrustedMusicWriteClient: mocks.getTrustedMusicWriteClient,
}))

import { POST } from '@/app/api/admin/rights-admin/ops/route'

function opsRequest(body: Record<string, unknown>) {
  return new NextRequest('https://tourify.test/api/admin/rights-admin/ops', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Rights-admin platform operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTrustedMusicWriteClient.mockResolvedValue({ from: mocks.from })
  })

  it('denies disabled operations before requesting a trusted write client', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_rights_admin_admin_ops_enabled: false })

    const response = await POST(opsRequest({ action_type: 'kill_switch_claims' }))

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'feature_disabled' },
    })
    expect(mocks.getTrustedMusicWriteClient).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.auditInsert).not.toHaveBeenCalled()
  })

  it('scopes the kill switch and attributes the audit event to the platform actor', async () => {
    mocks.resolveFlags.mockResolvedValueOnce({ music_rights_admin_admin_ops_enabled: true })

    const response = await POST(opsRequest({
      action_type: 'kill_switch_claims',
      dual_control_required: false,
      payload: { ticket: 'SEC-101' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
      updated_at: expect.any(String),
    }))
    expect(mocks.updateEq).toHaveBeenCalledWith('key', 'music_rights_admin_claims_enabled')
    expect(mocks.auditInsert).toHaveBeenCalledWith({
      actor_user_id: mocks.context.user.id,
      event_type: 'kill_switch_claims',
      event_data: {
        flagKey: 'music_rights_admin_claims_enabled',
        dual_control_required: false,
        ticket: 'SEC-101',
      },
    })
    await expect(response.json()).resolves.toEqual({
      data: { disabled: 'music_rights_admin_claims_enabled' },
      enabled: true,
    })
  })
})
