'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, Loader2, RefreshCw, Search, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { NewsFilters, type NewsFacet } from '@/components/news/news-filters'
import { CommunityStories } from '@/components/news/community-stories'
import type { NewsFeedItem } from '@/lib/news/types'

const AUTO_REFRESH_MS = 15 * 60 * 1000

type PulseSection = 'feed' | 'community'

interface NewsFeedResponse {
  success: boolean
  items: NewsFeedItem[]
  nextCursor: string | null
}

export function NewsPage() {
  const [items, setItems] = useState<NewsFeedItem[]>([])
  const [activeFacet, setActiveFacet] = useState<NewsFacet>('top')
  const [activeSection, setActiveSection] = useState<PulseSection>('feed')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [communityRefreshKey, setCommunityRefreshKey] = useState(0)
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchInitialPage = useCallback(async (opts?: { silent?: boolean }) => {
    if (opts?.silent) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    try {
      const data = await fetchNewsPage({
        facet: activeFacet,
        query: searchQuery,
        cursor: undefined
      })
      setItems(data.items)
      setNextCursor(data.nextCursor)
      setLastRefreshed(new Date())
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [activeFacet, searchQuery])

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
    if (!nextCursor) return
    setIsLoadingMore(true)

    try {
      const data = await fetchNewsPage({
        facet: activeFacet,
        query: searchQuery,
        cursor: nextCursor
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

  return (
    <div className="min-h-screen bg-[#03030a] pb-24 pt-[calc(3.5rem+1rem)] text-white">
      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        {/* Ambient background glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 h-[420px] w-[420px] rounded-full bg-fuchsia-500/10 blur-[140px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-40 h-[360px] w-[360px] rounded-full bg-cyan-400/8 blur-[140px]"
        />

        {/* Header */}
        <header className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Pulse</h1>
                  <p className="text-sm text-slate-400">Live music industry news &amp; stories</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              {lastRefreshed && (
                <span className="hidden sm:inline">
                  Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') void fetchInitialPage()
              }}
              className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500 focus-visible:border-fuchsia-500/50 focus-visible:ring-fuchsia-500/20"
              placeholder="Search artists, stories, genres, and sources..."
            />
          </div>

          {/* Section Toggle + Facets */}
          <div className="space-y-3">
            <div className="flex gap-1 rounded-xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setActiveSection('feed')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeSection === 'feed'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Industry Feed
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('community')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeSection === 'community'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Community Stories
              </button>
            </div>

            {activeSection === 'feed' && (
              <NewsFilters activeFacet={activeFacet} onFacetChange={setActiveFacet} />
            )}
          </div>
        </header>

        {/* Ticker strip — only for the feed section */}
        {activeSection === 'feed' && items.length > 0 && <TickerStrip items={items} />}

        {/* Content Sections */}
        {activeSection === 'feed' ? (
          <section className="relative z-10 mt-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
                <p className="text-sm text-slate-400">Loading stories...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                <p className="text-lg font-medium text-white">No stories match your filters</p>
                <p className="mt-1 text-sm text-slate-400">Try a wider search or switch to another facet.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item, index) => (
                  <StoryCard key={item.id} item={item} index={index} />
                ))}
              </div>
            )}

            {Boolean(nextCursor) && !isLoading && (
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
          </section>
        ) : (
          <section className="relative z-10 mt-8">
            <CommunityStories refreshKey={communityRefreshKey} />
          </section>
        )}
      </div>
    </div>
  )
}

function TickerStrip({ items }: { items: NewsFeedItem[] }) {
  const stories = items.slice(0, 10)
  if (!stories.length) return null

  const loopedStories = [...stories, ...stories]

  return (
    <div className="relative z-10 mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fuchsia-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-fuchsia-500" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live Feed</span>
      </div>
      <div className="overflow-hidden">
        <div className="ticker-track flex w-max gap-6 px-4 py-3">
          {loopedStories.map((story, index) => (
            <a
              key={`${story.id}-${index}`}
              href={story.url}
              target="_blank"
              rel="noreferrer"
              className="group flex shrink-0 items-center gap-3 rounded-lg px-3 py-1.5 transition hover:bg-white/5"
            >
              <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                {decodeTextEntity(story.title).slice(0, 60)}
                {story.title.length > 60 ? '...' : ''}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                {decodeTextEntity(story.sourceName)}
              </span>
            </a>
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

function StoryCard({ item, index }: { item: NewsFeedItem; index: number }) {
  const [imageSrc, setImageSrc] = useState(() => getPrimaryCardImageUrl({ item, index }))
  const [imageError, setImageError] = useState(false)
  const isExternal = Boolean(item.url)

  const trustColor = getTrustColor(item.moderation.trustLabel)

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.06]">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Source badge */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${trustColor}`}>
            {item.sourceName}
          </span>
        </div>

        {/* Timestamp */}
        <div className="absolute right-3 top-3">
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-slate-300 backdrop-blur-sm">
            {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-white">
          {decodeTextEntity(item.title)}
        </h2>

        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-slate-400">
          {decodeTextEntity(item.summary)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-wrap gap-1.5">
            {item.topics.slice(0, 2).map(topic => (
              <span
                key={topic}
                className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-400"
              >
                {topic}
              </span>
            ))}
          </div>

          {isExternal && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
            >
              Read
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function getTrustColor(trustLabel: string) {
  if (trustLabel === 'verified_source') return 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
  if (trustLabel === 'developing_story') return 'border-blue-500/40 bg-blue-500/20 text-blue-300'
  if (trustLabel === 'community_report') return 'border-amber-500/40 bg-amber-500/20 text-amber-300'
  return 'border-slate-500/40 bg-slate-500/20 text-slate-300'
}

function decodeTextEntity(value: string): string {
  return value
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]*>/g, '')
}

function getPrimaryCardImageUrl(params: { item: NewsFeedItem; index: number }): string {
  if (params.item.imageUrl) return params.item.imageUrl
  const seed = toImageSeed(`${params.item.sourceName}-${params.item.topics[0] || 'music'}-${params.index}`)
  return `https://picsum.photos/seed/${seed}/800/480`
}

function getFallbackCardImageUrl(item: NewsFeedItem): string {
  const topicLabel = item.topics[0] || 'Music'
  const sourceLabel = item.sourceName || 'Pulse'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 480'>
    <defs>
      <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#1e1b4b'/>
        <stop offset='50%' stop-color='#7e22ce'/>
        <stop offset='100%' stop-color='#0f172a'/>
      </linearGradient>
    </defs>
    <rect width='800' height='480' fill='url(#bg)'/>
    <text x='40' y='380' fill='rgba(255,255,255,0.85)' font-size='48' font-family='system-ui, sans-serif' font-weight='700'>${escapeSvgText(topicLabel)}</text>
    <text x='40' y='430' fill='rgba(255,255,255,0.55)' font-size='28' font-family='system-ui, sans-serif'>${escapeSvgText(sourceLabel)}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function escapeSvgText(value: string): string {
  return value.replace(/[<>&'"]/g, '')
}

function toImageSeed(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64) || 'pulse-story'
}

async function fetchNewsPage(params: {
  facet: NewsFacet
  cursor?: string
  query?: string
}): Promise<NewsFeedResponse> {
  const url = new URL('/api/news/feed', window.location.origin)
  url.searchParams.set('limit', '21')
  url.searchParams.set('facet', params.facet)
  if (params.cursor) url.searchParams.set('cursor', params.cursor)
  if (params.query?.trim()) url.searchParams.set('query', params.query.trim())

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Failed to fetch news feed')
  return response.json()
}
