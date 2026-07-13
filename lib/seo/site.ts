export const DEFAULT_SITE_ORIGIN = 'https://tourify.live'
export const DEFAULT_OG_IMAGE_PATH = '/opengraph-image'
export const DEFAULT_TWITTER_IMAGE_PATH = '/twitter-image'

export function getSiteOrigin() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN).trim()
  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    return new URL(normalized).origin.replace(/\/$/, '')
  } catch {
    return DEFAULT_SITE_ORIGIN
  }
}

export function getMetadataBase() {
  return new URL(getSiteOrigin())
}

export function toAbsoluteUrl(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    return new URL(value, `${getSiteOrigin()}/`).toString()
  } catch {
    return null
  }
}

export function stripMarkup(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#>*_~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function truncateDescription(value: string | null | undefined, maxLength = 160) {
  const cleaned = stripMarkup(String(value || '')).trim()
  if (cleaned.length <= maxLength) return cleaned

  const clipped = cleaned.slice(0, Math.max(0, maxLength - 3)).trim()
  return `${clipped}...`
}

export function compactList(values: Array<string | null | undefined>) {
  return values.map(value => String(value || '').trim()).filter(Boolean)
}
