import { createHmac } from 'crypto'
import {
  createCalendarFeedToken,
  getStoredCalendarToken,
  isValidCalendarFeedToken,
} from '@/lib/calendar/feed-token'
import { isAuthorizedCronRequest, isAuthorizedInternalRequest } from '@/lib/auth/route-guards'
import { NextRequest } from 'next/server'

describe('calendar feed token', () => {
  const previous = {
    CALENDAR_FEED_SECRET: process.env.CALENDAR_FEED_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
  }

  beforeEach(() => {
    process.env.CALENDAR_FEED_SECRET = 'test-calendar-secret'
    delete process.env.CRON_SECRET
    delete process.env.INTERNAL_API_SECRET
  })

  afterAll(() => {
    process.env.CALENDAR_FEED_SECRET = previous.CALENDAR_FEED_SECRET
    process.env.CRON_SECRET = previous.CRON_SECRET
    process.env.INTERNAL_API_SECRET = previous.INTERNAL_API_SECRET
  })

  it('rejects missing tokens', () => {
    expect(isValidCalendarFeedToken({
      resourceType: 'event',
      resourceId: 'event-1',
      token: null,
    })).toBe(false)
  })

  it('accepts HMAC tokens derived from the feed secret', () => {
    const token = createCalendarFeedToken('event', 'event-1')
    expect(token).toBeTruthy()
    expect(isValidCalendarFeedToken({
      resourceType: 'event',
      resourceId: 'event-1',
      token,
    })).toBe(true)
  })

  it('accepts stored calendar tokens from event settings', () => {
    expect(getStoredCalendarToken({ calendar_token: 'stored-token' })).toBe('stored-token')
    expect(isValidCalendarFeedToken({
      resourceType: 'event',
      resourceId: 'event-1',
      token: 'stored-token',
      storedToken: 'stored-token',
    })).toBe(true)
  })

  it('rejects forged HMAC tokens', () => {
    const forged = createHmac('sha256', 'wrong-secret')
      .update('event:event-1')
      .digest('hex')
      .slice(0, 32)

    expect(isValidCalendarFeedToken({
      resourceType: 'event',
      resourceId: 'event-1',
      token: forged,
    })).toBe(false)
  })
})

describe('route guards', () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    CRON_SECRET: process.env.CRON_SECRET,
    INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET,
    VERCEL: process.env.VERCEL,
    ALLOW_OPEN_INTERNAL_ROUTES: process.env.ALLOW_OPEN_INTERNAL_ROUTES,
  }

  afterEach(() => {
    process.env.NODE_ENV = previous.NODE_ENV
    process.env.CRON_SECRET = previous.CRON_SECRET
    process.env.INTERNAL_API_SECRET = previous.INTERNAL_API_SECRET
    process.env.VERCEL = previous.VERCEL
    process.env.ALLOW_OPEN_INTERNAL_ROUTES = previous.ALLOW_OPEN_INTERNAL_ROUTES
  })

  it('does not trust x-vercel-cron alone', () => {
    process.env.VERCEL = '1'
    process.env.CRON_SECRET = 'cron-secret'
    const request = new NextRequest('https://example.com/api/cron/test', {
      headers: { 'x-vercel-cron': '1' },
    })
    expect(isAuthorizedCronRequest(request)).toBe(false)
  })

  it('accepts CRON_SECRET bearer auth', () => {
    process.env.CRON_SECRET = 'cron-secret'
    const request = new NextRequest('https://example.com/api/cron/test', {
      headers: { authorization: 'Bearer cron-secret' },
    })
    expect(isAuthorizedCronRequest(request)).toBe(true)
  })

  it('fails closed for internal routes without secrets', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.INTERNAL_API_SECRET
    delete process.env.CRON_SECRET
    delete process.env.ALLOW_OPEN_INTERNAL_ROUTES
    const request = new NextRequest('https://example.com/api/debug/db-schema')
    expect(isAuthorizedInternalRequest(request)).toBe(false)
  })
})
