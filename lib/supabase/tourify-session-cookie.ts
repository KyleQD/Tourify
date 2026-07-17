import type { User } from '@supabase/supabase-js'

const TOURIFY_AUTH_COOKIE_NAME = 'sb-tourify-auth-token'
const BASE64_COOKIE_PREFIX = 'base64-'

export interface StoredBrowserAuthSession {
  access_token: string
  user: User
  expires_at?: number
}

function isSessionUsable(session: StoredBrowserAuthSession): boolean {
  if (!session?.access_token || !session?.user) return false
  const now = Math.floor(Date.now() / 1000)
  if (!session.expires_at) return true
  return session.expires_at > now
}

function decodeBase64UrlString(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')

    if (typeof atob === 'function') {
      const binary = atob(padded)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    }

    return Buffer.from(padded, 'base64').toString('utf-8')
  } catch {
    return null
  }
}

function getCookieValueCandidates(cookieValue: string): string[] {
  const candidates = new Set<string>()
  const addCandidate = (value: string) => {
    if (!value) return
    candidates.add(value)
    if (value.startsWith(BASE64_COOKIE_PREFIX)) {
      const decoded = decodeBase64UrlString(value.slice(BASE64_COOKIE_PREFIX.length))
      if (decoded) candidates.add(decoded)
    }
  }

  addCandidate(cookieValue)

  try {
    addCandidate(decodeURIComponent(cookieValue))
  } catch {
    /* value may already be decoded */
  }

  return Array.from(candidates)
}

function parseCookieHeader(cookieHeader: string): Array<{ name: string; value: string }> {
  return cookieHeader
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((segment) => {
      const eq = segment.indexOf('=')
      return {
        name: eq === -1 ? segment : segment.slice(0, eq),
        value: eq === -1 ? '' : segment.slice(eq + 1),
      }
    })
}

function findStoredSessionValue(
  cookies: ReadonlyArray<{ name: string; value: string }>,
): string | null {
  const primary = cookies.find((c) => c.name === TOURIFY_AUTH_COOKIE_NAME)
  if (primary?.value) return primary.value

  const chunks: string[] = []
  for (let i = 0; ; i += 1) {
    const chunk = cookies.find((c) => c.name === `${TOURIFY_AUTH_COOKIE_NAME}.${i}`)
    if (!chunk?.value) break
    chunks.push(chunk.value)
  }
  if (chunks.length > 0) return chunks.join('')

  const projectRef = resolveSupabaseProjectRef()
  const fallback = cookies.find((c) => {
    if (!c.name.startsWith('sb-')) return false
    if (c.name.includes('code-verifier') || c.name.includes('refresh')) return false
    if (c.value.length <= 100) return false
    if (c.name.includes('auth-token')) return true
    if (projectRef && c.name.includes(projectRef)) return true
    return false
  })

  if (fallback?.value) return fallback.value

  if (!projectRef) return null
  const fallbackChunks: string[] = []
  for (let i = 0; ; i += 1) {
    const chunk = cookies.find((c) => c.name === `sb-${projectRef}-auth-token.${i}`)
    if (!chunk?.value) break
    fallbackChunks.push(chunk.value)
  }

  return fallbackChunks.length > 0 ? fallbackChunks.join('') : null
}

/**
 * Parses the JSON blob stored in `sb-tourify-auth-token` (or equivalent) by the browser client.
 */
export function parseSessionFromTourifySessionCookieValue(cookieValue: string): StoredBrowserAuthSession | null {
  if (!cookieValue) return null

  for (const candidate of getCookieValueCandidates(cookieValue)) {
    try {
      const session = JSON.parse(candidate) as StoredBrowserAuthSession
      if (isSessionUsable(session)) return session
    } catch {
      /* try next */
    }
  }
  return null
}

export function parseUserFromTourifySessionCookieValue(cookieValue: string): User | null {
  return parseSessionFromTourifySessionCookieValue(cookieValue)?.user || null
}

export function resolveSupabaseProjectRef(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF
  if (fromEnv) return fromEnv

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null

  try {
    const host = new URL(supabaseUrl).host
    return host.split('.')[0] || null
  } catch {
    return null
  }
}

/**
 * Raw `Cookie` header from a Request (Route Handlers, middleware-style string parsing).
 */
export function parseSessionFromRequestCookieHeader(cookieHeader: string | null): StoredBrowserAuthSession | null {
  if (!cookieHeader) return null

  const value = findStoredSessionValue(parseCookieHeader(cookieHeader))
  return value ? parseSessionFromTourifySessionCookieValue(value) : null
}

export function parseUserFromRequestCookieHeader(cookieHeader: string | null): User | null {
  return parseSessionFromRequestCookieHeader(cookieHeader)?.user || null
}

/**
 * `cookies().getAll()` shape (middleware / Next cookie store).
 */
export function parseSessionFromCookieNameValueList(
  cookies: ReadonlyArray<{ name: string; value: string }>,
): StoredBrowserAuthSession | null {
  const value = findStoredSessionValue(cookies)
  return value ? parseSessionFromTourifySessionCookieValue(value) : null
}

export function parseUserFromCookieNameValueList(
  cookies: ReadonlyArray<{ name: string; value: string }>,
): User | null {
  return parseSessionFromCookieNameValueList(cookies)?.user || null
}
