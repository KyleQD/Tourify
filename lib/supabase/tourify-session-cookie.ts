import type { User } from '@supabase/supabase-js'

interface StoredBrowserAuthSession {
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

/**
 * Parses the JSON blob stored in `sb-tourify-auth-token` (or equivalent) by the browser client.
 */
export function parseUserFromTourifySessionCookieValue(cookieValue: string): User | null {
  if (!cookieValue) return null

  const attempts = [() => JSON.parse(decodeURIComponent(cookieValue)), () => JSON.parse(cookieValue)]
  for (const parse of attempts) {
    try {
      const session = parse() as StoredBrowserAuthSession
      if (isSessionUsable(session)) return session.user
    } catch {
      /* try next */
    }
  }
  return null
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
export function parseUserFromRequestCookieHeader(cookieHeader: string | null): User | null {
  if (!cookieHeader) return null

  const segments = cookieHeader.split(';').map((c) => c.trim())
  const tourify = segments.find((s) => s.startsWith('sb-tourify-auth-token='))
  if (tourify) {
    const value = tourify.slice('sb-tourify-auth-token='.length)
    return parseUserFromTourifySessionCookieValue(value)
  }

  const projectRef = resolveSupabaseProjectRef()
  const fallback = segments.find((s) => {
    if (!s.startsWith('sb-')) return false
    if (s.includes('code-verifier') || s.includes('refresh')) return false
    const eq = s.indexOf('=')
    if (eq === -1) return false
    const value = s.slice(eq + 1)
    if (value.length <= 100) return false
    if (s.includes('auth-token')) return true
    if (projectRef && s.includes(projectRef)) return true
    return false
  })

  if (!fallback) return null
  const eq = fallback.indexOf('=')
  const value = eq === -1 ? '' : fallback.slice(eq + 1)
  return parseUserFromTourifySessionCookieValue(value)
}

/**
 * `cookies().getAll()` shape (middleware / Next cookie store).
 */
export function parseUserFromCookieNameValueList(
  cookies: ReadonlyArray<{ name: string; value: string }>,
): User | null {
  const primary = cookies.find((c) => c.name === 'sb-tourify-auth-token')
  if (primary?.value) return parseUserFromTourifySessionCookieValue(primary.value)

  const projectRef = resolveSupabaseProjectRef()
  const fallback = cookies.find((c) => {
    if (!c.name.startsWith('sb-')) return false
    if (c.name.includes('code-verifier') || c.name.includes('refresh')) return false
    if (c.value.length <= 100) return false
    if (c.name.includes('auth-token')) return true
    if (projectRef && c.name.includes(projectRef)) return true
    return false
  })

  if (!fallback?.value) return null
  return parseUserFromTourifySessionCookieValue(fallback.value)
}
