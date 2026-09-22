import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authenticateApiRequest } = vi.hoisted(() => ({
  authenticateApiRequest: vi.fn(),
}))

vi.mock('@/lib/auth/api-auth', () => ({ authenticateApiRequest }))

import { GET } from '@/app/api/auth/session/route'

describe('GET /api/auth/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects an unverified session', async () => {
    authenticateApiRequest.mockResolvedValue(null)
    const response = await GET(new NextRequest('https://tourify.app/api/auth/session'))
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ authenticated: false })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('returns only verified, non-token user data', async () => {
    authenticateApiRequest.mockResolvedValue({
      user: { id: 'user-a', email: 'a@example.com' },
      supabase: {},
    })
    const response = await GET(new NextRequest('https://tourify.app/api/auth/session'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      authenticated: true,
      user: { id: 'user-a', email: 'a@example.com' },
    })
    expect(response.headers.get('vary')).toBe('Cookie, Authorization')
  })
})
