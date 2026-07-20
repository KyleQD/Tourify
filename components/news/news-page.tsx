'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ExternalLink, Loader2, Radio, RefreshCw, Search, Send, Share2, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { NewsFilters } from '@/components/news/news-filters'
import { NewsMasthead } from '@/components/news/news-masthead'
import { useActingContext } from '@/hooks/use-acting-context'
import type { NewsCategory, NewsFeedItem, NewsSortMode } from '@/lib/news/types'

const AUTO_REFRESH_MS = 15 * 60 * 1000
const FEATURED_CATEGORIES: Array<{ value: Exclude<NewsCategory, 'featured'>; title: string }> = [
  { value: 'articles', title: 'Top Articles' },
  { value: 'new-music', title: 'Top New Music' },
  { value: 'events', title: 'Top Events' },
  { value: 'gossip', title: 'Top Gossip' },
  { value: 'editorial', title: 'Top Editorial' },
  { value: 'global', title: 'Top Global' }
]

interface NewsFeedResponse {
  success: boolean
  items: NewsFeedItem[]
  nextCursor: string | null
}

interface FeaturedSection {
  category: Exclude<NewsCategory, 'featured'>
  title: string
  items: NewsFeedItem[]
}

export function NewsPage() {
  const [items, setItems] = useState<NewsFeedItem[]>([])
  const [featuredSections, setFeaturedSections] = useState<FeaturedSection[]>([])
  const [activeCategory, setActiveCategory] = useState<NewsCategory>('featured')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [sectionErrors, setSectionErrors] = useState<string[]>([])
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tickerItems = useMemo(() => {
    if (activeCategory !== 'featured') return items
    return featuredSections.flatMap(section => section.items)
  }, [activeCategory, featuredSections, items])

  const fetchInitialPage = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      setSectionErrors([])
      if (activeCategory === 'featured') {
        const settledSections = await Promise.allSettled(
          FEATURED_CATEGORIES.map(async category => {
            const data = await fetchNewsPage({
              category: category.value,
              query,
              limit: 6,
              sort: category.value === 'gossip' ? 'engagement' : 'score'
            })

            return {
              category: category.value,
              title: category.title,
              items: data.items.slice(0, 6)
            }
          })
        )

        const sections = settledSections
          .filter((result): result is PromiseFulfilledResult<FeaturedSection> => result.status === 'fulfilled')
          .map(result => result.value)
        const failedSections = settledSections
          .map((result, index) => result.status === 'rejected' ? FEATURED_CATEGORIES[index].title : null)
          .filter(Boolean) as string[]

        if (failedSections.length > 0) {
          console.warn('[News Pulse] Some featured sections failed to load:', failedSections)
          setSectionErrors(failedSections)
        }

        setFeaturedSections(sections.filter(section => section.items.length > 0))
        setItems([])
        setNextCursor(null)
      } else {
        const data = await fetchNewsPage({
          category: activeCategory,
          query,
          limit: 21
        })
        setItems(data.items)
        setFeaturedSections([])
        setNextCursor(data.nextCursor)
      }

      setLastRefreshed(new Date())
    } catch (error) {
      console.warn('[News Pulse] Failed to load feed:', error)
      setItems([])
      setFeaturedSections([])
      setNextCursor(null)
      setSectionErrors(['News Pulse'])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [activeCategory, query])

  useEffect(() => {
    void fetchInitialPage()
  }, [fetchInitialPage])

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      void fetchInitialPage({ silent: true })
    }, AUTO_REFRESH_MS)

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
    }
  }, [fetchInitialPage])

  async function loadMore() {
    if (!nextCursor || activeCategory === 'featured') return
    setIsLoadingMore(true)

    try {
      const data = await fetchNewsPage({
        category: activeCategory,
        query,
        cursor: nextCursor,
        limit: 21
      })
      setItems(previous => [...previous, ...data.items])
      setNextCursor(data.nextCursor)
    } finally {
      setIsLoadingMore(false)
    }
  }

  function handleManualRefresh() {
    void fetchInitialPage({ silent: true })
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setQuery(searchInput.trim())
  }

  return (
    <div className="min-h-screen bg-[#03030a] pb-24 text-white">
      <NewsMasthead />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-6 pt-3 md:px-8">
        {tickerItems.length > 0 && <TickerStrip items={tickerItems} />}

        <header className="relative z-10 mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_16px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent" />

          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                className="h-11 rounded-2xl border-white/10 bg-black/30 pl-11 text-white placeholder:text-slate-500 focus-visible:border-fuchsia-500/50 focus-visible:ring-fuchsia-500/20"
                placeholder="Search artists, stories, genres, and sources..."
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="submit"
                className="h-11 rounded-2xl bg-white px-5 font-semibold text-black hover:bg-white/90"
              >
                Search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {lastRefreshed && (
                  <span className="hidden sm:inline">
                    Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh News Pulse"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-4">
            <NewsFilters activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
          </div>
        </header>

        <section className="relative z-10 mt-8">
          {sectionErrors.length > 0 && (
            <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
              Some News Pulse sections are temporarily unavailable. The rest of the feed is still live.
            </div>
          )}

          {isLoading ? (
            <LoadingState />
          ) : activeCategory === 'featured' ? (
            <FeaturedStacks sections={featuredSections} />
          ) : items.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item, index) => (
                  <StoryCard key={item.id} item={item} index={index} />
                ))}
              </div>

              {Boolean(nextCursor) && (
                <div className="mt-10 flex justify-center">
                  <Button
                    variant="outline"
                    className="rounded-xl border-white/15 bg-white/5 px-8 text-slate-200 hover:bg-white/10"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more stories'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function FeaturedStacks({ sections }: { sections: FeaturedSection[] }) {
  if (!sections.length) return <EmptyState />

  return (
    <div className="space-y-8">
      {sections.map(section => (
        <section key={section.category} className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-500">Ranked from live sources and Tourify activity.</p>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:-mx-8 md:px-8 [scrollbar-width:thin]">
            {section.items.map((item, index) => (
              <div
                key={item.id}
                className="w-[280px] shrink-0 snap-start sm:w-[320px]"
              >
                <StoryCard item={item} index={index} compact />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
      <p className="text-sm text-slate-400">Loading stories...</p>
    </div>
  )
}

function EmptyState({ category }: { category?: NewsCategory } = {}) {
  const isArticles = category === 'articles'

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-12 text-center">
      <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-500" />
      <p className="text-lg font-medium text-white">
        {isArticles ? 'No community articles yet' : 'No stories match your filters'}
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {isArticles
          ? 'Publish an article from Press to appear here.'
          : 'Try a wider search or switch to another category.'}
      </p>
      {isArticles ? (
        <Button asChild className="mt-5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500">
          <a href="/artist/press?new=1&type=article">Write an article</a>
        </Button>
      ) : null}
    </div>
  )
}

function TickerStrip({ items }: { items: NewsFeedItem[] }) {
  const stories = items.slice(0, 10)
  if (!stories.length) return null

  const loopedStories = [...stories, ...stories]

  return (
    <div className="relative z-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-300 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-300" />
        </span>
        <Radio className="h-3.5 w-3.5 text-fuchsia-300" />
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">Live Music Wire</span>
      </div>
      <div className="overflow-hidden">
        <div className="ticker-track flex w-max gap-6 px-4 py-3">
          {loopedStories.map((story, index) => (
            <NewsLink
              key={`${story.id}-${index}`}
              item={story}
              className="group flex shrink-0 items-center gap-3 rounded-lg px-3 py-1.5 transition hover:bg-white/5"
            >
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {truncate(decodeTextEntity(story.title), 72)}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {decodeTextEntity(story.sourceName)}
              </span>
            </NewsLink>
          ))}
        </div>
      </div>

      <style jsx>{`
        .ticker-track {
          animation: ticker-scroll 45s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

function StoryCard({ item, index, compact = false }: { item: NewsFeedItem; index: number; compact?: boolean }) {
  const [imageSrc, setImageSrc] = useState(() => getPrimaryCardImageUrl({ item, index }))
  const [imageError, setImageError] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [shareThoughts, setShareThoughts] = useState('')
  const [shareVisibility, setShareVisibility] = useState<'public' | 'followers'>('public')
  const [isSharing, setIsSharing] = useState(false)
  const { actingHeaders, isActingReady } = useActingContext()
  const { toast } = useToast()
  const trustColor = getTrustColor(item.moderation.trustLabel)
  const originLabel = getOriginLabel(item)
  const hasAction = Boolean(item.url)
  const canShare = Boolean(item.url)

  async function handleShareToFeed() {
    if (!item.url) return

    if (!isActingReady) {
      toast({
        title: 'Posting account loading',
        description: 'Please wait a moment and try sharing again.',
        variant: 'destructive'
      })
      return
    }

    setIsSharing(true)

    try {
      const preview = buildArticlePreviewFromNewsItem(item)
      const response = await fetch('/api/posts/share', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
        body: JSON.stringify({
          shared_content_type: 'article',
          shared_content_id: getShareContentId(item),
          content: shareThoughts.trim(),
          visibility: shareVisibility,
          article_preview: preview,
        }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.error) {
        if (response.status === 401) {
          window.location.assign(`/login?redirectTo=${encodeURIComponent('/news')}`)
          return
        }
        throw new Error(result.error || 'Could not share this article.')
      }

      toast({
        title: 'Shared to your feed',
        description: 'Your friends and followers can now see the article and your thoughts.',
      })
      setShareThoughts('')
      setShareVisibility('public')
      setIsShareOpen(false)
    } catch (error) {
      toast({
        title: 'Share failed',
        description: error instanceof Error ? error.message : 'Could not share this article.',
        variant: 'destructive'
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <>
      <article className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065] ${compact ? 'min-h-[360px]' : 'min-h-[420px]'}`}>
        <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950/50 to-slate-950 ${compact ? 'h-40' : 'h-48'}`}>
          {!imageError ? (
            <img
              src={imageSrc}
              alt=""
              loading="lazy"
              onError={() => {
                const fallback = getFallbackCardImageUrl(item)
                if (imageSrc !== fallback) {
                  setImageSrc(fallback)
                } else {
                  setImageError(true)
                }
              }}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Sparkles className="h-8 w-8 text-slate-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${trustColor}`}>
              {originLabel}
            </span>
            <span className="rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              {truncate(decodeTextEntity(item.sourceName || 'Tourify'), 28)}
            </span>
          </div>

          <div className="absolute bottom-3 right-3">
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-slate-200 backdrop-blur-sm">
              {formatStoryTime(item.publishedAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white">
            {decodeTextEntity(item.title || 'Untitled story')}
          </h2>

          <p className={`flex-1 text-sm leading-relaxed text-slate-400 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}>
            {decodeTextEntity(item.summary || 'No summary available yet.')}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {item.topics.slice(0, 3).map(topic => (
              <span
                key={topic}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400"
              >
                {topic}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-3">
            <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{getSourceDetail(item)}</span>

            <div className="flex shrink-0 items-center gap-2">
              {canShare ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full bg-white/5 px-3 text-xs font-medium text-slate-200 hover:bg-white/15 hover:text-white"
                  onClick={() => setIsShareOpen(true)}
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5" />
                  Share
                </Button>
              ) : null}

              {hasAction ? (
                <NewsLink
                  item={item}
                  className="inline-flex h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
                >
                  Read
                  {isExternalUrl(item.url) ? <ExternalLink className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                </NewsLink>
              ) : null}
            </div>
          </div>
        </div>
      </article>

      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="share-dialog-panel overflow-hidden border-white/15 bg-[#05050f]/95 p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:max-w-lg sm:rounded-2xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(217,70,239,0.14)_0%,transparent_45%),linear-gradient(225deg,rgba(34,211,238,0.1)_0%,transparent_42%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0'
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/50 to-transparent"
          />

          <div className="relative space-y-5 p-6">
            <DialogHeader className="space-y-2 pr-8 text-left">
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                Share to your feed
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-400">
                Add your thoughts and share this story with friends and followers.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {item.imageUrl ? (
                <div className="relative h-36 overflow-hidden bg-slate-950">
                  <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05050f] via-transparent to-transparent" />
                </div>
              ) : null}
              <div className="space-y-2 p-4">
                <div className="inline-flex rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100">
                  {decodeTextEntity(item.sourceName || 'News Pulse')}
                </div>
                <div className="text-sm font-semibold leading-snug text-white">
                  {decodeTextEntity(item.title || 'Untitled story')}
                </div>
                <p className="line-clamp-2 text-xs leading-5 text-slate-400">
                  {decodeTextEntity(item.summary || '')}
                </p>
              </div>
            </div>

            <Textarea
              value={shareThoughts}
              onChange={event => setShareThoughts(event.target.value)}
              placeholder="Add your thoughts..."
              maxLength={2000}
              rows={4}
              className="resize-none rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus-visible:border-fuchsia-400/40 focus-visible:ring-fuchsia-500/25"
            />

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
              <label className="text-sm text-slate-400" htmlFor={`share-visibility-${item.id}`}>
                Audience
              </label>
              <select
                id={`share-visibility-${item.id}`}
                value={shareVisibility}
                onChange={event => setShareVisibility(event.target.value === 'followers' ? 'followers' : 'public')}
                className="h-9 rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-fuchsia-400/40"
              >
                <option value="public">Public</option>
                <option value="followers">Followers</option>
              </select>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => setIsShareOpen(false)}
                disabled={isSharing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 font-semibold text-white shadow-[0_10px_30px_rgba(217,70,239,0.25)] hover:opacity-95"
                onClick={handleShareToFeed}
                disabled={isSharing}
              >
                {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Share to Feed
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function NewsLink({
  item,
  className,
  children
}: {
  item: NewsFeedItem
  className?: string
  children: React.ReactNode
}) {
  if (!item.url) return <span className={className}>{children}</span>
  if (isExternalUrl(item.url)) {
    return (
      <a href={item.url} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    )
  }

  return (
    <a href={item.url} className={className}>
      {children}
    </a>
  )
}

function getTrustColor(trustLabel: string) {
  if (trustLabel === 'verified_source') return 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
  if (trustLabel === 'developing_story') return 'border-blue-500/40 bg-blue-500/20 text-blue-300'
  if (trustLabel === 'community_report') return 'border-amber-500/40 bg-amber-500/20 text-amber-300'
  return 'border-slate-500/40 bg-slate-500/20 text-slate-300'
}

function getOriginLabel(item: NewsFeedItem) {
  if (item.originType === 'external') return 'RSS'
  if (item.id.startsWith('music_')) return 'Music'
  if (item.id.startsWith('event_') || item.id.startsWith('eventv2_')) return 'Event'
  if (item.originType === 'internal_blog') return 'Editorial'
  return item.sourceType === 'community' ? 'Community' : 'Source'
}

function getSourceDetail(item: NewsFeedItem) {
  if (item.author?.name) return item.author.name
  if (item.sourceType === 'publisher') return 'Publisher source'
  return 'Tourify source'
}

function decodeTextEntity(value: string): string {
  return String(value || '')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, '')
}

function formatStoryTime(value?: string) {
  if (!value) return 'Recently'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return formatDistanceToNow(date, { addSuffix: true })
}

function getPrimaryCardImageUrl(params: { item: NewsFeedItem; index: number }): string {
  if (params.item.imageUrl) return params.item.imageUrl
  return getFallbackCardImageUrl(params.item)
}

function getFallbackCardImageUrl(item: NewsFeedItem): string {
  const topicLabel = item.topics[0] || 'Music'
  const sourceLabel = item.sourceName || 'News Pulse'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'>
    <defs>
      <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#111827'/>
        <stop offset='46%' stop-color='#701a75'/>
        <stop offset='100%' stop-color='#083344'/>
      </linearGradient>
    </defs>
    <rect width='800' height='480' fill='url(#bg)'/>
    <text x='44' y='372' fill='rgba(255,255,255,0.9)' font-size='48' font-family='system-ui, sans-serif' font-weight='700'>${escapeSvgText(topicLabel)}</text>
    <text x='44' y='424' fill='rgba(255,255,255,0.58)' font-size='28' font-family='system-ui, sans-serif'>${escapeSvgText(sourceLabel)}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeSvgText(value: string): string {
  return value.replace(/[<>&'"]/g, '')
}

function truncate(value: string, length: number): string {
  if (value.length <= length) return value
  return `${value.slice(0, Math.max(0, length - 3)).trim()}...`
}

function isExternalUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value))
}

function getShareContentId(item: NewsFeedItem) {
  if (item.originType === 'internal_blog' && item.id.startsWith('blog_')) {
    return item.id.slice('blog_'.length)
  }
  return item.url || item.id
}

function getArticleSlug(item: NewsFeedItem) {
  if (!item.url) return ''
  if (item.url.startsWith('/blog/')) return item.url.replace('/blog/', '').split(/[?#]/)[0] || ''

  try {
    const parsed = new URL(item.url)
    return parsed.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/[^a-z0-9-]+/gi, '-')
      .replace(/(^-|-$)+/g, '')
      .toLowerCase() || ''
  } catch {
    return ''
  }
}

function getReadingTimeFromSummary(item: NewsFeedItem) {
  const words = `${item.title} ${item.summary}`.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function buildArticlePreviewFromNewsItem(item: NewsFeedItem) {
  return {
    id: getShareContentId(item),
    slug: getArticleSlug(item),
    url: item.url || '',
    title: decodeTextEntity(item.title || 'Untitled story'),
    excerpt: decodeTextEntity(item.summary || ''),
    featuredImageUrl: item.imageUrl || null,
    categories: item.topics.slice(0, 4),
    tags: item.topics.slice(0, 8),
    readingTime: getReadingTimeFromSummary(item),
    publishedAt: item.publishedAt || null,
  }
}

function resolveNewsSort(params: { category: NewsCategory; sort?: NewsSortMode }): NewsSortMode {
  if (params.sort) return params.sort
  if (params.category === 'gossip') return 'recent'
  return 'score'
}

async function fetchNewsPage(params: {
  category: NewsCategory
  cursor?: string
  query?: string
  limit?: number
  sort?: NewsSortMode
}): Promise<NewsFeedResponse> {
  const url = new URL('/api/news/feed', window.location.origin)
  const sort = resolveNewsSort(params)
  url.searchParams.set('limit', String(params.limit || 21))
  url.searchParams.set('facet', params.category === 'gossip' ? 'gossip' : 'top')
  url.searchParams.set('category', params.category)
  url.searchParams.set('sort', sort)
  if (params.cursor) url.searchParams.set('cursor', params.cursor)
  if (params.query?.trim()) url.searchParams.set('query', params.query.trim())

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Failed to fetch news feed')
  return response.json()
}
