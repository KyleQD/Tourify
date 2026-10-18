import type { ComposableNewsItem, ComposeNewsConfig, IndexedNewsOrigin } from '@/lib/news/index/contracts'

const ORIGINS: IndexedNewsOrigin[] = ['rss', 'community', 'editorial']
const DEFAULT_TARGETS: Record<IndexedNewsOrigin, number> = {
  rss: 0.45,
  community: 0.35,
  editorial: 0.20
}

function quotasFor(limit: number, targets: Record<IndexedNewsOrigin, number>) {
  const sum = ORIGINS.reduce((total, origin) => total + Math.max(0, targets[origin] || 0), 0)
  if (sum <= 0) return quotasFor(limit, DEFAULT_TARGETS)

  const exact = ORIGINS.map(origin => (Math.max(0, targets[origin] || 0) / sum) * limit)
  const quotas = ORIGINS.map((_, index) => Math.floor(exact[index]))
  let extras = limit - quotas.reduce((a, b) => a + b, 0)
  const order = ORIGINS.map((_, index) => index)
    .sort((a, b) => (exact[b] - quotas[b]) - (exact[a] - quotas[a]))

  for (let index = 0; extras > 0; index++, extras--) quotas[order[index % order.length]]++
  return Object.fromEntries(ORIGINS.map((origin, i) => [origin, quotas[i]])) as Record<IndexedNewsOrigin, number>
}

/**
 * Deterministic source-aware distribution for pre-ranked, pre-moderated candidates.
 * The caller MUST apply publication / authorization rules first.
 * Quotas are composition targets, never a reason to insert ineligible content.
 */
export function composeIndexedNewsFeed(
  candidates: ComposableNewsItem[],
  config: ComposeNewsConfig
): ComposableNewsItem[] {
  const limit = Math.max(0, Math.min(100, Math.floor(config.limit)))
  if (!limit) return []

  const targets = quotasFor(limit, config.targets || DEFAULT_TARGETS)
  const sorted = [...candidates].filter(c =>
    ORIGINS.includes(c.origin) &&
    Number.isFinite(c.score) &&
    c.id.trim().length > 0 &&
    c.sourceId.trim().length > 0 &&
    c.clusterId.trim().length > 0
  ).sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id))

  const feed: ComposableNewsItem[] = []
  const takenIds = new Set<string>()
  const takenClusters = new Set<string>()
  const sourceCounts = new Map<string, number>()
  const originCounts: Record<IndexedNewsOrigin, number> = { rss: 0, community: 0, editorial: 0 }
  const maxPerSource = Math.max(1, config.maxPerSource ?? 2)

  while (feed.length < limit) {
    const available = sorted.filter(c => !takenIds.has(c.id) && !takenClusters.has(c.clusterId))
    if (!available.length) break

    // Prefer origins with unfilled slots, but always backfill when missing.
    // Spread origins throughout the feed rather than rendering source blocks.
    // Largest positive prefix deficit is chosen at each position.
    const nextPosition = feed.length + 1
    const wantedOrigins = ORIGINS.filter(origin =>
      originCounts[origin] < targets[origin] && available.some(c => c.origin === origin)
    ).sort((a, b) =>
      ((targets[b] / limit) * nextPosition - originCounts[b]) -
      ((targets[a] / limit) * nextPosition - originCounts[a]) ||
      ORIGINS.indexOf(a) - ORIGINS.indexOf(b)
    )

    const pool = wantedOrigins.length
      ? available.filter(c => c.origin === wantedOrigins[0])
      : available

    // Source caps are soft: backfill from the same publisher if no alternatives
    // remain, rather than showing an empty feed.
    const underCap = pool.filter(c => (sourceCounts.get(c.sourceId) || 0) < maxPerSource)
    const chosen = (underCap.length ? underCap : pool)[0]
    feed.push(chosen)
    takenIds.add(chosen.id)
    takenClusters.add(chosen.clusterId)
    originCounts[chosen.origin]++
    sourceCounts.set(chosen.sourceId, (sourceCounts.get(chosen.sourceId) || 0) + 1)
  }

  return feed
}
