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
 * Returns null when absent.
 */
export function readAccountFromSearch(search: string | URLSearchParams): string | null {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search
  return params.get(ACCOUNT_PARAM) ?? null
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
