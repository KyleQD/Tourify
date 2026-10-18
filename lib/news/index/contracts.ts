/**
 * Public indexed News read contract.
 * This is a separate, additive V1 alongside the legacy NewsFeedItem model.
 */
export type IndexedNewsOrigin = 'rss' | 'community' | 'editorial'
export type IndexedNewsCategory = IndexedNewsOrigin

export interface IndexedNewsItem {
  id: string
  origin_type: IndexedNewsOrigin
  source_name: string
  headline: string
  excerpt: string
  canonical_url: string
  image_url: string | null
  topics: string[]
  story_id: string | null
  published_at: string
}

export interface NewsIndexCursor {
  publishedAt: string
  id: string
}

export interface ComposableNewsItem {
  id: string
  origin: IndexedNewsOrigin
  sourceId: string
  clusterId: string
  score: number
}

export interface ComposeNewsConfig {
  limit: number
  targets?: Record<IndexedNewsCategory, number>
  maxPerSource?: number
}
