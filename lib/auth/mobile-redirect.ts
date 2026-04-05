const SAFE_MOBILE_FALLBACK = "tourify://discover"

function isAllowedMobileRedirectUri(uri: string) {
  const trimmedUri = uri.trim()
  if (/^tourify:\/\//i.test(trimmedUri)) return true

  try {
    const parsed = new URL(trimmedUri)
    return parsed.protocol === "https:" && parsed.hostname === "tourify.app"
  } catch {
    return false
  }
}

export function buildSafeMobileRedirect(uri: string | null, query: Record<string, string>) {
  const safeBase = getSafeMobileRedirectBase(uri)
  return appendQueryParamsToUri(safeBase, query)
}

export function getSafeMobileRedirectBase(uri: string | null) {
  if (!uri) return SAFE_MOBILE_FALLBACK
  if (!isAllowedMobileRedirectUri(uri)) return SAFE_MOBILE_FALLBACK
  return uri.trim()
}

export function appendQueryParamsToUri(uri: string, query: Record<string, string>) {
  const [withoutHash, hash = ""] = uri.split("#", 2)
  const [base, existingQuery = ""] = withoutHash.split("?", 2)
  const searchParams = new URLSearchParams(existingQuery)

  for (const [key, value] of Object.entries(query)) {
    searchParams.set(key, value)
  }

  const queryString = searchParams.toString()
  const hashSuffix = hash ? `#${hash}` : ""
  if (!queryString) return `${base}${hashSuffix}`
  return `${base}?${queryString}${hashSuffix}`
}
