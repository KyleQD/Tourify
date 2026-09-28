/**
 * Outbound URL guard (server-only, pure — no I/O).
 *
 * Security decision DISC-SSRF-001: `/api/discover` aggregates several internal
 * API routes over HTTP. The previous implementation derived the outbound base
 * from the inbound request (`new URL(request.url).origin`), which is a
 * user-controlled value at the HTTP trust boundary. CodeQL alert #16
 * (`js/request-forgery`, CWE-918) flagged that sink.
 *
 * This module is the allowlist. The caller may only reach an origin that an
 * operator declared through server environment configuration, and only over
 * `http:`/`https:`. Nothing here reads a request, a header, or a query string.
 *
 * Design rules (fail closed):
 *  - The allowlist is exact-origin: `scheme://host[:port]` must match an entry
 *    character-for-character after URL normalization. There is no suffix or
 *    substring match, so `good.example.com.evil.test` cannot pass.
 *  - There is no fallback origin. An unconfigured deployment performs no
 *    outbound request at all.
 *  - `request.url` / `Host` / `X-Forwarded-Host` are never consulted. Host,
 *    port, and scheme have exactly one source: server env.
 *  - IP literals are normalized and range-checked before any DNS work, so
 *    decimal (`2130706433`), octal (`0177.0.0.1`), hex (`0x7f.0.0.1`) and
 *    short (`127.1`) IPv4 forms and IPv4-mapped/translated/NAT64/6to4 IPv6
 *    forms all resolve to their true numeric address before the check.
 *  - Loopback/private origins are honored only for local development with an
 *    explicit opt-in, and never when `NODE_ENV === 'production'`.
 */

export type OutboundDenialReason =
  | 'invalid_url'
  | 'scheme_not_allowed'
  | 'origin_not_allowlisted'
  | 'local_origin_not_permitted'
  | 'credentials_not_allowed'
  | 'private_address'
  | 'path_not_allowlisted'

export interface OutboundAllowDecision {
  ok: boolean
  reason?: OutboundDenialReason
  /** Operator-declared origin that authorized the request, when ok. */
  origin?: AllowedOrigin
  /** Normalized URL that was validated, when ok. */
  url?: URL
}

export type OutboundOriginScope = 'remote' | 'local'

export interface AllowedOrigin {
  /** Normalized `scheme://host[:port]` (default ports omitted). */
  origin: string
  scheme: 'http:' | 'https:'
  /** Lowercased hostname, IPv6 literals wrapped in brackets. */
  hostname: string
  /** Effective port as a string. */
  port: string
  /** `hostname:port` with brackets for IPv6 — the HTTP `Host` header value. */
  hostHeader: string
  /** Which server env var declared this entry. */
  source: string
  /**
   * `local` = the declared host is a loopback/private literal or a local-only
   * name. Requires an explicit non-production opt-in before use.
   */
  scope: OutboundOriginScope
  /** True when the hostname is an IP literal (already range-checked at parse). */
  isIpLiteral: boolean
}

export interface OutboundGuardOptions {
  /** Defaults to `process.env.NODE_ENV`. */
  nodeEnv?: string
  /**
   * Opt-in required to use a `local`-scope allowlist entry. Read from
   * `DISCOVER_ALLOW_LOCAL_UPSTREAM === 'true'`.
   */
  allowLocalUpstream?: boolean
  /** Path prefixes the caller may request on an allowlisted origin. */
  allowedPathPrefixes?: readonly string[]
}

// ---------------------------------------------------------------------------
// IP range policy
// ---------------------------------------------------------------------------

interface Cidr4 {
  base: number
  bits: number
}

/**
 * Every range an outbound request must never reach: loopback, RFC1918,
 * CGNAT, link-local (cloud metadata at 169.254.169.254), benchmarking,
 * documentation, multicast, reserved, and "this host".
 */
export const BLOCKED_IPV4_CIDRS: readonly Cidr4[] = [
  { base: 0x00000000, bits: 8 }, // 0.0.0.0/8   "this" network
  { base: 0x0a000000, bits: 8 }, // 10.0.0.0/8  private
  { base: 0x64400000, bits: 10 }, // 100.64.0.0/10 CGNAT
  { base: 0x7f000000, bits: 8 }, // 127.0.0.0/8 loopback
  { base: 0xa9fe0000, bits: 16 }, // 169.254.0.0/16 link-local / metadata
  { base: 0xac100000, bits: 12 }, // 172.16.0.0/12 private
  { base: 0xc0000000, bits: 24 }, // 192.0.0.0/24 IETF protocol assignments
  { base: 0xc0000200, bits: 24 }, // 192.0.2.0/24 TEST-NET-1
  { base: 0xc0586300, bits: 24 }, // 192.88.99.0/24 6to4 relay anycast
  { base: 0xc0a80000, bits: 16 }, // 192.168.0.0/16 private
  { base: 0xc6120000, bits: 15 }, // 198.18.0.0/15 benchmarking
  { base: 0xc6336400, bits: 24 }, // 198.51.100.0/24 TEST-NET-2
  { base: 0xcb007100, bits: 24 }, // 203.0.113.0/24 TEST-NET-3
  { base: 0xe0000000, bits: 4 }, // 224.0.0.0/4 multicast
  { base: 0xf0000000, bits: 4 }, // 240.0.0.0/4 reserved + broadcast
]

/**
 * Hostname suffixes that only ever resolve inside a private network. DNS
 * resolution is checked separately; this closes the name before the lookup.
 */
export const BLOCKED_HOST_SUFFIXES: readonly string[] = [
  'localhost',
  'localdomain',
  'local',
  'internal',
  'intranet',
  'corp',
  'lan',
  'home.arpa',
  'onion',
  'test',
  'example',
  'invalid',
]

/** Exact cloud-metadata hostnames (resolved loopback on the metadata plane). */
export const BLOCKED_HOSTNAMES: readonly string[] = [
  'metadata',
  'metadata.google.internal',
  'instance-data',
  '169.254.169.254',
]

function ipv4InCidr(value: number, cidr: Cidr4): boolean {
  if (cidr.bits === 0) return true
  const mask = cidr.bits === 32 ? 0xffffffff : (0xffffffff << (32 - cidr.bits)) >>> 0
  return ((value & mask) >>> 0) === ((cidr.base & mask) >>> 0)
}

/** True when a 32-bit IPv4 address is in a range we must never reach. */
export function isBlockedIpv4Number(value: number): boolean {
  return BLOCKED_IPV4_CIDRS.some((cidr) => ipv4InCidr(value >>> 0, cidr))
}

// ---------------------------------------------------------------------------
// IP literal parsing (encoding-normalizing)
// ---------------------------------------------------------------------------

// Part patterns are deliberately length-generous; the numeric range checks in
// `parseIpv4` are what actually reject an out-of-range encoding, so a padded
// octal/decimal form can never be smuggled past as a "hostname".
function parseIpv4Part(part: string): number | null {
  if (/^0[xX][0-9a-fA-F]{1,14}$/.test(part)) return parseInt(part.slice(2), 16)
  if (/^0[0-7]{1,15}$/.test(part)) return parseInt(part, 8)
  if (/^(0|[1-9][0-9]{0,15})$/.test(part)) return parseInt(part, 10)
  return null
}

/**
 * Parse any IPv4 textual form a resolver may accept, including the historical
 * inet_aton encodings: `127.1`, `0177.0.0.1`, `0x7f000001`, `2130706433`.
 * Returns the numeric 32-bit address, or null when the string is not IPv4.
 */
export function parseIpv4(input: string): number | null {
  const parts = input.split('.')
  if (parts.length < 1 || parts.length > 4) return null
  const values: number[] = []
  for (const part of parts) {
    const value = parseIpv4Part(part)
    if (value === null) return null
    values.push(value)
  }
  const last = values[values.length - 1]!
  const lastMax = parts.length === 1 ? 0xffffffff : [0, 0xffffff, 0xffff, 0xff][parts.length - 1]!
  const lastShift = [0, 24, 16, 8, 0][parts.length - 1]!
  if (last > lastMax) return null
  for (let index = 0; index < values.length - 1; index += 1) {
    if (values[index]! > 0xff) return null
  }
  const prefix = values.slice(0, -1).reduce((acc, value) => ((acc << 8) | value) >>> 0, 0)
  return (((prefix << lastShift) >>> 0) | last) >>> 0
}

/** Parse an IPv6 literal (with `::` compression, brackets, zone, and trailing dotted-quad) into 8 groups. */
export function parseIpv6(input: string): number[] | null {
  let text = input.trim()
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1)
  const zone = text.indexOf('%')
  if (zone !== -1) text = text.slice(0, zone)
  if (!text.includes(':')) return null
  // A dotted-quad is only legal as the final component of the literal.
  if (text.includes('.') && !/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(text)) return null

  const readGroups = (chunk: string): number[] | null => {
    if (chunk === '') return []
    const out: number[] = []
    for (const part of chunk.split(':')) {
      if (part === '') return null
      if (part.includes('.')) {
        const v4 = parseIpv4(part)
        if (v4 === null) return null
        out.push((v4 >>> 16) & 0xffff, v4 & 0xffff)
        continue
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null
      out.push(parseInt(part, 16))
    }
    return out
  }

  const compression = text.indexOf('::')
  if (compression === -1) {
    const groups = readGroups(text)
    if (!groups || groups.length !== 8) return null
    return groups
  }
  if (text.indexOf('::', compression + 1) !== -1) return null

  const head = readGroups(text.slice(0, compression))
  const tail = readGroups(text.slice(compression + 2))
  if (!head || !tail) return null
  const fill = 8 - head.length - tail.length
  if (fill < 1) return null
  return [...head, ...new Array<number>(fill).fill(0), ...tail]
}

/** True when the address is in a range we must never reach (IPv4-mapped, NAT64 and 6to4 payloads are unwrapped first). */
export function isBlockedIpv6Groups(groups: number[]): boolean {
  const zeroRange = (start: number, end: number) =>
    groups.slice(start, end).every((group) => group === 0)
  const embeddedV4 = () => (((groups[6]! << 16) | groups[7]!) >>> 0)

  if (zeroRange(0, 7) && (groups[7] === 0 || groups[7] === 1)) return true // :: and ::1
  if (zeroRange(0, 5) && groups[5] === 0xffff) return isBlockedIpv4Number(embeddedV4()) // ::ffff:0:0/96
  if (zeroRange(0, 4) && groups[4] === 0xffff && groups[5] === 0) return isBlockedIpv4Number(embeddedV4()) // ::ffff:0:0:0/96
  // 64:ff9b::/96 NAT64 — the last 32 bits carry an IPv4 destination.
  if (groups[0] === 0x0064 && groups[1] === 0xff9b && zeroRange(2, 6)) {
    return isBlockedIpv4Number(embeddedV4())
  }
  if (groups[0] === 0x0100 && zeroRange(1, 5)) return true // 100::/64 discard-only
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true // 2001:db8::/32 documentation
  if (groups[0] === 0x2002) return isBlockedIpv4Number((((groups[1]! << 16) | groups[2]!) >>> 0)) // 2002::/16 6to4
  if ((groups[0]! & 0xfe00) === 0xfc00) return true // fc00::/7 unique local
  if ((groups[0]! & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((groups[0]! & 0xffc0) === 0xfec0) return true // fec0::/10 site-local (deprecated)
  if ((groups[0]! & 0xff00) === 0xff00) return true // ff00::/8 multicast
  return false
}

export type HostClassification =
  | { kind: 'ipv4'; value: string; address: number; blocked: boolean }
  | { kind: 'ipv6'; value: string; groups: number[]; blocked: boolean }
  | { kind: 'hostname'; value: string; blocked: boolean }

/** Normalize a host string and classify it as IPv4 literal, IPv6 literal, or DNS name. */
export function classifyHost(rawHost: string): HostClassification {
  const host = rawHost.trim().toLowerCase().replace(/\.$/, '')

  if (host.startsWith('[') && host.endsWith(']')) {
    const groups = parseIpv6(host)
    if (groups) {
      return { kind: 'ipv6', value: host, groups, blocked: isBlockedIpv6Groups(groups) }
    }
    return { kind: 'hostname', value: host, blocked: true }
  }

  if (host.includes(':')) {
    const groups = parseIpv6(host)
    if (groups) {
      return { kind: 'ipv6', value: host, groups, blocked: isBlockedIpv6Groups(groups) }
    }
    return { kind: 'hostname', value: host, blocked: true }
  }

  // Any non-alphanumeric-dot shape is not a resolvable name we trust.
  if (!/^[a-z0-9.-]+$/.test(host)) return { kind: 'hostname', value: host, blocked: true }

  // An all-numeric / hex-dotted token is an IP literal, never a DNS name.
  if (/^(?:0[xX])?[0-9a-fA-F.]+$/.test(host) && /[0-9]/.test(host)) {
    const address = parseIpv4(host)
    if (address !== null) {
      return { kind: 'ipv4', value: host, address, blocked: isBlockedIpv4Number(address) }
    }
  }

  return { kind: 'hostname', value: host, blocked: isBlockedHostname(host) }
}

/** True for names that only resolve inside a private network. */
export function isBlockedHostname(host: string): boolean {
  const name = host.trim().toLowerCase().replace(/\.$/, '')
  if (name === '') return true
  if (BLOCKED_HOSTNAMES.includes(name)) return true
  return BLOCKED_HOST_SUFFIXES.some((suffix) => name === suffix || name.endsWith(`.${suffix}`))
}

/** Convenience wrapper for address strings returned by `dns.lookup`. */
export function isBlockedIpAddress(address: string): boolean {
  return classifyHost(address).blocked
}

// ---------------------------------------------------------------------------
// Allowlist construction
// ---------------------------------------------------------------------------

export const OUTBOUND_ENV_SOURCES = [
  'INTERNAL_API_ORIGIN',
  'NEXT_PUBLIC_APP_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_URL',
] as const

const DEFAULT_PORTS: Record<string, string> = { 'http:': '80', 'https:': '443' }

/** A bare token (no `scheme://`) is only accepted when it is a plausible host. */
function looksLikeBareHost(token: string): boolean {
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(token)) return false
  return token.includes('.')
}

function normalizeOriginEntry(raw: string, source: string): AllowedOrigin | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
  if (!hasScheme && !looksLikeBareHost(trimmed)) return null
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return null
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (parsed.username || parsed.password) return null
  if (parsed.pathname !== '/' && parsed.pathname !== '') return null
  if (parsed.search || parsed.hash) return null

  const port = parsed.port || DEFAULT_PORTS[parsed.protocol]!
  const hostHeader = parsed.hostname.includes(':') ? `[${parsed.hostname}]:${port}` : `${parsed.hostname}:${port}`
  const classification = classifyHost(parsed.hostname)
  // A declared host that is itself a blocked literal (or a local-only name)
  // is `local`: it needs an explicit non-production opt-in before use.
  const scope: OutboundOriginScope = classification.blocked ? 'local' : 'remote'

  return {
    origin: parsed.origin,
    scheme: parsed.protocol as 'http:' | 'https:',
    hostname: parsed.hostname.toLowerCase(),
    port,
    hostHeader,
    source,
    scope,
    isIpLiteral: classification.kind !== 'hostname',
  }
}

/**
 * Build the exact-origin allowlist from server environment configuration.
 * An unconfigured environment yields an empty allowlist, which denies every
 * outbound request. There is deliberately no localhost fallback.
 */
export function parseAllowedOrigins(env: Record<string, string | undefined> = process.env): AllowedOrigin[] {
  const entries = new Map<string, AllowedOrigin>()
  for (const source of OUTBOUND_ENV_SOURCES) {
    const raw = env[source]
    if (!raw) continue
    const tokens = raw.split(/[\s,]+/).filter(Boolean)
    if (tokens.length === 0) continue

    // A source that contains any unusable entry contributes nothing at all, so
    // a typo cannot silently widen the allowlist with a partially-parsed value.
    const normalized = tokens.map((token) => normalizeOriginEntry(token, source))
    if (normalized.some((entry) => entry === null)) continue
    for (const entry of normalized) {
      const value = entry as AllowedOrigin
      if (!entries.has(value.origin)) entries.set(value.origin, value)
    }
  }
  return [...entries.values()]
}

/** Local origins are honored only outside production and only with an explicit opt-in. */
export function isOriginUsable(origin: AllowedOrigin, options: OutboundGuardOptions = {}): boolean {
  if (origin.scope === 'remote') return true
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV
  if (nodeEnv === 'production') return false
  return options.allowLocalUpstream === true
}

function pathAllowed(pathname: string, prefixes: readonly string[]): boolean {
  if (prefixes.length === 0) return false
  const normalized = pathname.replace(/\/{2,}/g, '/')
  if (normalized.includes('..') || normalized.includes('\\')) return false
  return prefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`) || normalized.startsWith(`${prefix}?`))
}

/**
 * Final gate before any socket is opened. Verifies, in order: parseable URL,
 * no embedded credentials, `http:`/`https:`, exact match against an
 * operator-declared origin, local-origin policy, then literal-address policy.
 */
export function assertOutboundUrlAllowed(
  rawUrl: string,
  allowlist: readonly AllowedOrigin[],
  options: OutboundGuardOptions = {},
): OutboundAllowDecision {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'invalid_url' }
  }

  if (url.username || url.password) return { ok: false, reason: 'credentials_not_allowed' }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'scheme_not_allowed' }
  }

  // `URL.origin` already folds default ports, so a spoofed port cannot match.
  const matched = allowlist.find((entry) => entry.origin === url.origin)
  if (!matched) return { ok: false, reason: 'origin_not_allowlisted' }
  if (!isOriginUsable(matched, options)) return { ok: false, reason: 'local_origin_not_permitted' }

  if (options.allowedPathPrefixes && !pathAllowed(url.pathname, options.allowedPathPrefixes)) {
    return { ok: false, reason: 'path_not_allowlisted' }
  }

  const classification = classifyHost(url.hostname)
  if (classification.blocked && matched.scope === 'remote') {
    return { ok: false, reason: 'private_address' }
  }

  return { ok: true, origin: matched, url }
}
