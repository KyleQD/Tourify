import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => {
    throw new Error('createClient should not be called without internal auth')
  }),
}))

function request(method: 'GET' | 'POST') {
  return new NextRequest('https://tourify.live/api/marketplace/migrations/backfill-artist-music', {
    method,
  })
}

describe('marketplace migration backfill guards', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv, NODE_ENV: 'production' }
    delete process.env.INTERNAL_API_SECRET
    delete process.env.CRON_SECRET
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects unauthenticated music backfill preview requests', async () => {
    const route = await import('../backfill-artist-music/route')

    const response = await route.GET(request('GET'))

    expect(response.status).toBe(401)
  })

  it('rejects unauthenticated merch backfill mutation requests', async () => {
    const route = await import('../backfill-artist-merch/route')

    const response = await route.POST(request('POST'))

    expect(response.status).toBe(401)
  })
})
