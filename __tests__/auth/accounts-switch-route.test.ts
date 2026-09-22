import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  authenticateRequestWithExplicitJwt: vi.fn(),
  verifyActingProfileAccess: vi.fn(),
  switchAccount: vi.fn(),
}))

vi.mock('@/lib/auth/production-auth', () => ({
  ProductionAuthService: { authenticateRequest: mocks.authenticateRequest },
}))
vi.mock('@/lib/auth/mobile-request-auth', () => ({
  authenticateRequestWithExplicitJwt: mocks.authenticateRequestWithExplicitJwt,
}))
vi.mock('@/lib/auth/acting-context', () => ({
  verifyActingProfileAccess: mocks.verifyActingProfileAccess,
}))
vi.mock('@/lib/services/account-management.service', () => ({
  AccountManagementService: { switchAccount: mocks.switchAccount },
}))

import { POST } from '@/app/api/accounts/route'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const PROFILE_ID = '22222222-2222-4222-8222-222222222222'

function switchRequest(profileId = PROFILE_ID, accountType = 'artist') {
  return new NextRequest('https://tourify.app/api/accounts', {
    method: 'POST',
    body: JSON.stringify({ action: 'switch_account', profileId, accountType }),
  })
}

describe('POST /api/accounts switch_account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authenticateRequest.mockResolvedValue({ user: { id: USER_ID }, supabase: {} })
    mocks.authenticateRequestWithExplicitJwt.mockResolvedValue(null)
  })

  it('rejects malformed persona input before any persistence', async () => {
    const response = await POST(switchRequest('not-a-uuid', 'artist'))
    expect(response.status).toBe(400)
    expect(mocks.verifyActingProfileAccess).not.toHaveBeenCalled()
    expect(mocks.switchAccount).not.toHaveBeenCalled()
  })

  it('denies a cross-tenant profile selection', async () => {
    mocks.verifyActingProfileAccess.mockResolvedValue({ owned: false })
    const response = await POST(switchRequest())
    expect(response.status).toBe(403)
    expect(mocks.switchAccount).not.toHaveBeenCalled()
  })

  it('fails closed when the verified switch cannot be persisted', async () => {
    mocks.verifyActingProfileAccess.mockResolvedValue({ owned: true })
    mocks.switchAccount.mockResolvedValue(false)
    const response = await POST(switchRequest())
    expect(response.status).toBe(503)
  })
})
