export function extractConnectToken(rawValue: string) {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) return ""

  if (!looksLikeUrl(trimmedValue))
    return trimmedValue

  try {
    const parsedUrl = new URL(trimmedValue)
    const tokenFromQuery = parsedUrl.searchParams.get("token")
    return tokenFromQuery?.trim() || ""
  } catch {
    const tokenFromLooseQuery = parseTokenFromLooseQuery(trimmedValue)
    return tokenFromLooseQuery?.trim() || ""
  }
}

function looksLikeUrl(value: string) {
  return value.includes("://") || value.startsWith("http://") || value.startsWith("https://")
}

function parseTokenFromLooseQuery(value: string) {
  const queryStartIndex = value.indexOf("?")
  if (queryStartIndex < 0) return ""

  const queryValue = value.slice(queryStartIndex + 1)
  const params = new URLSearchParams(queryValue)
  return params.get("token") || ""
}
