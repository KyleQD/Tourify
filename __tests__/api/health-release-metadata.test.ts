import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/health/route'
import { ENVIRONMENT_CONTRACT } from '@/lib/config/environment-contract'
import { RELEASE_SHA_HEADER } from '@/lib/config/release-metadata'

describe('health release metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('publishes the normalized authoritative Vercel deployment SHA', async () => {
    const sha = 'ABCDEF0123456789ABCDEF0123456789ABCDEF01'
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', sha)
    vi.stubEnv('INTERNAL_API_SECRET', '')
    vi.stubEnv('CRON_SECRET', '')

    const response = await GET(new NextRequest('https://tourify.live/api/health'))

    expect(response.status).toBe(200)
    expect(response.headers.get(RELEASE_SHA_HEADER)).toBe(sha.toLowerCase())
    await expect(response.json()).resolves.toMatchObject({ status: 'ok' })
  })

  it.each(['', 'abcdef0', 'z'.repeat(40)])(
    'omits the release header for unavailable or invalid identity %j',
    async (sha) => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('VERCEL_GIT_COMMIT_SHA', sha)
      vi.stubEnv('INTERNAL_API_SECRET', '')
      vi.stubEnv('CRON_SECRET', '')

      const response = await GET(new NextRequest('https://tourify.live/api/health'))

      expect(response.status).toBe(200)
      expect(response.headers.has(RELEASE_SHA_HEADER)).toBe(false)
    },
  )

  it('documents the Vercel SHA as the sole supported release identity source', () => {
    expect(ENVIRONMENT_CONTRACT).toContainEqual(expect.objectContaining({
      name: 'VERCEL_GIT_COMMIT_SHA',
      requirement: 'optional',
    }))
    expect(ENVIRONMENT_CONTRACT.some(({ name }) => name === 'RELEASE_SHA')).toBe(false)
  })
})
