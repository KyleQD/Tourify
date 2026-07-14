import { apiRequest } from "@/lib/api/client"

export interface PulseArticleAuthor {
  id: string
  type: string
  name: string
  username?: string | null
  avatarUrl?: string | null
}

export interface PulseArticleMetrics {
  likes: number
  comments: number
  shares: number
  views: number
}

export interface PulseArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImageUrl: string | null
  tags: string[]
  categories: string[]
  publishedAt: string | null
  metrics?: PulseArticleMetrics
  author?: PulseArticleAuthor
}

interface PulseArticlesResponse {
  success: boolean
  articles?: PulseArticle[]
  nextCursor?: string | null
}

export async function getPulseArticles(limit = 20) {
  const payload = await apiRequest<PulseArticlesResponse>(`/api/pulse/articles?limit=${limit}`, {
    authRequired: false,
  })
  return Array.isArray(payload.articles) ? payload.articles : []
}
