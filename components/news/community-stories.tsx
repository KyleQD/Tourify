'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Pen,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Button } from '@/components/ui/button'

interface CommunityArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  featuredImageUrl: string | null
  tags: string[]
  categories: string[]
  publishedAt: string
  author: {
    id: string
    name: string
    username: string | null
    avatarUrl: string | null
    isVerified: boolean
  }
  metrics: {
    likes: number
    comments: number
    shares: number
    views: number
  }
  readingTime: number
}

interface CommunityStoriesProps {
  refreshKey?: number
}

export function CommunityStories({ refreshKey }: CommunityStoriesProps) {
  const router = useRouter()
  const [articles, setArticles] = useState<CommunityArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchArticles = useCallback(async (cursor?: string) => {
    const url = new URL('/api/pulse/articles', window.location.origin)
    url.searchParams.set('limit', '6')
    if (cursor) url.searchParams.set('cursor', cursor)

    const response = await fetch(url.toString())
    if (!response.ok) throw new Error('Failed to load community stories')
    return response.json()
  }, [])

  useEffect(() => {
    setIsLoading(true)
    fetchArticles()
      .then(data => {
        setArticles(data.articles || [])
        setNextCursor(data.nextCursor || null)
      })
      .catch(() => setArticles([]))
      .finally(() => setIsLoading(false))
  }, [fetchArticles, refreshKey])

  async function loadMore() {
    if (!nextCursor) return
    setIsLoadingMore(true)
    try {
      const data = await fetchArticles(nextCursor)
      setArticles(prev => [...prev, ...(data.articles || [])])
      setNextCursor(data.nextCursor || null)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Community Stories</h2>
            <p className="text-xs text-slate-500">Articles and news from Tourify members</p>
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-xs text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-500 hover:to-purple-500"
          onClick={() => router.push('/blog/new')}
        >
          <Pen className="mr-1.5 h-3.5 w-3.5" />
          Write Article
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Pen className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm font-medium text-slate-300">No community articles yet</p>
          <p className="mb-4 mt-1 text-xs text-slate-500">Be the first to publish a story!</p>
          <Button
            size="sm"
            className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-xs text-white"
            onClick={() => router.push('/blog/new')}
          >
            <Pen className="mr-1.5 h-3.5 w-3.5" />
            Write Your First Article
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map(article => (
              <CommunityArticleCard key={article.id} article={article} />
            ))}
          </div>

          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-white/15 bg-white/5 text-xs text-slate-300 hover:bg-white/10"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Show more community stories'
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function CommunityArticleCard({ article }: { article: CommunityArticle }) {
  const authorInitial = (article.author.name || '?').charAt(0).toUpperCase()
  const hasTraction = (article.metrics.likes + article.metrics.comments + article.metrics.shares) > 5

  return (
    <a
      href={`/blog/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
    >
      {/* Image or gradient header */}
      {article.featuredImageUrl ? (
        <div className="relative h-36 overflow-hidden bg-slate-800">
          <img
            src={article.featuredImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <CategoryBadge category={article.categories[0]} />
            {hasTraction && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/30 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-200 backdrop-blur-sm">
                <TrendingUp className="h-2.5 w-2.5" />
                Trending
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex h-24 items-end bg-gradient-to-br from-purple-900/40 via-fuchsia-900/30 to-slate-900/40 px-4 pb-3">
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <CategoryBadge category={article.categories[0]} />
            {hasTraction && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/30 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-200 backdrop-blur-sm">
                <TrendingUp className="h-2.5 w-2.5" />
                Trending
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-fuchsia-200">
          {article.title}
        </h3>

        <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400">
          {article.excerpt}
        </p>

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Author + meta */}
        <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
          <div className="flex items-center gap-2">
            {article.author.avatarUrl ? (
              <img
                src={article.author.avatarUrl}
                alt=""
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-300">
                {authorInitial}
              </div>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              {article.author.name}
              {article.author.isVerified && (
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-600">
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {article.readingTime}m
            </span>
            <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}</span>
          </div>
        </div>

        {/* Engagement */}
        {(article.metrics.likes > 0 || article.metrics.comments > 0 || article.metrics.views > 0) && (
          <div className="flex items-center gap-3 text-[10px] text-slate-600">
            {article.metrics.views > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Eye className="h-3 w-3" /> {article.metrics.views}
              </span>
            )}
            {article.metrics.likes > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <Heart className="h-3 w-3" /> {article.metrics.likes}
              </span>
            )}
            {article.metrics.comments > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <MessageCircle className="h-3 w-3" /> {article.metrics.comments}
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  )
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null

  return (
    <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
      {category}
    </span>
  )
}
