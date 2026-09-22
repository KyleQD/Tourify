import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RELEASE_SHA_HEADER } from '@/lib/config/release-metadata'

const { mockGetUser, mockPing, mockCreateClient } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockPing: vi.fn(),
  mockCreateClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@upstash/redis', () => ({
  Redis: class {
    ping() {
      return mockPing()
    }
  },
}))

import { GET, HEAD } from '@/app/api/health/readyz/route'

const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ENCRYPTION_KEY',
  'INTERNAL_API_SECRET',
  'CRON_SECRET',
] as const

const REDIS = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const

function stubRequired(present: boolean) {
  for (const name of REQUIRED) {
    const base = present
      ? {
          NEXT_PUBLIC_SUPABASE_URL: 'https://redacted.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-redacted',
          NEXT_PUBLIC_SITE_URL: 'https://redacted.tourify.live',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-redacted',
          ENCRYPTION_KEY: 'a'.repeat(64),
          INTERNAL_API_SECRET: 'internal-redacted',
          CRON_SECRET: 'cron-redacted',
        }
      : {}
    vi.stubEnv(name, base[name as keyof typeof base] ?? '')
  }
}

function stubRedis(present: boolean) {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', present ? 'https://redacted.upstash.io' : '')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', present ? 'upstash-token-redacted' : '')
}

describe('readiness contract /readyz', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    mockPing.mockReset()
    mockCreateClient.mockReset()
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reports not_ready with redacted unconfigured Supabase and Redis when credentials are absent', async () => {
    stubRequired(false)
    stubRedis(false)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(503)
    expect(body.status).toBe('not_ready')
    expect(body.services.supabase.status).toBe('not_configured')
    expect(body.services.redis.status).toBe('not_configured')
    expect(body.requiredServices.status).toBe('not_configured')
    expect(body.requiredServices.services.NEXT_PUBLIC_SUPABASE_URL).toBe(false)
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('reports ready when Supabase and Redis respond and required services are configured', async () => {
    stubRequired(true)
    stubRedis(true)
    mockCreateClient.mockResolvedValue({ auth: { getUser: mockGetUser } })
    mockGetUser.mockResolvedValue({ error: null })
    mockPing.mockResolvedValue('PONG')

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ready')
    expect(body.services.supabase.status).toBe('ready')
    expect(body.services.redis.status).toBe('ready')
    expect(body.requiredServices.status).toBe('ready')
    expect(body.requiredServices.services.NEXT_PUBLIC_SUPABASE_URL).toBe(true)
    expect(mockCreateClient).toHaveBeenCalledTimes(1)
  })

  it('never leaks URLs, tokens, or failure stacks in redacted output', async () => {
    stubRequired(true)
    stubRedis(true)
    const secretUrl = 'https://supersecret-internal.supabase.co'
    const secretToken = 'SUPERSECRETTOKEN'
    const secretRedisUrl = 'https://supersecret-internal.upstash.io'
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', secretUrl)
    vi.stubEnv('UPSTASH_REDIS_REST_URL', secretRedisUrl)
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', secretToken)

    mockCreateClient.mockResolvedValue({ auth: { getUser: mockGetUser } })
    mockGetUser.mockRejectedValue(new Error(`stale stack ${secretUrl} token=${secretToken}`))
    mockPing.mockRejectedValue(new Error(`stale stack ${secretRedisUrl} token=${secretToken}`))

    const response = await GET()
    const rawBody = await response.text()

    expect(response.status).toBe(503)
    expect(rawBody).not.toContain(secretUrl)
    expect(rawBody).not.toContain(secretRedisUrl)
    expect(rawBody).not.toContain(secretToken)
    expect(rawBody).not.toContain('stale stack')
    expect(rawBody).not.toContain('Error:')
  })

  it('keeps GET and HEAD consistent for not_ready and ready states', async () => {
    stubRequired(false)
    stubRedis(false)
    expect((await GET()).status).toBe(503)
    expect((await HEAD()).status).toBe(503)

    vi.unstubAllEnvs()
    stubRequired(true)
    stubRedis(true)
    mockCreateClient.mockResolvedValue({ auth: { getUser: mockGetUser } })
    mockGetUser.mockResolvedValue({ error: null })
    mockPing.mockResolvedValue('PONG')
    expect((await GET()).status).toBe(200)
    expect((await HEAD()).status).toBe(200)
  })

  it('publishes the normalized authoritative Vercel deployment SHA on GET and HEAD', async () => {
    const sha = 'ABCDEF0123456789ABCDEF0123456789ABCDEF01'
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', sha)
    stubRequired(false)
    stubRedis(false)

    const getResponse = await GET()
    expect(getResponse.headers.get(RELEASE_SHA_HEADER)).toBe(sha.toLowerCase())

    const headResponse = await HEAD()
    expect(headResponse.headers.get(RELEASE_SHA_HEADER)).toBe(sha.toLowerCase())
  })

  it('omits the release header when deployment identity is invalid', async () => {
    vi.stubEnv('VERCEL_GIT_COMMIT_SHA', 'abcdef0')
    stubRequired(false)
    stubRedis(false)

    expect((await GET()).headers.has(RELEASE_SHA_HEADER)).toBe(false)
    expect((await HEAD()).headers.has(RELEASE_SHA_HEADER)).toBe(false)
  })
})