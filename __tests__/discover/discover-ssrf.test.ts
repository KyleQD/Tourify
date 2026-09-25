/**
 * Negative tests for the /api/discover SSRF fix (CodeQL alert #16,
 * js/request-forgery / CWE-918, security decision DISC-SSRF-001).
 *
 * The load-bearing assertion in the I/O suite is `https.request` / `http.request`
 * never being invoked on any rejection path — a denial must not reach the
 * network sink at all.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  BLOCKED_HOSTNAMES,
  assertOutboundUrlAllowed,
  classifyHost,
  isBlockedHostname,
  isBlockedIpAddress,
  isBlockedIpv4Number,
  isOriginUsable,
  parseAllowedOrigins,
  parseIpv4,
  parseIpv6,
} from '@/lib/discover/outbound-guard'

const httpsRequest = vi.hoisted(() => vi.fn())
const httpRequest = vi.hoisted(() => vi.fn())
const dnsLookup = vi.hoisted(() => vi.fn())

vi.mock('node:https', () => ({ default: { request: httpsRequest }, request: httpsRequest }))
vi.mock('node:http', () => ({ default: { request: httpRequest }, request: httpRequest }))
vi.mock('node:dns/promises', () => ({ lookup: dnsLookup }))

const { fetchInternalJson, buildUpstreamUrl, DISCOVER_UPSTREAM_ROUTES } = await import(
  '@/lib/discover/internal-json-fetch'
)

const REMOTE_ENV = { INTERNAL_API_ORIGIN: 'https://upstream.tourify.app' }
const REMOTE_OPTS = { env: REMOTE_ENV, nodeEnv: 'production' }

// ---------------------------------------------------------------------------
// IP / host classification
// ---------------------------------------------------------------------------

describe('outbound guard — address policy', () => {
  it('normalizes every historical IPv4 encoding to the same numeric address', () => {
    for (const form of ['127.0.0.1', '127.1', '0177.0.0.1', '0x7f000001', '2130706433', '0X7F.0.0.1']) {
      expect(parseIpv4(form)).toBe(0x7f000001)
      expect(isBlockedIpv4Number(parseIpv4(form)!)).toBe(true)
    }
  })

  it('normalizes octal and hex for every private range', () => {
    expect(isBlockedIpAddress('012.0.0.1')).toBe(true) // 10.0.0.1
    expect(isBlockedIpAddress('0xa.0.0.1')).toBe(true) // 10.0.0.1
    expect(isBlockedIpAddress('172.31.255.255')).toBe(true)
    expect(isBlockedIpAddress('172.15.0.1')).toBe(false) // outside 172.16/12
    expect(isBlockedIpAddress('100.64.0.1')).toBe(true) // CGNAT
    expect(isBlockedIpAddress('169.254.169.254')).toBe(true) // cloud metadata
    expect(isBlockedIpAddress('198.18.0.1')).toBe(true) // benchmarking
    expect(isBlockedIpAddress('224.0.0.1')).toBe(true) // multicast
    expect(isBlockedIpAddress('255.255.255.255')).toBe(true)
  })

  it('rejects IPv4-mapped, translated, NAT64 and 6to4 IPv6 that embed an internal v4', () => {
    expect(parseIpv6('::ffff:127.0.0.1')).not.toBeNull()
    expect(isBlockedIpAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isBlockedIpAddress('::ffff:169.254.169.254')).toBe(true)
    expect(isBlockedIpAddress('::ffff:7f00:1')).toBe(true)
    expect(isBlockedIpAddress('64:ff9b::a9fe:a9fe')).toBe(true) // NAT64 -> 169.254.169.254
    expect(isBlockedIpAddress('2002:a9fe:a9fe::')).toBe(true) // 6to4 -> 169.254.169.254
    expect(isBlockedIpAddress('::ffff:8.8.8.8')).toBe(false)
  })

  it('rejects loopback, ULA, link-local and multicast IPv6', () => {
    for (const host of ['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', 'fec0::1']) {
      expect(isBlockedIpAddress(host)).toBe(true)
    }
    expect(isBlockedIpAddress('2606:4700:4700::1111')).toBe(false)
  })

  it('rejects bracketed and zone-suffixed IPv6 literals', () => {
    expect(isBlockedIpAddress('[::1]')).toBe(true)
    expect(isBlockedIpAddress('fe80::1%eth0')).toBe(true)
  })

  it('rejects local-only and cloud-metadata hostnames', () => {
    for (const host of [
      'localhost',
      'app.localhost',
      'printer.local',
      'vault.internal',
      'metadata.google.internal',
      'box.home.arpa',
      'service.corp',
      'anything.onion',
    ]) {
      expect(isBlockedHostname(host), host).toBe(true)
    }
    expect(BLOCKED_HOSTNAMES).toContain('metadata.google.internal')
    expect(isBlockedHostname('app.tourify.test')).toBe(true) // RFC 6761 reserved TLD
    expect(isBlockedHostname('upstream.tourify.app')).toBe(false)
  })

  it('never treats a malformed host as a resolvable name', () => {
    expect(classifyHost('exa mple.com').blocked).toBe(true)
    expect(classifyHost('[not-an-ip]').blocked).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

describe('outbound guard — exact-origin allowlist', () => {
  it('fails closed with no configured origin and has no localhost fallback', () => {
    expect(parseAllowedOrigins({})).toEqual([])
    expect(parseAllowedOrigins({ INTERNAL_API_ORIGIN: '   ' })).toEqual([])
    expect(parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'not a url::' })).toEqual([])
  })

  it('reads server env only and normalizes the origin', () => {
    const allowlist = parseAllowedOrigins({ VERCEL_URL: 'tourify-app.vercel.app' })
    expect(allowlist).toHaveLength(1)
    expect(allowlist[0]).toMatchObject({
      origin: 'https://tourify-app.vercel.app',
      scheme: 'https:',
      hostname: 'tourify-app.vercel.app',
      port: '443',
      source: 'VERCEL_URL',
      scope: 'remote',
    })
  })

  it('rejects non-http schemes, embedded credentials, and paths in the configured origin', () => {
    expect(parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'file:///etc/passwd' })).toEqual([])
    expect(parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'gopher://app.tourify.app' })).toEqual([])
    expect(parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'https://user:pw@app.tourify.app' })).toEqual([])
    expect(parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'https://app.tourify.app/evil' })).toEqual([])
  })

  it('honors a loopback origin only outside production and only with an explicit opt-in', () => {
    const [local] = parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'http://127.0.0.1:3000' })
    expect(local.scope).toBe('local')
    expect(isOriginUsable(local, { nodeEnv: 'production' })).toBe(false)
    expect(isOriginUsable(local, { nodeEnv: 'development' })).toBe(false)
    expect(isOriginUsable(local, { nodeEnv: 'development', allowLocalUpstream: true })).toBe(true)
  })
})

describe('outbound guard — URL assertion', () => {
  const allowlist = parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'https://upstream.tourify.app' })
  const opts = { nodeEnv: 'production', allowedPathPrefixes: ['/api/feed/posts'] }

  it('accepts an allowlisted origin on an allowlisted path', () => {
    const decision = assertOutboundUrlAllowed('https://upstream.tourify.app/api/feed/posts?limit=5', allowlist, opts)
    expect(decision.ok).toBe(true)
    expect(decision.origin?.origin).toBe('https://upstream.tourify.app')
  })

  it('rejects a host that is only a prefix/suffix match of an allowlisted host', () => {
    for (const host of [
      'https://upstream.tourify.app.evil.example',
      'https://evil-upstream.tourify.app',
      'https://upstream.tourify.app:8443',
      'http://upstream.tourify.app',
      'https://UPSTREAM.TOURIFY.APP.evil.example',
    ]) {
      expect(assertOutboundUrlAllowed(host, allowlist, opts), host).toMatchObject({
        ok: false,
        reason: 'origin_not_allowlisted',
      })
    }
  })

  it('rejects a userinfo-prefixed allowlisted host (host is really evil.example)', () => {
    expect(
      assertOutboundUrlAllowed('https://upstream.tourify.app@evil.example/x', allowlist, opts)
    ).toMatchObject({ ok: false, reason: 'credentials_not_allowed' })
  })

  it('rejects non-http(s) schemes and embedded credentials', () => {
    expect(assertOutboundUrlAllowed('file:///etc/passwd', allowlist, opts)).toMatchObject({
      ok: false,
      reason: 'scheme_not_allowed',
    })
    expect(assertOutboundUrlAllowed('gopher://upstream.tourify.app/x', allowlist, opts)).toMatchObject({
      ok: false,
      reason: 'scheme_not_allowed',
    })
    expect(assertOutboundUrlAllowed('https://u:p@upstream.tourify.app/x', allowlist, opts)).toMatchObject({
      ok: false,
      reason: 'credentials_not_allowed',
    })
    expect(assertOutboundUrlAllowed('not a url', allowlist, opts)).toMatchObject({
      ok: false,
      reason: 'invalid_url',
    })
  })

  it('rejects a path that is not on the route allowlist, including traversal', () => {
    for (const path of [
      'https://upstream.tourify.app/api/admin/users',
      'https://upstream.tourify.app/api/feed/posts/../../../api/keys',
      'https://upstream.tourify.app/api/feed/posts/../secret',
    ]) {
      expect(assertOutboundUrlAllowed(path, allowlist, opts), path).toMatchObject({
        ok: false,
        reason: 'path_not_allowlisted',
      })
    }
  })
})

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe('internal fetch — URL construction', () => {
  const [origin] = parseAllowedOrigins({ INTERNAL_API_ORIGIN: 'https://upstream.tourify.app' })

  it('always builds a constant pathname from the allowlisted origin', () => {
    const url = new URL(
      buildUpstreamUrl(origin, 'eventsDiscover', { limit: 10, sortBy: 'relevance', location: 'Austin, TX' })
    )
    expect(url.origin).toBe('https://upstream.tourify.app')
    expect(url.pathname).toBe('/api/events/discover')
    expect(url.searchParams.get('location')).toBe('Austin, TX')
  })

  it('drops parameters the route does not declare', () => {
    const url = new URL(
      buildUpstreamUrl(origin, 'feedPosts', { limit: 5, __proto__: 'x', evil: 'https://169.254.169.254' } as never)
    )
    expect(url.search).toBe('?limit=5')
  })

  it('encodes a hostile parameter value into the query string, never into the host or path', () => {
    const url = new URL(
      buildUpstreamUrl(origin, 'searchEnhanced', {
        location: 'x" OR 1=1 --',
        service: 'javascript:alert(1)',
      })
    )
    expect(url.origin).toBe('https://upstream.tourify.app')
    expect(url.pathname).toBe('/api/search/enhanced')
    expect(url.searchParams.get('location')).toBe('x" OR 1=1 --')
  })

  it('exposes a frozen route map with no user-selectable pathname', () => {
    expect(Object.values(DISCOVER_UPSTREAM_ROUTES).map((route) => route.pathname)).toEqual([
      '/api/feed/posts',
      '/api/events/discover',
      '/api/feed/music',
      '/api/social/suggested',
      '/api/search/enhanced',
    ])
  })
})

// ---------------------------------------------------------------------------
// I/O: resolve-then-pin, redirects, limits, and no-socket-on-rejection
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

/** Sockets opened so far — the assertion target for every denial path. */
function socketsOpened() {
  return httpsRequest.mock.calls.length + httpRequest.mock.calls.length
}

/**
 * `fetchInternalJson` awaits DNS before it opens a socket, so a test must wait
 * for the transport mock to be called before driving the response events.
 */
async function waitForSocket(transport: typeof httpsRequest | typeof httpRequest) {
  await vi.waitFor(() => expect(transport).toHaveBeenCalled())
  return transport.mock.results[0]!.value as ReturnType<typeof mockRequest>
}

const PUBLIC_DNS = [{ address: '93.184.216.34', family: 4 }]

describe('internal fetch — no network call on rejection', () => {
  beforeEach(() => {
    httpsRequest.mockReset()
    httpRequest.mockReset()
    dnsLookup.mockReset()
    dnsLookup.mockResolvedValue(PUBLIC_DNS)
  })

  it('denies everything when no origin is allowlisted, before DNS', async () => {
    const result = await fetchInternalJson({ route: 'feedPosts', env: {}, nodeEnv: 'production' })
    expect(result).toEqual({ ok: false, denial: 'no_allowlisted_origin' })
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies an internal literal origin in production without resolving it', async () => {
    const result = await fetchInternalJson({
      route: 'feedPosts',
      env: { INTERNAL_API_ORIGIN: 'http://169.254.169.254' },
      nodeEnv: 'production',
    })
    expect(result.ok).toBe(false)
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('denies a loopback origin in production even with the local opt-in set', async () => {
    const result = await fetchInternalJson({
      route: 'feedPosts',
      env: { INTERNAL_API_ORIGIN: 'http://127.0.0.1:3000' },
      nodeEnv: 'production',
      allowLocalUpstream: true,
    })
    expect(result).toEqual({ ok: false, denial: 'local_origin_not_permitted' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies a decimal-encoded metadata origin and never resolves it', async () => {
    const result = await fetchInternalJson({
      route: 'feedPosts',
      env: { INTERNAL_API_ORIGIN: 'http://2852039166' }, // 169.254.169.254
      nodeEnv: 'production',
    })
    expect(result.ok).toBe(false)
    expect(dnsLookup).not.toHaveBeenCalled()
    expect(socketsOpened()).toBe(0)
  })

  it('reads the local opt-in from DISCOVER_ALLOW_LOCAL_UPSTREAM, not just from a call option', async () => {
    dnsLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const enabled = {
      INTERNAL_API_ORIGIN: 'http://127.0.0.1:3000',
      NODE_ENV: 'development',
      DISCOVER_ALLOW_LOCAL_UPSTREAM: 'true',
    }

    httpRequest.mockReturnValue(mockRequest())
    const allowed = fetchInternalJson({ route: 'feedPosts', env: enabled })
    const allowedRequest = await waitForSocket(httpRequest)
    respond(allowedRequest, { body: '{"data":[]}' })
    await expect(allowed).resolves.toEqual({ ok: true, data: { data: [] } })

    // Reset isolates the denied call, so zero here means it opened nothing.
    httpRequest.mockReset()
    const denied = await fetchInternalJson({
      route: 'feedPosts',
      env: { ...enabled, DISCOVER_ALLOW_LOCAL_UPSTREAM: 'false' },
    })
    expect(denied).toEqual({ ok: false, denial: 'local_origin_not_permitted' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies an origin whose DNS answer is internal, without opening a socket', async () => {
    dnsLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    const result = await fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies a rebinding answer that mixes one public and one internal record', async () => {
    dnsLookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '169.254.169.254', family: 4 },
    ])
    const result = await fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies an IPv6-mapped internal DNS answer without opening a socket', async () => {
    dnsLookup.mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }])
    const result = await fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_blocked_address' })
    expect(socketsOpened()).toBe(0)
  })

  it('denies an unresolvable origin without opening a socket', async () => {
    dnsLookup.mockRejectedValue(new Error('ENOTFOUND'))
    const result = await fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })
    expect(result).toEqual({ ok: false, denial: 'dns_resolution_failed' })
    expect(socketsOpened()).toBe(0)
  })

  it('never follows a redirect to an internal address', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })

    const request = await waitForSocket(httpsRequest)
    request.emit('response', mockResponse({ status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } }))

    await expect(result).resolves.toEqual({ ok: false, denial: 'redirect_not_allowed' })
    // Exactly one hop was issued and the Location value was never requested.
    expect(httpsRequest).toHaveBeenCalledTimes(1)
    expect(String(httpsRequest.mock.calls[0]![0].path)).not.toContain('169.254')
  })

  it('denies an oversized response declared by content-length', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS, maxResponseBytes: 10 })

    const request = await waitForSocket(httpsRequest)
    const response = mockResponse({ headers: { 'content-length': '99999999' } })
    request.emit('response', response)
    expect(response.destroy).toHaveBeenCalled()

    await expect(result).resolves.toEqual({ ok: false, denial: 'response_too_large' })
  })

  it('denies a body that exceeds the cap while streaming', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS, maxResponseBytes: 4 })

    const request = await waitForSocket(httpsRequest)
    const response = mockResponse()
    request.emit('response', response)
    response.emit('data', Buffer.from('{"a":'))
    response.emit('data', Buffer.from('1234567890"}'))
    response.emit('end')

    await expect(result).resolves.toEqual({ ok: false, denial: 'response_too_large' })
  })

  it('denies a non-JSON content type so the endpoint is not an HTML exfiltration channel', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })

    const request = await waitForSocket(httpsRequest)
    respond(request, { contentType: 'text/html', body: '<html>metadata</html>' })

    await expect(result).resolves.toEqual({ ok: false, denial: 'unexpected_content_type' })
  })

  it('denies an unparsable body', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })

    const request = await waitForSocket(httpsRequest)
    respond(request, { body: 'not json' })

    await expect(result).resolves.toEqual({ ok: false, denial: 'invalid_response' })
  })
})

describe('internal fetch — allowed upstream', () => {
  beforeEach(() => {
    httpsRequest.mockReset()
    httpRequest.mockReset()
    dnsLookup.mockReset()
    dnsLookup.mockResolvedValue(PUBLIC_DNS)
  })

  it('accepts the allowlisted upstream and pins the connection to the validated address', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({
      route: 'eventsDiscover',
      params: { limit: 8, sortBy: 'relevance', location: 'Austin, TX' },
      ...REMOTE_OPTS,
    })

    const request = await waitForSocket(httpsRequest)
    respond(request, { body: '{"events":[]}' })

    await expect(result).resolves.toEqual({ ok: true, data: { events: [] } })

    const options = httpsRequest.mock.calls[0]![0]
    expect(options.host).toBe('upstream.tourify.app')
    expect(options.servername).toBe('upstream.tourify.app')
    expect(options.headers.host).toBe('upstream.tourify.app:443')
    expect(options.path).toBe('/api/events/discover?limit=8&sortBy=relevance&location=Austin%2C+TX')

    // Resolve-then-pin: the lookup override hands back only the validated IP.
    const pinned: unknown[] = []
    options.lookup('upstream.tourify.app', {}, (_err: unknown, address: unknown) => pinned.push(address))
    expect(pinned).toEqual(['93.184.216.34'])
  })

  it('supports autoSelectFamily by returning a pinned record list', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })
    await waitForSocket(httpsRequest)

    const options = httpsRequest.mock.calls[0]![0]
    const all: unknown[] = []
    options.lookup('upstream.tourify.app', { all: true }, (_err: unknown, addresses: unknown) => all.push(addresses))
    expect(all).toEqual([[{ address: '93.184.216.34', family: 4 }]])

    respond(httpsRequest.mock.results[0]!.value as ReturnType<typeof mockRequest>, { body: '{"data":[]}' })
    await expect(result).resolves.toEqual({ ok: true, data: { data: [] } })
  })

  it('returns the internal route payload over the opted-in local dev origin', async () => {
    dnsLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }])
    httpRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({
      route: 'feedPosts',
      params: { type: 'all', limit: 36, offset: 0 },
      env: { INTERNAL_API_ORIGIN: 'http://127.0.0.1:3000' },
      nodeEnv: 'development',
      allowLocalUpstream: true,
    })

    const request = await waitForSocket(httpRequest)
    respond(request, { body: '{"data":[]}' })

    await expect(result).resolves.toEqual({ ok: true, data: { data: [] } })
    expect(httpRequest).toHaveBeenCalledTimes(1)
  })

  it('denies a non-2xx upstream response', async () => {
    httpsRequest.mockReturnValue(mockRequest())
    const result = fetchInternalJson({ route: 'feedPosts', ...REMOTE_OPTS })

    const request = await waitForSocket(httpsRequest)
    respond(request, { status: 401, body: '{"error":"nope"}' })

    await expect(result).resolves.toEqual({ ok: false, denial: 'network_error' })
  })
})

// ---------------------------------------------------------------------------
// Regression guard on the reported sink itself
// ---------------------------------------------------------------------------

describe('discover route — the reported js/request-forgery sink is gone', () => {
  const source = readFileSync(join(process.cwd(), 'app/api/discover/route.ts'), 'utf8')

  it('never derives an outbound base from the inbound request', () => {
    expect(source).not.toMatch(/\borigin\b\s*[,}]?\s*$/)
    expect(source).not.toContain('nextUrl.origin')
    expect(source).not.toMatch(/\$\{\s*origin\s*\}/)
    expect(source).not.toMatch(/const\s*\{\s*searchParams\s*,\s*origin\s*\}/)
  })

  it('makes no direct fetch call in the aggregation fan-out', () => {
    expect(source).not.toMatch(/(?<![\w.])fetch\(/)
    expect(source).toContain('fetchInternalJson')
  })
})
