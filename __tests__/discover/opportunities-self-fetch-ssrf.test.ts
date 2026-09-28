/**
 * Negative tests for the opportunities RSS self-fetch SSRF fix
 * (security decision DISC-SSRF-004).
 *
 * This was the THIRD live instance of the defect class CodeQL does not cover,
 * and it was found by the standing grep (`rg -n "new URL\('/api/" app lib`),
 * not by a scanner:
 *
 *   lib/opportunities/rss-opportunities-service.ts
 *     — `new URL('/api/feed/rss-news', params.origin)` -> global `fetch()`,
 *       six times inside a `categories.map`
 *
 * `params.origin` was `request.nextUrl.origin` at BOTH callers
 * (`app/api/opportunities/route.ts`, `app/api/opportunities/sync/route.ts`),
 * which reflects the inbound `Host` / `X-Forwarded-Host` header. CodeQL's
 * `js/request-forgery` models `request.url` as a remote-flow source and not
 * `request.nextUrl.origin`, which is why the identical sinks in
 * `app/api/hub/route.ts` and `lib/news/feed-service.ts` were also unflagged.
 *
 * The load-bearing assertion in this suite is the same as the discover and
 * hub/news suites: `https.request` / `http.request` are never invoked on any
 * rejection path, and DNS is never even attempted, so a denial must not reach
 * the network sink at all.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { assertOutboundUrlAllowed, parseAllowedOrigins } from '@/lib/discover/outbound-guard'

const httpsRequest = vi.hoisted(() => vi.fn())
const httpRequest = vi.hoisted(() => vi.fn())
const dnsLookup = vi.hoisted(() => vi.fn())

vi.mock('node:https', () => ({ default: { request: httpsRequest }, request: httpsRequest }))
vi.mock('node:http', () => ({ default: { request: httpRequest }, request: httpRequest }))
vi.mock('node:dns/promises', () => ({ lookup: dnsLookup }))

const {
  fetchInternalJson,
  buildUpstreamUrl,
  INTERNAL_UPSTREAM_ROUTES,
  DISCOVER_UPSTREAM_ROUTES,
} = await import('@/lib/discover/internal-json-fetch')
const { ingestOpportunitiesFromRss } = await import('@/lib/opportunities/rss-opportunities-service')

const OPPORTUNITIES_ROUTE = 'opportunitiesRssNews' as const
const REMOTE_ENV = { INTERNAL_API_ORIGIN: 'https://upstream.tourify.app' }
const REMOTE_OPTS = { env: REMOTE_ENV, nodeEnv: 'production' }
const PUBLIC_DNS = [{ address: '93.184.216.34', family: 4 }]

// ---------------------------------------------------------------------------
// Test doubles for the node:https exchange
// ---------------------------------------------------------------------------

function mockResponse({
  status = 200,
  contentType = 'application/json',
  headers = {},
}: {
  status?: number
  contentType?: string
  headers?: Record<string, string>
} = {}) {
  const listeners: Record<string, ((arg?: unknown) => void)[]> = {}
  const response = {
    statusCode: status,
    headers: { 'content-type': contentType, ...headers },
    on(event: string, handler: (arg?: unknown) => void) {
      ;(listeners[event] ||= []).push(handler)
      return response
    },
    destroy: vi.fn(),
    emit(event: string, arg?: unknown) {
      for (const handler of listeners[event] ?? []) handler(arg)
    },
  }
  return response
}

function mockRequest() {
  const listeners: Record<string, ((arg?: unknown) => void)[]> = {}
  const request = {
    on(event: string, handler: (arg?: unknown) => void) {
      ;(listeners[event] ||= []).push(handler)
      return request
    },
    setTimeout: vi.fn(() => request),
    destroy: vi.fn(),
    end: vi.fn(),
    emit(event: string, arg?: unknown) {
      for (const handler of listeners[event] ?? []) handler(arg)
    },
  }
  return request
}

function respond(
  request: ReturnType<typeof mockRequest>,
  {
    status = 200,
    contentType = 'application/json',
    body = '{"news":[]}',
    headers = {},
  }: {
    status?: number
    contentType?: string
    body?: string
    headers?: Record<string, string>
  } = {}
) {
  const response = mockResponse({ status, contentType, headers })
  request.emit('response', response)
  if (body) response.emit('data', Buffer.from(body))
  response.emit('end')
  return response
}

function socketsOpened() {
  return httpsRequest.mock.calls.length + httpRequest.mock.calls.length
}

function resetTransports() {
  httpsRequest.mockReset()
  httpRequest.mockReset()
  dnsLookup.mockReset()
  dnsLookup.mockResolvedValue(PUBLIC_DNS)
  httpsRequest.mockImplementation(() => mockRequest())
}

/** A Supabase stand-in that records whether any write was attempted. */
function fakeSupabase() {
  const upsert = vi.fn(async () => ({ error: null }))
  return { from: vi.fn(() => ({ upsert })), upsert }
}

const ORIGINAL_ENV = { ...process.env }

function setEnv(values: Record<string, string | undefined>) {
  for (const key of [
    'INTERNAL_API_ORIGIN',
    'NEXT_PUBLIC_APP_URL',
    'VERCEL_PROJECT_PRODUCTION_URL',
    'VERCEL_URL',
    'DISCOVER_ALLOW_LOCAL_UPSTREAM',
  ])
    delete process.env[key]
  Object.assign(process.env, values)
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ---------------------------------------------------------------------------
// The route map the opportunities fan-out can reach
// ---------------------------------------------------------------------------

describe('opportunities upstream registry', () => {
  it('exposes a constant pathname for the opportunities fan-out', () => {
    expect(INTERNAL_UPSTREAM_ROUTES[OPPORTUNITIES_ROUTE]).toEqual({
      pathname: '/api/feed/rss-news',
      params: ['limit', 'category'],
    })
  })

  it('leaves the Wave 33 discover route map byte-identical', () => {
    // Wave 33's 40 tests assert on this map. A change here would silently
    // redefine what those tests mean, so it is pinned exactly.
    expect(DISCOVER_UPSTREAM_ROUTES).toEqual({
      feedPosts: { pathname: '/api/feed/posts', params: ['type', 'limit', 'offset'] },
      eventsDiscover: { pathname: '/api/events/discover', params: ['limit', 'sortBy', 'location'] },
      feedMusic: { pathname: '/api/feed/music', params: ['sortBy', 'limit'] },
      socialSuggested: { pathname: '/api/social/suggested', params: ['limit'] },
      searchEnhanced: {
        pathname: '/api/search/enhanced',
        params: [
          'limit',
          'type',
          'includeRecommendations',
          'sortBy',
          'location',
          'creatorType',
          'service',
          'availableForHire',
        ],
      },
    })
  })

  it('adds no second allowlist source: the guard reads the same four env variables', () => {
    const [origin] = parseAllowedOrigins(REMOTE_ENV)
    const url = new URL(
      buildUpstreamUrl(origin, OPPORTUNITIES_ROUTE, { limit: 24, category: 'Music News' })
    )
    expect(url.origin).toBe('https://upstream.tourify.app')
    expect(url.pathname).toBe('/api/feed/rss-news')
    expect(url.searchParams.get('category')).toBe('Music News')
  })

  it('encodes a hostile category into the query string, never into the host or path', () => {
    const [origin] = parseAllowedOrigins(REMOTE_ENV)
    const url = new URL(
      buildUpstreamUrl(origin, OPPORTUNITIES_ROUTE, {
        category: 'a" OR 1=1 --',
        limit: 24,
        // A value the route does not declare is dropped, never forwarded.
        origin: 'http://169.254.169.254',
      } as never)
    )
    expect(url.origin).toBe('https://upstream.tourify.app')
    expect(url.pathname).toBe('/api/feed/rss-news')
    expect(url.search).not.toContain('169.254')
  })
})

// ---------------------------------------------------------------------------
// Denial never opens a socket — the transport in isolation
// ---------------------------------------------------------------------------

describe('opportunities upstream — denial never opens a socket', () => {
  beforeEach(resetTransports)

  it('denies with no allowlisted origin, before DNS', async () => {
    const result = await fetchInternalJson({ route: OPPORTUNITIES_ROUTE, env: {}, nodeEnv: 'production' })
    expect(result).toEqual({ ok: false, denial: 'no_allowlisted_origin' })
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies a cloud-metadata origin before DNS', async () => {
    const result = await fetchInternalJson({
      route: OPPORTUNITIES_ROUTE,
      env: { INTERNAL_API_ORIGIN: 'http://2852039166' }, // 169.254.169.254
      nodeEnv: 'production',
    })
    expect(result.ok).toBe(false)
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies every Host-header-shaped origin a caller could have forged', () => {
    const allowlist = parseAllowedOrigins(REMOTE_ENV)
    const options = { nodeEnv: 'production', allowedPathPrefixes: ['/api/feed/rss-news'] }
    const expected: Array<[string, string]> = [
      ['https://upstream.tourify.app.evil.example', 'origin_not_allowlisted'],
      ['https://evil-upstream.tourify.app', 'origin_not_allowlisted'],
      ['https://upstream.tourify.app:8443', 'origin_not_allowlisted'],
      ['http://upstream.tourify.app', 'origin_not_allowlisted'],
      ['https://upstream.tourify.app@evil.example', 'credentials_not_allowed'],
      ['http://127.0.0.1:3000', 'origin_not_allowlisted'],
      ['http://0177.0.0.1:3000', 'origin_not_allowlisted'],
      ['https://upstream.tourify.app/api/admin/users', 'path_not_allowlisted'],
    ]
    for (const [url, reason] of expected) {
      expect(assertOutboundUrlAllowed(url, allowlist, options), url).toEqual({
        ok: false,
        reason,
      })
    }
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies a loopback origin in production even when the local opt-in is set', async () => {
    const result = await fetchInternalJson({
      route: OPPORTUNITIES_ROUTE,
      env: { INTERNAL_API_ORIGIN: 'http://127.0.0.1:3000' },
      nodeEnv: 'production',
      allowLocalUpstream: true,
    })
    expect(result).toEqual({ ok: false, denial: 'local_origin_not_permitted' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies a DNS answer that resolves the allowlisted origin internally', async () => {
    dnsLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }])
    const result = await fetchInternalJson({ route: OPPORTUNITIES_ROUTE, ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies a rebinding answer mixing one public and one internal record', async () => {
    dnsLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    const result = await fetchInternalJson({ route: OPPORTUNITIES_ROUTE, ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('never follows a redirect out of the opportunities fan-out', async () => {
    const result = fetchInternalJson({ route: OPPORTUNITIES_ROUTE, ...REMOTE_OPTS })
    await vi.waitFor(() => expect(httpsRequest).toHaveBeenCalledTimes(1))
    const request = httpsRequest.mock.results[0]!.value as ReturnType<typeof mockRequest>
    request.emit(
      'response',
      mockResponse({ status: 307, headers: { location: 'http://169.254.169.254/latest/meta-data/' } })
    )
    await expect(result).resolves.toEqual({ ok: false, denial: 'redirect_not_allowed' })
    expect(String(httpsRequest.mock.calls[0]![0].path)).not.toContain('169.254')
  })
})

// ---------------------------------------------------------------------------
// The call site itself — every rejection path is offline
// ---------------------------------------------------------------------------

describe('ingestOpportunitiesFromRss — no network call on any rejection path', () => {
  beforeEach(resetTransports)

  it('performs zero network calls and zero writes when no origin is allowlisted', async () => {
    setEnv({ NODE_ENV: 'production' })
    const supabase = fakeSupabase()
    await expect(ingestOpportunitiesFromRss({ supabase: supabase as never })).resolves.toEqual({
      upserted: 0,
    })
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
    expect(supabase.from).not.toHaveBeenCalled()
    expect(supabase.upsert).not.toHaveBeenCalled()
  })

  it('performs zero network calls when every configured origin is unusable', async () => {
    // A typo'd origin contributes nothing; it must never widen the allowlist.
    setEnv({ NODE_ENV: 'production', INTERNAL_API_ORIGIN: 'not-a-url https://also-not-a-url' })
    const supabase = fakeSupabase()
    await expect(ingestOpportunitiesFromRss({ supabase: supabase as never })).resolves.toEqual({
      upserted: 0,
    })
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
    expect(supabase.upsert).not.toHaveBeenCalled()
  })

  it('performs zero network calls and zero writes when DNS resolves internally', async () => {
    setEnv({ NODE_ENV: 'production', INTERNAL_API_ORIGIN: 'https://upstream.tourify.app' })
    dnsLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const supabase = fakeSupabase()
    await expect(ingestOpportunitiesFromRss({ supabase: supabase as never })).resolves.toEqual({
      upserted: 0,
    })
    expect(socketsOpened()).toBe(0)
    expect(supabase.upsert).not.toHaveBeenCalled()
  })

  it('keeps the six-way fan-out shape and pins every hop to the validated address', async () => {
    setEnv({ NODE_ENV: 'production', INTERNAL_API_ORIGIN: 'https://upstream.tourify.app' })
    const supabase = fakeSupabase()
    const result = ingestOpportunitiesFromRss({ supabase: supabase as never })

    await vi.waitFor(() => expect(httpsRequest).toHaveBeenCalledTimes(6))
    const body = JSON.stringify({
      news: [
        {
          id: 'pitchfork-0-1',
          title: 'Booking engineer wanted for tour',
          description: 'We are hiring a touring engineer.',
          link: 'https://example.com/jobs/1',
          pubDate: '2026-09-01T00:00:00.000Z',
          source: 'Pitchfork',
        },
      ],
    })
    for (const call of httpsRequest.mock.results) {
      respond(call.value as ReturnType<typeof mockRequest>, { body })
    }

    await expect(result).resolves.toEqual({ upserted: 1 })
    expect(dnsLookup).toHaveBeenCalled()

    const paths = httpsRequest.mock.calls.map(call => String(call[0].path)).sort()
    expect(paths).toEqual([
      '/api/feed/rss-news?limit=24&category=Electronic+Music',
      '/api/feed/rss-news?limit=24&category=Hip-Hop',
      '/api/feed/rss-news?limit=24&category=Indie+Music',
      '/api/feed/rss-news?limit=24&category=Local+Music',
      '/api/feed/rss-news?limit=24&category=Music+Industry',
      '/api/feed/rss-news?limit=24&category=Music+News',
    ])
    for (const call of httpsRequest.mock.calls) {
      const options = call[0] as {
        host: string
        servername: string
        headers: Record<string, string>
        lookup: (h: string, o: object, cb: (e: null, a: unknown) => void) => void
      }
      expect(options.host).toBe('upstream.tourify.app')
      expect(options.servername).toBe('upstream.tourify.app')
      expect(options.headers.host).toBe('upstream.tourify.app:443')
      expect(options.headers['user-agent']).toBe('TourifyOpportunityIngest/1.0')
      const pinned: unknown[] = []
      options.lookup('upstream.tourify.app', {}, (_e, address) => pinned.push(address))
      expect(pinned).toEqual(['93.184.216.34'])
    }
    expect(supabase.upsert).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Regression guards on the reported sink itself
// ---------------------------------------------------------------------------

/**
 * Comments are removed before the source assertions below, because the fixed
 * files deliberately document the removed pattern in prose. A guard that matched
 * the prose would be a guard that can never pass.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // `:` before the slashes keeps `https://` inside a string literal intact.
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('reported sink — the nextUrl.origin self-fetch is gone', () => {
  const service = code(
    readFileSync(join(process.cwd(), 'lib/opportunities/rss-opportunities-service.ts'), 'utf8')
  )
  const opportunitiesRoute = code(readFileSync(join(process.cwd(), 'app/api/opportunities/route.ts'), 'utf8'))
  const syncRoute = code(readFileSync(join(process.cwd(), 'app/api/opportunities/sync/route.ts'), 'utf8'))

  it('the service never derives an outbound base from the inbound request', () => {
    expect(service).not.toMatch(/(?<![\w.])fetch\(/)
    expect(service).not.toMatch(/origin:\s*string/)
    expect(service).toContain('fetchInternalJson')
    expect(service).toContain('parseAllowedOrigins')
    expect(service).toContain('INTERNAL_API_ORIGIN')
  })

  it('the only remaining `new URL(` parses a third-party item link, never a self-fetch base', () => {
    // `normalizeExternalUrl` must still build a URL from `item.link`; that is a
    // different concern (a third-party link, validated to http/https). What must
    // not come back is a two-argument `new URL(pathname, base)`.
    expect(service).not.toMatch(/new URL\(\s*['"`]\/api\//)
    expect(service).not.toMatch(/new URL\([^)]*\borigin\b/)
    const constructions = service.split('\n').filter(line => line.includes('new URL('))
    expect(constructions).toHaveLength(1)
    expect(constructions[0]).toContain('new URL(String(value))')
  })

  it('neither caller supplies an origin any more', () => {
    for (const route of [opportunitiesRoute, syncRoute]) {
      expect(route).not.toMatch(/nextUrl\.origin/)
      expect(route).not.toMatch(/ingestOpportunitiesFromRss\(\{[^}]*\borigin\b/)
    }
    expect(opportunitiesRoute).toContain('ingestOpportunitiesFromRss')
    expect(syncRoute).toContain('ingestOpportunitiesFromRss')
  })

  it('leaves no request-derived self-fetch anywhere in the opportunities surface', () => {
    const surface = `${service}${opportunitiesRoute}${syncRoute}`
    expect(surface).not.toMatch(/nextUrl\.origin/)
    expect(surface).not.toMatch(/new URL\([^)]*origin/)
  })
})
