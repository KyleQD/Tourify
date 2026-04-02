export interface NewsAuthor {
  id: string
  name: string
  username?: string
  avatarUrl?: string
  isVerified?: boolean
}

export interface NewsMetrics {
  likes: number
  comments: number
  shares: number
  views: number
}

export interface NewsModeration {
  trustLabel: 'verified_source' | 'community_report' | 'developing_story' | 'unverified'
  confidence: number
  moderationState: 'approved' | 'review_pending'
}

export interface NewsFeedItem {
  id: string
  originType: 'external' | 'internal_post' | 'internal_blog'
  sourceType: 'publisher' | 'community'
  sourceName: string
  title: string
  summary: string
  imageUrl?: string
  url?: string
  publishedAt: string
  topics: string[]
  author?: NewsAuthor
  metrics: NewsMetrics
  moderation: NewsModeration
  relevanceScore: number
  score: number
  isSubscribedSource?: boolean
}

export interface NewsFeedCursor {
  score: number
  publishedAt: string
  id: string
}

export interface NewsFeedQuery {
  limit: number
  cursor?: string
  facet: 'top' | 'following' | 'local' | 'industry' | 'gossip' | 'verified'
  query?: string
  userId?: string
}

export interface RankedNewsFeedResult {
  items: NewsFeedItem[]
  nextCursor: string | null
}
