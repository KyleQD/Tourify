export interface CoverageForClustering {
  id: string
  headline: string
  publishedAt: string
}

export interface ClusterSuggestion {
  itemId: string
  similarity: number
  sharedTerms: string[]
  potentiallyContradictory: boolean
  /** Suggestions never change story_id. Editors or a reviewed rule must decide. */
  action: 'editorial_review'
}

const STOP = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'in', 'is', 'it', 'its', 'new', 'of', 'on', 'the', 'their', 'this', 'to',
  'with', 'will', 'what', 'when', 'after', 'before', 'more', 'about'
])
const TOPIC_MARKERS = new Set([
  'album', 'tour', 'festival', 'venue', 'concert', 'dates', 'lawsuit',
  'award', 'awards', 'release', 'song', 'single', 'record', 'tickets',
  'canceled', 'cancelled', 'postponed', 'lineup', 'show', 'shows'
])

export function headlineTerms(headline: string): string[] {
  return Array.from(new Set(
    headline.normalize('NFKD').toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)?.filter(t => t.length >= 2 && !STOP.has(t)) || []
  ))
}

function contradictionFlag(left: Set<string>, right: Set<string>): boolean {
  const opposite = [
    [new Set(['cancels', 'cancelled', 'canceled', 'postponed']), new Set(['announces', 'confirms', 'scheduled', 'added'])],
    [new Set(['denies', 'denied']), new Set(['confirms', 'confirmed', 'admits'])]
  ]
  return opposite.some(([a, b]) =>
    (Array.from(a).some(t => left.has(t)) && Array.from(b).some(t => right.has(t))) ||
    (Array.from(a).some(t => right.has(t)) && Array.from(b).some(t => left.has(t)))
  )
}

/**
 * Suggest possible duplicate coverage; never automatically merge stories.
 * High-similarity contradictory statements require more human attention,
 * not less. Timestamp and shared topic terms are deliberately conservative.
 */
export function suggestRelatedCoverage(
  incoming: CoverageForClustering,
  candidates: CoverageForClustering[],
  options: { minimumSimilarity?: number; maxAgeHours?: number; limit?: number } = {}
): ClusterSuggestion[] {
  const incomingTime = Date.parse(incoming.publishedAt)
  if (!Number.isFinite(incomingTime)) return []
  const newTerms = new Set(headlineTerms(incoming.headline))
  if (newTerms.size < 4) return []

  const minSimilarity = Math.max(0.5, Math.min(1, options.minimumSimilarity ?? 0.62))
  const maxAgeMs = Math.max(1, options.maxAgeHours ?? 120) * 60 * 60 * 1000
  const limit = Math.max(0, Math.min(20, options.limit ?? 5))
  const suggestions: ClusterSuggestion[] = []

  for (const candidate of candidates) {
    if (candidate.id === incoming.id) continue
    const time = Date.parse(candidate.publishedAt)
    if (!Number.isFinite(time) || Math.abs(time - incomingTime) > maxAgeMs) continue

    const terms = new Set(headlineTerms(candidate.headline))
    const shared = Array.from(newTerms).filter(term => terms.has(term))
    if (shared.length < 4) continue

    const markers = Array.from(newTerms).filter(term => TOPIC_MARKERS.has(term))
    const otherMarkers = Array.from(terms).filter(term => TOPIC_MARKERS.has(term))
    if ((markers.length || otherMarkers.length) &&
        !shared.some(term => TOPIC_MARKERS.has(term))) continue

    const union = new Set([...newTerms, ...terms])
    const similarity = shared.length / union.size
    if (similarity < minSimilarity) continue

    suggestions.push({
      itemId: candidate.id,
      similarity: Number(similarity.toFixed(3)),
      sharedTerms: shared,
      potentiallyContradictory: contradictionFlag(newTerms, terms),
      action: 'editorial_review'
    })
  }

  return suggestions.sort((a, b) => b.similarity - a.similarity ||
    a.itemId.localeCompare(b.itemId)).slice(0, limit)
}
