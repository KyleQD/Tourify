/**
 * Regression tests for AUDIT C1 (unsigned session-cookie identity forgery).
 *
 * Contract: the auth helpers in lib/auth/server.ts and
 * lib/auth/production-auth.ts must NEVER derive an identity from unsigned
 * cookie JSON — every path must verify the token with Supabase.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the SSR server client so no network calls happen.
const getUser = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}))

vi.mock('@/lib/auth/mobile-request-auth', () => ({
  authenticateRequestWithBearerFallback: vi.fn(),
}))

import { authenticateApiRequest, checkAuth } from '@/lib/auth/server'

function forgedCookieHeader(victimId: string) {
  const forged = JSON.stringify({
    access_token: 'forged-token',
    expires_at: Math.floor(Date.now() / 1000) + 999_999,
    user: { id: victimId, email: 'victim@example.com' },
  })
  return `sb-tourify-auth-token=${encodeURIComponent(forged)}`
}

describe('C1 regression — no unsigned-cookie identity fallback', () => {
  beforeEach(() => {
    getUser.mockReset()
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  })

  it('authenticateApiRequest returns 401 even when a forged cookie names a user', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })

    // Simulate request context carrying only a forged cookie (no valid session).
    const result = await authenticateApiRequest()

    expect(result).toHaveProperty('status', 401)
    expect(getUser).toHaveBeenCalledTimes(1)
  })

  it('checkAuth returns null when Supabase cannot verify the session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid claim') })

    const result = await checkAuth()
    expect(result).toBeNull()
  })

  it('authenticateApiRequest succeeds only via verified getUser', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'verified-user' } },
      error: null,
    })

    const result = await authenticateApiRequest()
    if (result instanceof Response || 'status' in (result as object)) {
      throw new Error('expected authenticated result')
    }
    expect(result.user.id).toBe('verified-user')
  })
})
