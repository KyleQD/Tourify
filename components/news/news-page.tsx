'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { SurfaceInput } from '@/components/surface/surface-primitives'
import { NewsFilters, type NewsFacet } from '@/components/news/news-filters'
import { Button } from '@/components/ui/button'
import type { NewsFeedItem } from '@/lib/news/types'

interface NewsFeedResponse {
  success: boolean
  items: NewsFeedItem[]
  nextCursor: string | null
}

export function NewsPage() {
  const [items, setItems] = useState<NewsFeedItem[]>([])
  const [activeFacet, setActiveFacet] = useState<NewsFacet>('top')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    void fetchInitialPage()
  }, [activeFacet])

  async function fetchInitialPage() {
    setIsLoading(true)
    try {
      const data = await fetchNewsPage({
        facet: activeFacet,
        query: searchQuery,
        cursor: undefined
      })
      setItems(data.items)
      setNextCursor(data.nextCursor)
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen overflow-x-clip bg-[#03030a] pt-[calc(3.5rem+2.5rem)] text-white">
      <div className="relative mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 md:px-8 lg:px-16 lg:pb-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-20 h-24 w-[120%] rotate-[-14deg] rounded-[48px] border border-white/25 bg-white/10 shadow-[0_0_100px_rgba(168,85,247,0.25)] backdrop-blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-4 h-[460px] w-[460px] rounded-full bg-fuchsia-500/15 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-52 h-[400px] w-[400px] rounded-full bg-cyan-400/10 blur-[120px]"
        />

        <section className="relative z-10 space-y-6">
          <div className="space-y-3">
            <p className="inline-flex w-fit items-center rounded-full border border-cyan-200/30 bg-cyan-100/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cyan-100">
              Pulse // Cracked Signal
            </p>
            <h1 className="text-4xl font-black tracking-tight text-white md:text-6xl">PULSE</h1>
            <p className="max-w-2xl text-sm text-slate-300 md:text-base">
              Live stories cut through a fractured glass canvas. Every pane pulls in visuals from the story source and
              keeps the feed feeling immediate.
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <SurfaceInput
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter')
                  void fetchInitialPage()
              }}
              className="h-12 border-white/20 bg-white/5 pl-10 text-white placeholder:text-slate-400 [clip-path:polygon(0_15%,94%_0,100%_84%,7%_100%)]"
              placeholder="Search artists, stories, genres, and sources"
            />
          </div>

          <NewsFilters activeFacet={activeFacet} onFacetChange={setActiveFacet} />
        </section>

        <ShoutTimeline items={items} />

        <section className="relative z-10 mt-8">
          {isLoading ? (
            <div
              className="border border-white/15 bg-white/5 p-12 text-center text-slate-300 backdrop-blur-xl"
              style={{ clipPath: 'polygon(2% 2%, 97% 0, 100% 88%, 3% 100%, 0 18%)' }}
            >
              Loading pulse shards...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item, index) => (
                <GlassShardCard key={item.id} item={item} index={index} />
              ))}
            </div>
          )}

          {!isLoading && !items.length && (
            <div
              className="mt-4 border border-white/15 bg-white/5 p-10 text-center backdrop-blur-xl"
              style={{ clipPath: 'polygon(3% 0, 98% 4%, 95% 100%, 0 92%)' }}
            >
              <p className="text-lg text-white">No pulse stories match your filters.</p>
              <p className="mt-2 text-sm text-slate-400">Try a wider search or switch to another facet.</p>
            </div>
          )}

          {Boolean(nextCursor) && !isLoading && (
            <div className="mt-8 flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="border-white/30 bg-white/5 px-6 text-slate-100 transition hover:scale-105 hover:bg-white/10 [clip-path:polygon(10%_0,100%_12%,90%_100%,0_84%)]"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load more shards'}
              </Button>
            </div>
          )}
        </section>
      </div>
      <EdgeNewsTicker items={items} />

      <style jsx>{`
        .shout-track {
          animation: pulse-shout-scroll 18s linear infinite;
        }
        .shout-item {
          animation: pulse-shout-pop 1200ms ease-in-out infinite alternate;
        }
        .edge-ticker-x-forward {
          animation: edge-ticker-scroll-x 42s linear infinite;
        }
        .edge-ticker-x-reverse {
          animation: edge-ticker-scroll-x-reverse 46s linear infinite;
        }
        .edge-ticker-y-forward {
          animation: edge-ticker-scroll-y 36s linear infinite;
        }
        .edge-ticker-y-reverse {
          animation: edge-ticker-scroll-y-reverse 40s linear infinite;
        }
        .edge-ticker-shell {
          background-size: 240% 240%;
          animation: edge-ticker-hue-flow 8s ease-in-out infinite;
        }
        .edge-ticker-chip-glow {
          position: relative;
          overflow: hidden;
        }
        .edge-ticker-chip-glow::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 999px;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.34), transparent 60%);
          opacity: 0;
          transition: opacity 220ms ease-in-out;
          pointer-events: none;
        }
        .edge-ticker-chip-glow:hover::before {
          opacity: 1;
        }
        @keyframes pulse-shout-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes pulse-shout-pop {
          0% {
            transform: translateY(0) scale(1);
            filter: saturate(1);
          }
          100% {
            transform: translateY(-3px) scale(1.03);
            filter: saturate(1.35);
          }
        }
        @keyframes edge-ticker-scroll-x {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @keyframes edge-ticker-scroll-x-reverse {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        @keyframes edge-ticker-scroll-y {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-50%);
          }
        }
        @keyframes edge-ticker-scroll-y-reverse {
          0% {
            transform: translateY(-50%);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes edge-ticker-hue-flow {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  )
}

function EdgeNewsTicker({ items }: { items: NewsFeedItem[] }) {
  const tickerStories: TickerStory[] = items.slice(0, 12).map(item => ({
    id: item.id,
    label: decodeTextEntity(item.title),
    source: decodeTextEntity(item.sourceName),
    topic: decodeTextEntity(item.topics[0] || 'Music'),
    href: item.url,
    tone: getTickerTone(item.topics[0])
  }))

  const fallbackStories: TickerStory[] = [
    { id: 'pulse-live', label: 'STREAMING NOW', source: 'PULSE LIVE', topic: 'Signal', href: undefined, tone: 'fuchsia' },
    { id: 'breaking-wave', label: 'NEW SHARDS LANDING', source: 'BREAKING WAVE', topic: 'Top', href: undefined, tone: 'amber' },
    { id: 'signal-refresh', label: 'FOLLOWING YOUR SCENE', source: 'SIGNAL REFRESH', topic: 'Local', href: undefined, tone: 'cyan' }
  ]

  const stories = tickerStories.length ? tickerStories : fallbackStories
  const loopedStories = [...stories, ...stories]

  return (
    <>
      <div className="edge-ticker-shell pointer-events-none fixed inset-x-0 top-14 z-50 h-9 overflow-hidden border-y border-fuchsia-200/45 bg-gradient-to-r from-fuchsia-900/45 via-violet-900/35 to-cyan-900/45 backdrop-blur-md">
        <div className="edge-ticker-x-forward flex w-[200%] gap-6 px-4 py-1.5">
          {loopedStories.map((story, index) => (
            <TickerChip key={`top-${story.id}-${index}`} story={story} />
          ))}
        </div>
      </div>

      <div className="edge-ticker-shell pointer-events-none fixed inset-x-0 bottom-0 z-50 h-9 overflow-hidden border-y border-cyan-200/40 bg-gradient-to-r from-cyan-900/45 via-indigo-900/35 to-fuchsia-900/45 backdrop-blur-md">
        <div className="edge-ticker-x-reverse flex w-[200%] gap-6 px-4 py-1.5">
          {loopedStories.map((story, index) => (
            <TickerChip key={`bottom-${story.id}-${index}`} story={story} />
          ))}
        </div>
      </div>

      <div className="edge-ticker-shell pointer-events-none fixed bottom-9 left-0 top-[5.5rem] z-50 hidden w-10 overflow-hidden border-x border-fuchsia-200/40 bg-gradient-to-b from-fuchsia-900/45 via-violet-900/30 to-indigo-900/45 backdrop-blur-md xl:block">
        <div className="edge-ticker-y-forward flex h-[200%] flex-col gap-6 px-1.5 py-3">
          {loopedStories.map((story, index) => (
            <TickerRailChip key={`left-${story.id}-${index}`} story={story} />
          ))}
        </div>
      </div>

      <div className="edge-ticker-shell pointer-events-none fixed bottom-9 right-0 top-[5.5rem] z-50 hidden w-10 overflow-hidden border-x border-cyan-200/35 bg-gradient-to-b from-cyan-900/45 via-indigo-900/30 to-fuchsia-900/45 backdrop-blur-md xl:block">
        <div className="edge-ticker-y-reverse flex h-[200%] flex-col gap-6 px-1.5 py-3">
          {loopedStories.map((story, index) => (
            <TickerRailChip key={`right-${story.id}-${index}`} story={story} />
          ))}
        </div>
      </div>
    </>
  )
}

function TickerChip({ story }: { story: TickerStory }) {
  const tone = TICKER_TONE_CLASSES[story.tone]
  const textValue = `${story.source} // ${story.label}`
  if (!story.href)
    return (
      <span
        className={`edge-ticker-chip-glow shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.16em] ${tone.idle}`}
      >
        <span className="mr-2 rounded-full bg-black/30 px-1.5 py-0 text-[10px] font-black">{story.topic}</span>
        {textValue}
      </span>
    )

  return (
    <a
      href={story.href}
      target="_blank"
      rel="noreferrer"
      className={`edge-ticker-chip-glow pointer-events-auto shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.16em] transition ${tone.active}`}
    >
      <span className="mr-2 rounded-full bg-black/35 px-1.5 py-0 text-[10px] font-black">{story.topic}</span>
      {textValue}
    </a>
  )
}

function TickerRailChip({ story }: { story: TickerStory }) {
  const tone = TICKER_TONE_CLASSES[story.tone]
  const textValue = `${story.topic} // ${story.source}`
  if (!story.href)
    return (
      <span
        className={`[writing-mode:vertical-rl] edge-ticker-chip-glow shrink-0 rounded-full border px-1 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${tone.idle}`}
      >
        {textValue}
      </span>
    )

  return (
    <a
      href={story.href}
      target="_blank"
      rel="noreferrer"
      className={`[writing-mode:vertical-rl] edge-ticker-chip-glow pointer-events-auto shrink-0 rounded-full border px-1 py-1 text-[10px] font-bold uppercase tracking-[0.16em] transition ${tone.active}`}
    >
      {textValue}
    </a>
  )
}

function decodeTextEntity(value: string): string {
  return value
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '-')
    .replace(/&amp;/g, '&')
}

function getTickerTone(topic?: string): TickerTone {
  const normalizedTopic = String(topic || '').toLowerCase()
  if (normalizedTopic.includes('hip') || normalizedTopic.includes('rap')) return 'amber'
  if (normalizedTopic.includes('gossip') || normalizedTopic.includes('pop')) return 'rose'
  if (normalizedTopic.includes('industry') || normalizedTopic.includes('business')) return 'violet'
  if (normalizedTopic.includes('local')) return 'teal'
  if (normalizedTopic.includes('electronic') || normalizedTopic.includes('dance')) return 'indigo'
  return 'cyan'
}

function ShoutTimeline({ items }: { items: NewsFeedItem[] }) {
  if (!items.length) return null

  const events = items.slice(0, 8).map((item, index) => ({
    id: `${item.id}-${index}`,
    timeLabel: formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true }).toUpperCase(),
    label: item.title.toUpperCase(),
    source: item.sourceName.toUpperCase()
  }))

  const loopedEvents = [...events, ...events]

  return (
    <section className="relative z-10 mt-8 overflow-hidden border border-fuchsia-200/35 bg-fuchsia-300/10 py-4 backdrop-blur-xl"
      style={{ clipPath: 'polygon(0 20%, 96% 0, 100% 80%, 5% 100%)' }}>
      <div className="mb-3 px-4 text-xs font-black uppercase tracking-[0.2em] text-fuchsia-100 md:px-6">
        Timesheet of Chaos // Live
      </div>
      <div className="shout-track flex w-[200%] gap-3 px-3 md:gap-4 md:px-6">
        {loopedEvents.map((event, index) => (
          <div
            key={`${event.id}-${index}`}
            className="shout-item shrink-0 border border-cyan-200/45 bg-cyan-200/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white md:text-sm"
            style={{
              clipPath: SHOUT_CLIP_PATHS[index % SHOUT_CLIP_PATHS.length],
              transform: `rotate(${(index % 5) - 2}deg)`
            }}
          >
            <span className="mr-2 text-fuchsia-100">{event.timeLabel}</span>
            <span className="mr-2 text-cyan-100">!!!</span>
            <span>{event.label}</span>
            <span className="ml-2 text-fuchsia-100">[{event.source}]</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function GlassShardCard({ item, index }: { item: NewsFeedItem; index: number }) {
  const paneClipPath = SHARD_CLIP_PATHS[index % SHARD_CLIP_PATHS.length]
  const isExternalLink = Boolean(item.url)
  const [imageSrc, setImageSrc] = useState(() => getPrimaryCardImageUrl({ item, index }))

  return (
    <article
      className="group relative min-h-[280px] overflow-hidden border border-white/20 bg-white/10 backdrop-blur-2xl"
      style={{ clipPath: paneClipPath }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/10 to-transparent" />

      <img
        src={imageSrc}
        alt={item.title}
        loading="lazy"
        onError={() => setImageSrc(getFallbackCardImageUrl(item))}
        className="absolute inset-0 h-full w-full object-cover opacity-80 saturate-[1.2] brightness-[1.05] transition duration-700 group-hover:scale-[1.08] group-hover:saturate-[1.35]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/15" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_52%)]" />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-slate-300">
          <span>{item.sourceName}</span>
          <span>{formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}</span>
        </div>

        <div className="space-y-2">
          <h2 className="line-clamp-2 text-lg font-bold leading-tight text-white md:text-xl">{item.title}</h2>
          <p className="line-clamp-3 text-sm text-slate-200">{item.summary}</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {item.topics.slice(0, 2).map(topic => (
              <span key={topic} className="rounded-full border border-white/25 bg-black/35 px-2 py-0.5 text-xs text-cyan-100">
                {topic}
              </span>
            ))}
          </div>

          {isExternalLink && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/20"
            >
              Open
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

function getPrimaryCardImageUrl(params: { item: NewsFeedItem; index: number }): string {
  if (params.item.imageUrl) return params.item.imageUrl
  const seed = toImageSeed(`${params.item.sourceName}-${params.item.topics[0] || 'music'}-${params.index}`)
  return `https://picsum.photos/seed/${seed}/900/1200`
}

function getFallbackCardImageUrl(item: NewsFeedItem): string {
  const topicLabel = item.topics[0] || 'Music'
  const sourceLabel = item.sourceName || 'Pulse'
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1200'>
    <defs>
      <linearGradient id='bg' x1='0%' y1='0%' x2='100%' y2='100%'>
        <stop offset='0%' stop-color='#1e1b4b'/>
        <stop offset='45%' stop-color='#7e22ce'/>
        <stop offset='100%' stop-color='#0f172a'/>
      </linearGradient>
      <radialGradient id='glow' cx='20%' cy='10%' r='75%'>
        <stop offset='0%' stop-color='rgba(255,255,255,0.45)'/>
        <stop offset='100%' stop-color='rgba(255,255,255,0)'/>
      </radialGradient>
    </defs>
    <rect width='900' height='1200' fill='url(#bg)'/>
    <rect width='900' height='1200' fill='url(#glow)'/>
    <text x='70' y='980' fill='rgba(255,255,255,0.9)' font-size='72' font-family='Inter, Arial, sans-serif' font-weight='700'>${escapeSvgText(topicLabel)}</text>
    <text x='70' y='1050' fill='rgba(255,255,255,0.7)' font-size='40' font-family='Inter, Arial, sans-serif'>${escapeSvgText(sourceLabel)}</text>
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

interface TickerStory {
  id: string
  label: string
  source: string
  topic: string
  href?: string
  tone: TickerTone
}

type TickerTone = keyof typeof TICKER_TONE_CLASSES

const TICKER_TONE_CLASSES = {
  cyan: {
    idle: 'border-cyan-200/40 bg-cyan-300/10 text-cyan-100/90',
    active: 'border-cyan-200/55 bg-cyan-300/15 text-cyan-100 hover:bg-cyan-300/25 hover:text-white'
  },
  fuchsia: {
    idle: 'border-fuchsia-200/40 bg-fuchsia-300/10 text-fuchsia-100/90',
    active: 'border-fuchsia-200/55 bg-fuchsia-300/15 text-fuchsia-100 hover:bg-fuchsia-300/25 hover:text-white'
  },
  violet: {
    idle: 'border-violet-200/40 bg-violet-300/10 text-violet-100/90',
    active: 'border-violet-200/55 bg-violet-300/15 text-violet-100 hover:bg-violet-300/25 hover:text-white'
  },
  teal: {
    idle: 'border-teal-200/40 bg-teal-300/10 text-teal-100/90',
    active: 'border-teal-200/55 bg-teal-300/15 text-teal-100 hover:bg-teal-300/25 hover:text-white'
  },
  rose: {
    idle: 'border-rose-200/40 bg-rose-300/10 text-rose-100/90',
    active: 'border-rose-200/55 bg-rose-300/15 text-rose-100 hover:bg-rose-300/25 hover:text-white'
  },
  amber: {
    idle: 'border-amber-200/45 bg-amber-300/10 text-amber-100/90',
    active: 'border-amber-200/60 bg-amber-300/15 text-amber-100 hover:bg-amber-300/25 hover:text-white'
  },
  indigo: {
    idle: 'border-indigo-200/45 bg-indigo-300/10 text-indigo-100/90',
    active: 'border-indigo-200/60 bg-indigo-300/15 text-indigo-100 hover:bg-indigo-300/25 hover:text-white'
  }
} as const

const SHARD_CLIP_PATHS = [
  'polygon(0 4%, 95% 0, 100% 88%, 7% 100%)',
  'polygon(4% 0, 100% 8%, 92% 100%, 0 94%)',
  'polygon(0 0, 92% 5%, 100% 100%, 8% 92%)',
  'polygon(6% 2%, 100% 0, 96% 95%, 0 100%)',
  'polygon(0 10%, 90% 0, 100% 85%, 12% 100%)',
  'polygon(0 0, 100% 12%, 90% 100%, 2% 88%)'
]

const SHOUT_CLIP_PATHS = [
  'polygon(0 14%, 94% 0, 100% 88%, 8% 100%)',
  'polygon(6% 0, 100% 18%, 92% 100%, 0 84%)',
  'polygon(0 0, 92% 6%, 100% 100%, 4% 92%)',
  'polygon(10% 0, 100% 8%, 90% 100%, 0 74%)'
]

async function fetchNewsPage(params: {
  facet: NewsFacet
  cursor?: string
  query?: string
}): Promise<NewsFeedResponse> {
  const url = new URL('/api/news/feed', window.location.origin)
  url.searchParams.set('limit', '20')
  url.searchParams.set('facet', params.facet)
  if (params.cursor) url.searchParams.set('cursor', params.cursor)
  if (params.query?.trim()) url.searchParams.set('query', params.query.trim())

  const response = await fetch(url.toString())
  if (!response.ok) throw new Error('Failed to fetch news feed')
  return response.json()
}
