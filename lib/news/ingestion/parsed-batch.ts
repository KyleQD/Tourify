import { normalizeRssCandidate, type RssNormalizationInput } from '@/lib/news/ingestion/normalize-rss'
import {
  isApprovedArticleFromSource,
  isApprovedSourceRegistryEntry,
  type ApprovedNewsSource
} from '@/lib/news/ingestion/source-policy'

export interface ParsedFeedEntry {
  title: string
  link: string
  publishedAt: string
  summary?: string
  imageUrl?: string
}

export interface PreparedNewsBatch {
  accepted: NonNullable<ReturnType<typeof normalizeRssCandidate>>[]
  examined: number
  duplicates: number
  rejected: number
}

/**
 * Feed parser boundary. A separate restricted adapter must fetch + parse XML
 * using a reviewed, bounded XML parser before it reaches this function.
 * This function does no network calls, no DB writes and never publishes.
 */
export function prepareApprovedNewsBatch(
  source: ApprovedNewsSource,
  entries: ParsedFeedEntry[],
  maxItems = 100
): PreparedNewsBatch {
  const max = Math.max(0, Math.min(100, Math.floor(maxItems)))
  if (!isApprovedSourceRegistryEntry(source) || !max) {
    return { accepted: [], examined: 0, duplicates: 0, rejected: 0 }
  }

  const accepted: PreparedNewsBatch['accepted'] = []
  let duplicates = 0
  let rejected = 0
  const seen = new Set<string>()
  const bounded = entries.slice(0, max)

  for (const entry of bounded) {
    if (!isApprovedArticleFromSource(source, entry.link)) {
      rejected++
      continue
    }

    const candidate: RssNormalizationInput = {
      sourceId: source.id,
      sourceName: source.name,
      title: entry.title,
      link: entry.link,
      publishedAt: entry.publishedAt,
      summary: entry.summary,
      imageUrl: entry.imageUrl,
      rightsPolicy: source.rightsPolicy
    }
    const prepared = normalizeRssCandidate(candidate)
    if (!prepared) {
      rejected++
      continue
    }
    if (seen.has(prepared.dedupe_key)) {
      duplicates++
      continue
    }
    seen.add(prepared.dedupe_key)
    accepted.push(prepared)
  }

  return { accepted, examined: bounded.length, duplicates, rejected }
}
