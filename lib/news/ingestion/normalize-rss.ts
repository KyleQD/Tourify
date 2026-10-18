import { createHash } from 'node:crypto'

export interface RssNormalizationInput {
  sourceId: string
  sourceName: string
  title: string
  link: string
  publishedAt: string
  summary?: string
  imageUrl?: string
  rightsPolicy: 'link_only' | 'licensed'
}

/** Stable publisher link normalization: never resolve/fetch unapproved user URLs. */
export function canonicalizePublisherUrl(input: string): string | null {
  try {
    if (input.length > 4096) return null
    const url = new URL(input)
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) return null
    if (/^(localhost|.*\.localhost|.*\.local)$/i.test(url.hostname)) return null
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)) return null
    if (url.hostname.includes(':') || url.port) return null
    url.hash = ''
    for (const key of Array.from(url.searchParams.keys())) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
        url.searchParams.delete(key)
      }
    }
    url.searchParams.sort()
    return url.toString()
  } catch {
    return null
  }
}

function limitedPlainText(text: string, max: number): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/**
 * Build a review-pending index candidate; only a separately authorized
 * worker may change moderation and publication states after source checks.
 */
export function normalizeRssCandidate(input: RssNormalizationInput) {
  const url = canonicalizePublisherUrl(input.link)
  const headline = limitedPlainText(input.title, 300)
  const timestamp = Date.parse(input.publishedAt)
  if (!url || !headline || !input.sourceId.trim() || !input.sourceName.trim() ||
      !Number.isFinite(timestamp) || timestamp > Date.now() + 60 * 60 * 1000) {
    return null
  }
  const licensed = input.rightsPolicy === 'licensed'
  return {
    origin_type: 'rss' as const,
    source_id: input.sourceId,
    source_name: limitedPlainText(input.sourceName, 150),
    dedupe_key: createHash('sha256').update(url).digest('hex'),
    canonical_url: url,
    headline,
    excerpt: licensed ? limitedPlainText(input.summary || '', 280) : '',
    image_url: licensed && input.imageUrl ? canonicalizePublisherUrl(input.imageUrl) : null,
    published_at: new Date(timestamp).toISOString(),
    rights_state: input.rightsPolicy,
    visibility: 'private' as const,
    publication_state: 'pending' as const,
    moderation_state: 'pending' as const
  }
}
