/**
 * Negative tests for the /api/hub and lib/news self-fetch SSRF fixes
 * (security decisions DISC-SSRF-002 and DISC-SSRF-003).
 *
 * Both sinks were the identical defect class as CodeQL alert #16
 * (`js/request-forgery`, CWE-918) but were NOT flagged, because that query
 * treats `request.url` as a remote-flow source and not
 * `request.nextUrl.origin`:
 *
 *   - app/api/hub/route.ts  — `request.nextUrl.origin` -> fetch(`${baseUrl}${fullPath}`)
 *   - lib/news/feed-service.ts — `new URL('/api/feed/rss-news', requestOrigin)` -> fetch()
 *
 * The load-bearing assertion in this suite is the same as the discover suite:
 * `https.request` / `http.request` are never invoked on any rejection path, so
 * a denial must not reach the network sink at all.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assertOutboundUrlAllowed, parseAllowedOrigins } from '@/lib/discover/outbound-guard'

const httpsRequest = vi.hoisted(() => vi.fn())
const httpRequest = vi.hoisted(() => vi.fn())
const dnsLookup = vi.hoisted(() => vi.fn())

vi.mock('node:https', () => ({ default: { request: httpsRequest }, request: httpsRequest }))
vi.mock('node:http', () => ({ default: { request: httpRequest }, request: httpRequest }))
vi.mock('node:dns/promises', () => ({ lookup: dnsLookup }))

const { fetchInternalJson, buildUpstreamUrl, INTERNAL_UPSTREAM_ROUTES } = await import(
  '@/lib/discover/internal-json-fetch'
)

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
    body = '{"ok":true}',
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

async function waitForSocket(transport: typeof httpsRequest | typeof httpRequest) {
  await vi.waitFor(() => expect(transport).toHaveBeenCalled())
  return transport.mock.results[0]!.value as ReturnType<typeof mockRequest>
}

function resetTransports() {
  httpsRequest.mockReset()
  httpRequest.mockReset()
  dnsLookup.mockReset()
  dnsLookup.mockResolvedValue(PUBLIC_DNS)
}

// ---------------------------------------------------------------------------
// The route maps the two surfaces can reach
// ---------------------------------------------------------------------------

const HUB_ROUTES = ['hubDiscover', 'hubNewsFeed', 'hubArtistJobs'] as const
const NEWS_ROUTES = ['newsRssFeed'] as const

describe('hub + news upstream registry', () => {
  it('exposes only constant pathnames for the hub and news fan-outs', () => {
    expect(HUB_ROUTES.map(route => INTERNAL_UPSTREAM_ROUTES[route].pathname)).toEqual([
      '/api/discover',
      '/api/news/feed',
      '/api/artist-jobs',
    ])
    expect(NEWS_ROUTES.map(route => INTERNAL_UPSTREAM_ROUTES[route].pathname)).toEqual([
      '/api/feed/rss-news',
    ])
  })

  it('keeps the original discover route map frozen and unchanged', () => {
    expect(Object.keys(INTERNAL_UPSTREAM_ROUTES)).toEqual(
      expect.arrayContaining([
        'feedPosts',
        'eventsDiscover',
        'feedMusic',
        'socialSuggested',
        'searchEnhanced',
      ])
    )
  })

  it('builds a constant pathname on the allowlisted origin for every hub and news route', () => {
    const [origin] = parseAllowedOrigins(REMOTE_ENV)
    for (const route of [...HUB_ROUTES, ...NEWS_ROUTES]) {
      const url = new URL(buildUpstreamUrl(origin, route, { evil: 'https://169.254.169.254' } as never))
      expect(url.origin).toBe('https://upstream.tourify.app')
      expect(url.pathname).toBe(INTERNAL_UPSTREAM_ROUTES[route].pathname)
      // A value the route does not declare is dropped, never forwarded.
      expect(url.search).toBe('')
    }
  })

  it('encodes a hostile category into the query string, never into the host or path', () => {
    const [origin] = parseAllowedOrigins(REMOTE_ENV)
    const url = new URL(
      buildUpstreamUrl(origin, 'newsRssFeed', { category: 'a" OR 1=1 --', limit: 12 })
    )
    expect(url.origin).toBe('https://upstream.tourify.app')
    expect(url.pathname).toBe('/api/feed/rss-news')
    expect(url.searchParams.get('category')).toBe('a" OR 1=1 --')
  })
})

// ---------------------------------------------------------------------------
// No network call on rejection — hub
// ---------------------------------------------------------------------------

describe('hub fan-out — denial never opens a socket', () => {
  beforeEach(resetTransports)

  for (const route of HUB_ROUTES) {
    it(`denies "${route}" with no allowlisted origin, before DNS`, async () => {
      const result = await fetchInternalJson({ route, env: {}, nodeEnv: 'production' })
      expect(result).toEqual({ ok: false, denial: 'no_allowlisted_origin' })
      expect(dnsLookup).not.toHaveBeenCalled()
      expect(socketsOpened()).toBe(0)
    })

    it(`denies "${route}" when the configured origin is a cloud-metadata literal`, async () => {
      const result = await fetchInternalJson({
        route,
        env: { INTERNAL_API_ORIGIN: 'http://2852039166' }, // 169.254.169.254
        nodeEnv: 'production',
      })
      expect(result.ok).toBe(false)
      expect(dnsLookup).not.toHaveBeenCalled()
      expect(socketsOpened()).toBe(0)
    })
  }

  it('denies every Host-header-shaped origin a caller could have forged', () => {
    // What `request.nextUrl.origin` would have produced for a forged
    // Host / X-Forwarded-Host header. The guard is called with the fully
    // assembled URL, so each of these must be refused.
    const allowlist = parseAllowedOrigins(REMOTE_ENV)
    const options = { nodeEnv: 'production', allowedPathPrefixes: ['/api/discover', '/api/feed/rss-news'] }
    const expected: Array<[string, string]> = [
      ['https://upstream.tourify.app.evil.example', 'origin_not_allowlisted'],
      ['https://evil-upstream.tourify.app', 'origin_not_allowlisted'],
      ['https://upstream.tourify.app:8443', 'origin_not_allowlisted'],
      ['http://upstream.tourify.app', 'origin_not_allowlisted'],
      ['https://upstream.tourify.app@evil.example', 'credentials_not_allowed'],
      ['http://127.0.0.1:3000', 'origin_not_allowlisted'],
      ['http://[::1]:3000', 'origin_not_allowlisted'],
      ['http://0177.0.0.1:3000', 'origin_not_allowlisted'],
      ['gopher://upstream.tourify.app', 'scheme_not_allowed'],
      ['https://upstream.tourify.app/api/admin/users', 'path_not_allowlisted'],
    ]
    for (const [url, reason] of expected) {
      expect(assertOutboundUrlAllowed(url, allowlist, options), url).toEqual({
        ok: false,
        reason,
      })
    }
    // A path on the allowlist still requires the allowlisted origin, and no
    // denial above performed DNS or opened a socket.
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies a loopback origin in production even when the local opt-in is set', async () => {
    const result = await fetchInternalJson({
      route: 'hubNewsFeed',
      env: { INTERNAL_API_ORIGIN: 'http://127.0.0.1:3000' },
      nodeEnv: 'production',
      allowLocalUpstream: true,
    })
    expect(result).toEqual({ ok: false, denial: 'local_origin_not_permitted' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies a DNS answer that resolves the allowlisted hub origin internally', async () => {
    dnsLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }])
    const result = await fetchInternalJson({ route: 'hubArtistJobs', ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies a rebinding answer that mixes one public and one internal record', async () => {
    dnsLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])
    const result = await fetchInternalJson({ route: 'hubNewsFeed', ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('never follows a redirect out of the hub fan-out', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'hubDiscover', ...REMOTE_OPTS })

    const request = await waitForSocket(httpsRequest)
    request.emit(
      'response',
      mockResponse({ status: 307, headers: { location: 'http://169.254.169.254/latest/meta-data/' } })
    )

    await expect(result).resolves.toEqual({ ok: false, denial: 'redirect_not_allowed' })
    // Exactly one hop was issued and the Location value was never requested.
    expect(httpsRequest).toHaveBeenCalledTimes(1)
    expect(String(httpsRequest.mock.calls[0]![0].path)).not.toContain('169.254')
  })
})

// ---------------------------------------------------------------------------
// No network call on rejection — news
// ---------------------------------------------------------------------------

describe('news fan-out — denial never opens a socket', () => {
  beforeEach(resetTransports)

  it('denies the RSS fan-out with no allowlisted origin, before DNS', async () => {
    const result = await fetchInternalJson({
      route: 'newsRssFeed',
      params: { limit: 12, category: 'music' },
      env: {},
      nodeEnv: 'production',
    })
    expect(result).toEqual({ ok: false, denial: 'no_allowlisted_origin' })
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies an internal DNS answer for the news origin', async () => {
    dnsLookup.mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }])
    const result = await fetchInternalJson({
      route: 'newsRssFeed',
      params: { limit: 12, category: 'music' },
      ...REMOTE_OPTS,
    })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('never follows a redirect out of the news fan-out', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({
      route: 'newsRssFeed',
      params: { limit: 12, category: 'music' },
      ...REMOTE_OPTS,
    })

    const request = await waitForSocket(httpsRequest)
    request.emit(
      'response',
      mockResponse({ status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } })
    )

    await expect(result).resolves.toEqual({ ok: false, denial: 'redirect_not_allowed' })
    expect(httpsRequest).toHaveBeenCalledTimes(1)
  })

  it('denies an oversized or non-JSON upstream so the fan-out is not an exfiltration channel', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const tooLarge = fetchInternalJson({
      route: 'newsRssFeed',
      ...REMOTE_OPTS,
      maxResponseBytes: 4,
    })
    const first = await waitForSocket(httpsRequest)
    const response = mockResponse()
    first.emit('response', response)
    response.emit('data', Buffer.from('{"news":[]}'))
    response.emit('data', Buffer.from('x'.repeat(64)))
    response.emit('end')
    await expect(tooLarge).resolves.toEqual({ ok: false, denial: 'response_too_large' })

    resetTransports()
    httpsRequest.mockReturnValue(mockRequest())
    const html = fetchInternalJson({ route: 'newsRssFeed', ...REMOTE_OPTS })
    const second = await waitForSocket(httpsRequest)
    respond(second, { contentType: 'text/html', body: '<html>metadata</html>' })
    await expect(html).resolves.toEqual({ ok: false, denial: 'unexpected_content_type' })
  })
})

// ---------------------------------------------------------------------------
// Allowed upstream — resolve-then-pin on both surfaces
// ---------------------------------------------------------------------------

describe('hub + news fan-out — allowed upstream', () => {
  beforeEach(resetTransports)

  it('connects the hub to the validated address, not to a second DNS answer', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({
      route: 'hubNewsFeed',
      params: { facet: 'top', limit: 8 },
      ...REMOTE_OPTS,
    })

    const request = await waitForSocket(httpsRequest)
    respond(request, { body: '{"items":[]}' })
    await expect(result).resolves.toEqual({ ok: true, data: { items: [] } })

    const options = httpsRequest.mock.calls[0]![0]
    expect(options.host).toBe('upstream.tourify.app')
    expect(options.servername).toBe('upstream.tourify.app')
    expect(options.headers.host).toBe('upstream.tourify.app:443')
    expect(options.path).toBe('/api/news/feed?facet=top&limit=8')

    const pinned: unknown[] = []
    options.lookup('upstream.tourify.app', {}, (_err: unknown, address: unknown) => pinned.push(address))
    expect(pinned).toEqual(['93.184.216.34'])
  })

  it('connects the news fan-out to the validated address and forwards only the fixed user-agent', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({
      route: 'newsRssFeed',
      params: { limit: 12, category: 'gospel' },
      headers: { 'user-agent': 'TourifyNewsAggregator/1.0' },
      ...REMOTE_OPTS,
    })

    const request = await waitForSocket(httpsRequest)
    respond(request, { body: '{"news":[]}' })
    await expect(result).resolves.toEqual({ ok: true, data: { news: [] } })

    const options = httpsRequest.mock.calls[0]![0]
    expect(options.path).toBe('/api/feed/rss-news?limit=12&category=gospel')
    expect(options.headers['user-agent']).toBe('TourifyNewsAggregator/1.0')
    expect(options.headers.accept).toBe('application/json')
  })

  it('denies a non-2xx upstream response', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'newsRssFeed', ...REMOTE_OPTS })
    const request = await waitForSocket(httpsRequest)
    respond(request, { status: 401, body: '{"error":"nope"}' })
    await expect(result).resolves.toEqual({ ok: false, denial: 'network_error' })
  })
})

// ---------------------------------------------------------------------------
// Regression guards on the two reported sinks themselves
// ---------------------------------------------------------------------------

/**
 * Comments are removed before the source assertions below, because both files
 * deliberately document the removed pattern in prose. A guard that matched the
 * prose would be a guard that can never pass.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // `:` before the slashes keeps `https://` inside a string literal intact.
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

describe('reported sinks — the nextUrl.origin self-fetch is gone', () => {
  const hub = code(readFileSync(join(process.cwd(), 'app/api/hub/route.ts'), 'utf8'))
  const news = code(readFileSync(join(process.cwd(), 'lib/news/feed-service.ts'), 'utf8'))

  it('hub never derives an outbound base from the inbound request', () => {
    expect(hub).not.toContain('nextUrl.origin')
    expect(hub).not.toMatch(/const\s+baseUrl\s*=/)
    expect(hub).not.toMatch(/\$\{\s*baseUrl\s*\}/)
    expect(hub).not.toMatch(/(?<![\w.])fetch\(/)
    expect(hub).toContain('fetchInternalJson')
    expect(hub).toContain('parseAllowedOrigins')
  })

  it('news never builds a self-fetch URL from a request origin', () => {
    expect(news).not.toMatch(/(?<![\w.])fetch\(/)
    expect(news).not.toMatch(/new URL\([^)]*requestOrigin/)
    expect(news).toContain('fetchInternalJson')
    expect(news).toContain('parseAllowedOrigins')
    // The only remaining mention of requestOrigin is the deprecated, unread
    // field declaration that keeps the out-of-lane callers compiling.
    const mentions = news.split('\n').filter(line => line.includes('requestOrigin'))
    expect(mentions).toHaveLength(1)
    expect(mentions[0]).toMatch(/requestOrigin\?: string/)
  })

  it('leaves no `nextUrl.origin` self-fetch anywhere in the two surfaces', () => {
    expect(`${hub}${news}`).not.toMatch(/nextUrl\.origin/)
    expect(`${hub}${news}`).not.toMatch(/new URL\([^)]*requestOrigin/)
  })
})
