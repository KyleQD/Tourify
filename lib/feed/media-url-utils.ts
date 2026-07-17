export function isValidFeedMediaUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false

  const url = value.trim()
  if (!url || url.startsWith('blob:')) return false

  return (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('/') ||
    url.startsWith('data:image/')
  )
}

function readMediaUrl(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return null

  const item = value as Record<string, unknown>
  const candidate =
    item.url ||
    item.media_url ||
    item.public_url ||
    item.publicUrl ||
    item.src

  return typeof candidate === 'string' ? candidate : null
}

export function countUnavailableFeedMediaUrls(value: unknown): number {
  if (!Array.isArray(value)) return 0

  return value.reduce((count, item) => {
    const url = readMediaUrl(item)?.trim()
    if (!url) return count
    return isValidFeedMediaUrl(url) ? count : count + 1
  }, 0)
}

export function normalizeFeedMediaUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map(readMediaUrl)
    .filter(isValidFeedMediaUrl)
    .map((url) => url.trim())
}
