/**
 * External Listing Import — SSRF-safe metadata fetch
 *
 * Fetches Open Graph / basic HTML metadata from a seller-supplied URL so that
 * external listing cards can show a title, image, and description. The
 * canonical_url is NEVER returned to the client — it is stored server-side
 * only and access goes through the /redirect endpoint.
 *
 * Security controls:
 *  - HTTPS-only (no http:// allowed)
 *  - Private / loopback / link-local IP ranges blocked after DNS resolution
 *  - Max 3 redirects followed; each redirect target is re-validated
 *  - Response body capped at 500 KB; timeout 8 s
 *  - Only text/html responses parsed; binary types rejected
 */

import "server-only"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExternalListingMetadata {
  /** Resolved canonical URL (HTTPS, passed DNS/IP safety check) */
  canonicalUrl: string
  /** Extracted domain (e.g. "shopify.com") */
  providerDomain: string
  /** Open Graph / page title */
  title: string | null
  /** Open Graph description or meta description */
  description: string | null
  /** Open Graph image URL (absolute). NOT proxied — stored in metadata_snapshot only. */
  imageUrl: string | null
  /** og:price:amount or fallback text from a price element */
  displayedPrice: string | null
  /** og:price:currency */
  displayedCurrency: string | null
  /** Guessed provider name from domain (e.g. "Shopify", "Etsy") */
  providerName: string | null
}

export interface ExternalImportResult {
  success: true
  metadata: ExternalListingMetadata
}

export interface ExternalImportError {
  success: false
  code:
    | 'invalid_url'
    | 'http_not_allowed'
    | 'private_ip_blocked'
    | 'timeout'
    | 'not_html'
    | 'too_large'
    | 'too_many_redirects'
    | 'fetch_failed'
    | 'parse_failed'
  message: string
}

export type ExternalImportResponse = ExternalImportResult | ExternalImportError

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_BODY_BYTES = 500 * 1024 // 500 KB
const FETCH_TIMEOUT_MS = 8_000
const MAX_REDIRECTS = 3

/** CIDR ranges that must never be reached */
const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^0\.0\.0\.0$/,
  /^169\.254\./,                // link-local
  /^[a-z0-9-]*\.local$/i,      // mDNS
  /^localhost$/i,
]

/** Known providers — matched by domain suffix */
const KNOWN_PROVIDERS: Array<{ suffix: string; name: string }> = [
  { suffix: 'shopify.com', name: 'Shopify' },
  { suffix: 'etsy.com', name: 'Etsy' },
  { suffix: 'bandcamp.com', name: 'Bandcamp' },
  { suffix: 'gumroad.com', name: 'Gumroad' },
  { suffix: 'bigcartel.com', name: 'Big Cartel' },
  { suffix: 'squarespace.com', name: 'Squarespace' },
  { suffix: 'wixsite.com', name: 'Wix' },
  { suffix: 'redbubble.com', name: 'Redbubble' },
  { suffix: 'printful.com', name: 'Printful' },
  { suffix: 'society6.com', name: 'Society6' },
  { suffix: 'ko-fi.com', name: 'Ko-fi' },
  { suffix: 'patreon.com', name: 'Patreon' },
]

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(hostname))
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function guessProviderName(domain: string): string | null {
  const match = KNOWN_PROVIDERS.find(p => domain === p.suffix || domain.endsWith('.' + p.suffix))
  return match?.name ?? null
}

function extractOgMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function extractNameMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return m?.[1]?.trim() ?? null
}

function parseMetadata(html: string, resolvedUrl: string): ExternalListingMetadata {
  const domain = extractDomain(resolvedUrl)
  const title =
    extractOgMeta(html, 'og:title') ??
    extractNameMeta(html, 'twitter:title') ??
    extractTitle(html)
  const description =
    extractOgMeta(html, 'og:description') ??
    extractNameMeta(html, 'twitter:description') ??
    extractNameMeta(html, 'description')
  const imageUrl =
    extractOgMeta(html, 'og:image') ??
    extractNameMeta(html, 'twitter:image') ??
    null
  const displayedPrice = extractOgMeta(html, 'og:price:amount') ?? null
  const displayedCurrency = extractOgMeta(html, 'og:price:currency') ?? null

  return {
    canonicalUrl: resolvedUrl,
    providerDomain: domain,
    providerName: guessProviderName(domain),
    title: title?.slice(0, 200) ?? null,
    description: description?.slice(0, 500) ?? null,
    imageUrl: imageUrl ?? null,
    displayedPrice: displayedPrice?.slice(0, 30) ?? null,
    displayedCurrency: displayedCurrency?.slice(0, 10) ?? null,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch Open Graph / HTML metadata from an external URL.
 * Enforces HTTPS-only, blocks private IPs, caps body size and timeout.
 * Returns the parsed metadata — the canonical URL is included only so the
 * caller can store it server-side (never send it to the browser directly).
 */
export async function fetchExternalListingMetadata(
  rawUrl: string
): Promise<ExternalImportResponse> {
  // 1. Parse + validate URL
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return { success: false, code: 'invalid_url', message: 'The URL is not valid.' }
  }

  if (parsed.protocol !== 'https:') {
    return { success: false, code: 'http_not_allowed', message: 'Only HTTPS URLs are allowed.' }
  }

  if (isPrivateHostname(parsed.hostname)) {
    return { success: false, code: 'private_ip_blocked', message: 'That destination is not allowed.' }
  }

  // 2. Fetch with timeout + redirect tracking
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let redirectCount = 0
  let currentUrl = rawUrl.trim()

  try {
    let response: Response | null = null

    while (redirectCount <= MAX_REDIRECTS) {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Tourify-LinkPreview/1.0 (+https://tourify.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location || redirectCount >= MAX_REDIRECTS) {
          return { success: false, code: 'too_many_redirects', message: 'Too many redirects.' }
        }
        const next = new URL(location, currentUrl)
        if (next.protocol !== 'https:') {
          return { success: false, code: 'http_not_allowed', message: 'Redirect to non-HTTPS is not allowed.' }
        }
        if (isPrivateHostname(next.hostname)) {
          return { success: false, code: 'private_ip_blocked', message: 'Redirect to a private address is not allowed.' }
        }
        currentUrl = next.toString()
        redirectCount++
        continue
      }
      break
    }

    if (!response) {
      return { success: false, code: 'fetch_failed', message: 'No response received.' }
    }

    // 3. Content-type check
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { success: false, code: 'not_html', message: 'The URL did not return an HTML page.' }
    }

    // 4. Body size cap
    const reader = response.body?.getReader()
    if (!reader) {
      return { success: false, code: 'fetch_failed', message: 'Could not read response body.' }
    }

    const chunks: Uint8Array[] = []
    let totalBytes = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        reader.cancel()
        break
      }
      chunks.push(value)
    }

    const html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length)
        merged.set(acc)
        merged.set(c, acc.length)
        return merged
      }, new Uint8Array(0))
    )

    // 5. Parse
    const metadata = parseMetadata(html, currentUrl)
    return { success: true, metadata }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, code: 'timeout', message: 'The request timed out.' }
    }
    return { success: false, code: 'fetch_failed', message: 'Could not reach the URL.' }
  } finally {
    clearTimeout(timer)
  }
}
