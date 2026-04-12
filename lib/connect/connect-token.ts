export function extractConnectToken(rawValue: string) {
  const trimmedValue = rawValue.trim()
  if (!trimmedValue) return ''

  if (!looksLikeUrl(trimmedValue))
    return trimmedValue

  try {
    const parsedUrl = new URL(trimmedValue)
    return parsedUrl.searchParams.get('token')?.trim() || ''
  } catch {
    return parseTokenFromLooseQuery(trimmedValue)
  }
}

function looksLikeUrl(value: string) {
  return value.includes('://') || value.startsWith('http://') || value.startsWith('https://')
}

function parseTokenFromLooseQuery(value: string) {
  const queryStartIndex = value.indexOf('?')
  if (queryStartIndex < 0) return ''

  const params = new URLSearchParams(value.slice(queryStartIndex + 1))
  return params.get('token')?.trim() || ''
}
