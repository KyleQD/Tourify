import { NextRequest } from 'next/server'
import { isAuthorizedCronRequest, isAuthorizedInternalRequest } from '../route-guards'

function request(headers: Record<string, string> = {}) {
  return new NextRequest('https://tourify.live/api/cron/test', { headers })
}

describe('route guards', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'production' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects cron requests when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET
    delete process.env.VERCEL

    expect(isAuthorizedCronRequest(request())).toBe(false)
  })

  it('allows Vercel cron requests without requiring CRON_SECRET', () => {
    delete process.env.CRON_SECRET
    process.env.VERCEL = '1'

    expect(isAuthorizedCronRequest(request({ 'x-vercel-cron': '1' }))).toBe(true)
  })

  it('requires matching bearer auth for cron secret requests', () => {
    process.env.CRON_SECRET = 'cron-secret'

    expect(isAuthorizedCronRequest(request({ authorization: 'Bearer cron-secret' }))).toBe(true)
    expect(isAuthorizedCronRequest(request({ authorization: 'Bearer wrong' }))).toBe(false)
  })

  it('requires internal secrets in production', () => {
    process.env.INTERNAL_API_SECRET = 'internal-secret'

    expect(isAuthorizedInternalRequest(request({ 'x-internal-api-secret': 'internal-secret' }))).toBe(true)
    expect(isAuthorizedInternalRequest(request())).toBe(false)
  })
})
