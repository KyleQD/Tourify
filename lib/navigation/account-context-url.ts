/**
 * URL helpers for encoding and reading the active account context in query params.
 *
 * Strategy: hybrid — the session (server) is the source of truth, but the URL
 * carries ?account=<profileId> so hard navigations, shared links, and refreshes
 * can resolve the correct entity without an extra round-trip.
 *
 * Query-param name: `account`
 * Value: profile UUID of the active entity account (not the user id)
 */

export const ACCOUNT_PARAM = 'account'

function tryDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Return `basePath?account=<profileId>` if profileId is non-empty.
 * For general accounts the param is omitted (general is always the default).
 */
export function buildAccountScopedPath(
  basePath: string,
  profileId: string | null | undefined,
  accountType?: string | null
): string {
  if (!profileId || accountType === 'general') return basePath
  const sep = basePath.includes('?') ? '&' : '?'
  return `${basePath}${sep}${ACCOUNT_PARAM}=${encodeURIComponent(profileId)}`
}

/**
 * Extract the `?account=` value from a URLSearchParams or raw search string.
 * Handles legacy organizer IDs that contain unencoded `&` characters.
 */
export function readAccountFromSearch(search: string | URLSearchParams): string | null {
  if (typeof search !== 'string') {
    const fromParams = search.get(ACCOUNT_PARAM)
    if (fromParams) return fromParams
    search = search.toString()
  }

  const raw = search.startsWith('?') ? search.slice(1) : search
  const prefix = `${ACCOUNT_PARAM}=`
  const start = raw.indexOf(prefix)
  if (start === -1) return null

  const after = raw.slice(start + prefix.length)
  if (!after) return null

  // Standard encoded value (no raw & in the id)
  if (!after.includes('&')) return tryDecode(after)

  // Try URLSearchParams first (works when account id was encodeURIComponent'd)
  const params = new URLSearchParams(raw)
  const fromParams = params.get(ACCOUNT_PARAM)
  if (fromParams && fromParams.length > after.split('&')[0].length) {
    return fromParams
  }

  // Legacy: unencoded & inside the account id — rejoin until a real key=value param
  const segments = after.split('&')
  let rebuilt = tryDecode(segments[0])
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].includes('=')) break
    rebuilt += '&' + segments[i]
  }

  return tryDecode(rebuilt)
}

/**
 * Strip the `?account=` param from a path without changing other params.
 */
export function stripAccountParam(path: string): string {
  const [base, qs] = path.split('?')
  if (!qs) return base
  const params = new URLSearchParams(qs)
  params.delete(ACCOUNT_PARAM)
  const remaining = params.toString()
  return remaining ? `${base}?${remaining}` : base
}
