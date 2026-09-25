/**
 * Guarded internal JSON fetch for the server-side fan-outs that call the app's
 * own API routes: `/api/discover` (DISC-SSRF-001), `/api/hub` (DISC-SSRF-002),
 * the news external-candidate fan-out (DISC-SSRF-003), and the opportunities
 * RSS ingest (DISC-SSRF-004). All four previously derived the outbound base
 * origin from the inbound request, and CodeQL flagged only the first.
 *
 * Every hop of this path is controlled:
 *
 *  1. The caller picks an upstream by **key**, not by URL. The pathname comes
 *     from the frozen `INTERNAL_UPSTREAM_ROUTES` map, and the only
 *     caller-influenced values are query parameters passed through
 *     `URLSearchParams`. No user value can become a host, port, scheme, or
 *     path segment.
 *  2. The base origin is operator configuration only (`INTERNAL_API_ORIGIN`
 *     and friends), never `request.url` / `request.nextUrl.origin` / `Host` /
 *     `X-Forwarded-Host`.
 *  3. `assertOutboundUrlAllowed` re-validates the fully assembled URL against
 *     the exact-origin allowlist before a socket is opened.
 *  4. **Resolve-then-pin.** All A/AAAA records are resolved and every one of
 *     them is range-checked; the request then connects to the validated
 *     address with a `lookup` override, so a second DNS answer (rebinding)
 *     cannot be used. `host` and SNI stay on the allowlisted hostname.
 *  5. **Redirects are structurally impossible.** This uses `node:https` /
 *     `node:http`, which never follows a redirect, and any 3xx status is a
 *     hard denial. An allowlist on the first hop is therefore not bypassable
 *     via an open redirect on the upstream.
 *  6. Bounded cost: a wall-clock timeout, a response byte cap, and a JSON
 *     content-type requirement, so the endpoint cannot be used as a traffic
 *     amplifier or as an HTML-exfiltration channel.
 *
 * Every rejection path returns without opening a socket.
 */

import 'server-only'

import http from 'node:http'
import https from 'node:https'
import { lookup as dnsLookup } from 'node:dns/promises'
import type { LookupAddress } from 'node:dns'

import {
  assertOutboundUrlAllowed,
  isBlockedIpAddress,
  parseAllowedOrigins,
  type AllowedOrigin,
  type OutboundDenialReason,
} from './outbound-guard'

/** Frozen map of the only internal routes the discover fan-out may call. */
export const DISCOVER_UPSTREAM_ROUTES = {
  feedPosts: {
    pathname: '/api/feed/posts',
    params: ['type', 'limit', 'offset'],
  },
  eventsDiscover: {
    pathname: '/api/events/discover',
    params: ['limit', 'sortBy', 'location'],
  },
  feedMusic: {
    pathname: '/api/feed/music',
    params: ['sortBy', 'limit'],
  },
  socialSuggested: {
    pathname: '/api/social/suggested',
    params: ['limit'],
  },
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
} as const satisfies Record<string, { pathname: string; params: readonly string[] }>

export type DiscoverUpstreamRoute = keyof typeof DISCOVER_UPSTREAM_ROUTES

/**
 * Security decision DISC-SSRF-002. `/api/hub` aggregated three internal routes
 * from `request.nextUrl.origin`. `nextUrl.origin` reflects the inbound `Host` /
 * `X-Forwarded-Host` header, so a caller chose the destination of three
 * server-side requests. CodeQL did not flag it: `js/request-forgery` treats
 * `request.url` as a remote-flow source but not `request.nextUrl.origin`. These
 * three targets are all internal, so the same key-based selection applies.
 */
export const HUB_UPSTREAM_ROUTES = {
  hubDiscover: {
    pathname: '/api/discover',
    params: ['limit', 'intent', 'location'],
  },
  hubNewsFeed: {
    pathname: '/api/news/feed',
    params: ['facet', 'limit', 'query', 'sort'],
  },
  hubArtistJobs: {
    pathname: '/api/artist-jobs',
    params: ['per_page', 'page', 'query'],
  },
} as const satisfies Record<string, { pathname: string; params: readonly string[] }>

/**
 * The news feed's external-candidate fan-out. It used to build
 * `new URL('/api/feed/rss-news', params.requestOrigin)`, where `requestOrigin`
 * was `request.nextUrl.origin` at the caller — the same defect class as
 * DISC-SSRF-001 and DISC-SSRF-002, and equally unflagged.
 */
export const NEWS_UPSTREAM_ROUTES = {
  newsRssFeed: {
    pathname: '/api/feed/rss-news',
    params: ['limit', 'category'],
  },
} as const satisfies Record<string, { pathname: string; params: readonly string[] }>

/**
 * Security decision DISC-SSRF-004. `ingestOpportunitiesFromRss` used to build
 * `new URL('/api/feed/rss-news', params.origin)` and hand it to the global
 * `fetch` once per each of six hardcoded categories. `params.origin` was
 * `request.nextUrl.origin` at BOTH callers, so a caller who controlled `Host` /
 * `X-Forwarded-Host` chose the destination of six concurrent server-side
 * requests, and the global `fetch` followed any redirect out of the fan-out.
 * Unflagged, for the same reason as DISC-SSRF-002/003: `js/request-forgery`
 * models `request.url` as a remote-flow source but not `request.nextUrl.origin`.
 *
 * The destination is the same frozen pathname the news fan-out already uses, so
 * this adds a *key*, never a second allowlist, transport or redirect policy.
 * The key is per-call-site so a denial log names the surface that was refused.
 */
export const OPPORTUNITIES_UPSTREAM_ROUTES = {
  opportunitiesRssNews: {
    pathname: '/api/feed/rss-news',
    params: ['limit', 'category'],
  },
} as const satisfies Record<string, { pathname: string; params: readonly string[] }>

/**
 * Every route the guarded transport may reach, across all four fan-outs. The
 * pathname is still a compile-time constant chosen by key; the union only
 * widens the redundant path-prefix cross-check, never a caller-reachable input.
 */
export const INTERNAL_UPSTREAM_ROUTES = {
  ...DISCOVER_UPSTREAM_ROUTES,
  ...HUB_UPSTREAM_ROUTES,
  ...NEWS_UPSTREAM_ROUTES,
  ...OPPORTUNITIES_UPSTREAM_ROUTES,
} as const satisfies Record<string, { pathname: string; params: readonly string[] }>

export type InternalUpstreamRoute = keyof typeof INTERNAL_UPSTREAM_ROUTES

export const ALLOWED_PATH_PREFIXES: readonly string[] = [
  ...new Set(Object.values(INTERNAL_UPSTREAM_ROUTES).map((route) => route.pathname)),
]

const MAX_PARAM_LENGTH = 200
export const OUTBOUND_TIMEOUT_MS = 5_000
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024

export type InternalFetchDenial =
  | OutboundDenialReason
  | 'no_allowlisted_origin'
  | 'dns_resolution_failed'
  | 'dns_blocked_address'
  | 'redirect_not_allowed'
  | 'timeout'
  | 'response_too_large'
  | 'unexpected_content_type'
  | 'invalid_response'
  | 'network_error'

export type InternalFetchResult =
  | { ok: true; data: unknown }
  | { ok: false; denial: InternalFetchDenial }

export interface InternalFetchOptions {
  route: InternalUpstreamRoute
  params?: Record<string, string | number | boolean | null | undefined>
  headers?: Record<string, string>
  timeoutMs?: number
  maxResponseBytes?: number
  /** Injected for tests; defaults to `process.env`. */
  env?: Record<string, string | undefined>
  /** Reuse a per-request allowlist instead of re-parsing the environment. */
  allowlist?: readonly AllowedOrigin[]
  nodeEnv?: string
  allowLocalUpstream?: boolean
}

interface ResolvedTarget {
  url: URL
  origin: AllowedOrigin
  pinned: LookupAddress
}

/**
 * Build the absolute upstream URL. The pathname is a compile-time constant;
 * parameters are length-bounded and encoded by `URLSearchParams`, so a value
 * can never escape the query string.
 */
export function buildUpstreamUrl(
  origin: AllowedOrigin,
  route: InternalUpstreamRoute,
  params: Record<string, string | number | boolean | null | undefined> = {}
): string {
  const definition = INTERNAL_UPSTREAM_ROUTES[route]
  const url = new URL(definition.pathname, origin.origin)
  for (const [key, rawValue] of Object.entries(params)) {
    if (!(definition.params as readonly string[]).includes(key)) continue
    if (rawValue === null || rawValue === undefined || rawValue === '') continue
    url.searchParams.set(key, String(rawValue).slice(0, MAX_PARAM_LENGTH))
  }
  return url.toString()
}

function guardOptions(options: InternalFetchOptions) {
  const env = options.env ?? process.env
  return {
    // Explicit option wins, then an injected env, then the process env.
    nodeEnv: options.nodeEnv ?? env.NODE_ENV,
    allowLocalUpstream: options.allowLocalUpstream ?? env.DISCOVER_ALLOW_LOCAL_UPSTREAM === 'true',
    allowedPathPrefixes: ALLOWED_PATH_PREFIXES,
  }
}

/** Resolve every record, reject the destination if any record is internal, then pin the first safe one. */
async function resolveAndPin(
  url: URL,
  origin: AllowedOrigin,
  options: InternalFetchOptions
): Promise<ResolvedTarget | { denial: InternalFetchDenial }> {
  let records: LookupAddress[]
  try {
    records = await dnsLookup(url.hostname, { all: true, verbatim: true })
  } catch {
    return { denial: 'dns_resolution_failed' }
  }
  if (!Array.isArray(records) || records.length === 0) return { denial: 'dns_resolution_failed' }

  // Every answer must be safe. A rebinding response that mixes one public and
  // one internal record is rejected outright rather than pinned opportunistically.
  const localScope = origin.scope === 'local'
  if (!localScope && records.some((record) => isBlockedIpAddress(record.address))) {
    return { denial: 'dns_blocked_address' }
  }
  const safe = localScope ? records : records.filter((record) => !isBlockedIpAddress(record.address))
  if (safe.length === 0) return { denial: 'dns_blocked_address' }

  return { url, origin, pinned: safe[0]! }
}

interface RawResponse {
  statusCode: number
  contentType: string
  body: string
}

/**
 * One request/response exchange with no redirect handling, a hard timeout, and
 * a byte cap. `node:https`/`node:http` are used directly precisely because they
 * do not follow redirects.
 */
function requestOnce(
  target: ResolvedTarget,
  headers: Record<string, string>,
  timeoutMs: number,
  maxBytes: number
): Promise<{ ok: true; response: RawResponse } | { denial: InternalFetchDenial }> {
  return new Promise((resolve) => {
    const { url, pinned } = target
    const secure = url.protocol === 'https:'
    const transport = secure ? https : http
    const outgoingHeaders: Record<string, string> = {
      ...headers,
      host: target.origin.hostHeader,
      accept: 'application/json',
    }

    let settled = false
    const finish = (result: { ok: true; response: RawResponse } | { denial: InternalFetchDenial }) => {
      if (settled) return
      settled = true
      clearTimeout(wallClock)
      resolve(result)
    }

    // Pins the connection to the validated address regardless of any second
    // DNS answer, while `host`/SNI stay on the allowlisted hostname.
    const pinnedLookup = (
      _hostname: string,
      lookupOptions: { all?: boolean },
      callback: (error: NodeJS.ErrnoException | null, address: unknown, family?: number) => void
    ) => {
      if (lookupOptions?.all) {
        callback(null, [{ address: pinned.address, family: pinned.family }])
        return
      }
      callback(null, pinned.address, pinned.family)
    }

    const request = transport.request({
      protocol: url.protocol,
      host: url.hostname,
      hostname: url.hostname,
      port: url.port || (secure ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: outgoingHeaders,
      ...(secure ? { servername: url.hostname } : {}),
      family: pinned.family,
      lookup: pinnedLookup as never,
      agent: false,
    })

    const wallClock = setTimeout(() => {
      request.destroy()
      finish({ denial: 'timeout' })
    }, timeoutMs)

    request.setTimeout(timeoutMs, () => {
      request.destroy()
      finish({ denial: 'timeout' })
    })

    request.on('error', () => {
      request.destroy()
      finish({ denial: 'network_error' })
    })

    request.on('response', (response) => {
      const status = response.statusCode ?? 0
      // A 3xx is a denial, not a hop: the redirect target is never requested.
      if (status >= 300 && status < 400) {
        response.destroy()
        finish({ denial: 'redirect_not_allowed' })
        return
      }

      const declaredLength = Number(response.headers['content-length'] ?? Number.NaN)
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        response.destroy()
        finish({ denial: 'response_too_large' })
        return
      }

      const chunks: Buffer[] = []
      let size = 0
      let overflow = false
      response.on('data', (chunk: Buffer) => {
        if (overflow) return
        size += chunk.length
        if (size > maxBytes) {
          overflow = true
          response.destroy()
          return
        }
        chunks.push(Buffer.from(chunk))
      })
      response.on('end', () => {
        if (overflow) {
          finish({ denial: 'response_too_large' })
          return
        }
        finish({
          ok: true,
          response: {
            statusCode: status,
            contentType: String(response.headers['content-type'] ?? ''),
            body: Buffer.concat(chunks).toString('utf8'),
          },
        })
      })
      response.on('error', () => {
        response.destroy()
        finish({ denial: overflow ? 'response_too_large' : 'network_error' })
      })
    })

    request.end()
  })
}

/**
 * Fetch one allowlisted internal route. Returns `{ ok: false, denial }` for
 * every rejection, and never opens a socket for one.
 */
export async function fetchInternalJson(options: InternalFetchOptions): Promise<InternalFetchResult> {
  const allowlist = options.allowlist ?? parseAllowedOrigins(options.env ?? process.env)
  if (allowlist.length === 0) return { ok: false, denial: 'no_allowlisted_origin' }

  const settings = guardOptions(options)
  const timeoutMs = options.timeoutMs ?? OUTBOUND_TIMEOUT_MS
  const maxBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES

  let target: { origin: AllowedOrigin; url: URL } | null = null
  let denial: InternalFetchDenial = 'origin_not_allowlisted'
  for (const origin of allowlist) {
    const candidate = buildUpstreamUrl(origin, options.route, options.params ?? {})
    const decision = assertOutboundUrlAllowed(candidate, allowlist, settings)
    if (decision.ok && decision.url) {
      target = { origin, url: decision.url }
      break
    }
    denial = decision.reason ?? 'origin_not_allowlisted'
  }

  if (!target) return { ok: false, denial }

  const resolved = await resolveAndPin(target.url, target.origin, options)
  if ('denial' in resolved) return { ok: false, denial: resolved.denial }

  const outcome = await requestOnce(resolved, options.headers ?? {}, timeoutMs, maxBytes)
  if ('denial' in outcome) return { ok: false, denial: outcome.denial }

  const { statusCode, contentType, body } = outcome.response
  if (statusCode < 200 || statusCode >= 300) return { ok: false, denial: 'network_error' }
  if (contentType && !/^application\/(?:[\w.+-]+\+)?json\b/i.test(contentType.trim())) {
    return { ok: false, denial: 'unexpected_content_type' }
  }

  try {
    return { ok: true, data: JSON.parse(body) }
  } catch {
    return { ok: false, denial: 'invalid_response' }
  }
}
