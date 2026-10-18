'use client'

import Link from 'next/link'
import { CalendarDays, ChevronRight, Disc3, Images, Mic2, Sparkles } from 'lucide-react'
import { buildFeedDiscovery, type FeedDiscoveryKind, type FeedDiscoveryMode, type FeedDiscoveryPost } from '@/lib/feed/feed-discovery'

interface FeedDiscoveryRailProps {
  posts: readonly FeedDiscoveryPost[]
  mode?: FeedDiscoveryMode
}

const copy = {
  highlights: {
    eyebrow: 'THE SCENE',
    title: 'Fresh from your feed',
    description: 'A little music, a little magic, and the people making it happen.',
    href: '/discover',
    cta: 'Explore',
  },
  events: {
    eyebrow: 'ON THE BILL',
    title: 'Events in the mix',
    description: 'Shows and experiences shared with your feed.',
    href: '/events',
    cta: 'Explore events',
  },
  music: {
    eyebrow: 'TURN IT UP',
    title: 'Hear something new',
    description: 'Tracks shared by the Tourify community.',
    href: '/music',
    cta: 'Explore music',
  },
  artists: {
    eyebrow: 'MEET THE CREATORS',
    title: 'Artists to discover',
    description: 'Meet the artists showing up in your feed.',
    href: '/discover/users',
    cta: 'Find people',
  },
} satisfies Record<FeedDiscoveryMode, {
  eyebrow: string
  title: string
  description: string
  href: string
  cta: string
}>

const accent: Record<FeedDiscoveryKind, string> = {
  event: 'from-orange-700/90 via-rose-700/60 to-fuchsia-950/90',
  music: 'from-violet-700/90 via-indigo-700/60 to-sky-950/90',
  artist: 'from-pink-700/90 via-purple-700/60 to-indigo-950/90',
  moment: 'from-cyan-700/90 via-blue-700/60 to-purple-950/90',
}

const category: Record<FeedDiscoveryKind, string> = {
  event: 'Event',
  music: 'New music',
  artist: 'Artist',
  moment: 'Moment',
}

function KindIcon({ kind }: { kind: FeedDiscoveryKind }) {
  switch (kind) {
    case 'event': return <CalendarDays aria-hidden="true" className="h-7 w-7" />
    case 'music': return <Disc3 aria-hidden="true" className="h-7 w-7" />
    case 'artist': return <Mic2 aria-hidden="true" className="h-7 w-7" />
    default: return <Images aria-hidden="true" className="h-7 w-7" />
  }
}

export function FeedDiscoveryRail({ posts, mode = 'highlights' }: FeedDiscoveryRailProps) {
  const items = buildFeedDiscovery(posts, mode, mode === 'highlights' ? 7 : 5)
  // Avoid empty widgets and fake seeded content for users with a new account.
  if (items.length === 0) return null

  const section = copy[mode]

  return (
    <section
      aria-label={section.title}
      className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-950/80 via-[#111126] to-purple-950/65 p-4 text-white shadow-[0_20px_55px_rgba(20,10,50,0.15)] sm:p-5"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold tracking-[0.22em] text-fuchsia-300">
            <Sparkles aria-hidden="true" className="h-3 w-3" />
            {section.eyebrow}
          </div>
          <h3 className="text-lg font-black tracking-tight sm:text-xl">{section.title}</h3>
          <p className="mt-1 max-w-md text-xs text-white/55">{section.description}</p>
        </div>
        <Link
          href={section.href}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
        >
          {section.cta}
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
        </Link>
      </div>

      <div
        className="-mb-2 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3"
        role="list"
        aria-label={section.title + ' carousel'}
      >
        {items.map((item) => (
          <div key={item.id} role="listitem" className="w-[154px] shrink-0 snap-start sm:w-[188px]">
            <Link
              href={item.href}
              className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[22px] border border-white/15 bg-[#242038] p-3 shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 motion-reduce:transform-none sm:p-4"
              aria-label={category[item.kind] + ': ' + item.title}
            >
              <div className={'absolute inset-0 bg-gradient-to-br ' + accent[item.kind]} aria-hidden="true" />
              {item.imageUrl ? (
                // Remote user-uploaded content can be on signed storage URLs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  onError={(event) => { event.currentTarget.style.display = 'none' }}
                  className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-500 motion-safe:group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/45" aria-hidden="true">
                  <KindIcon kind={item.kind} />
                </div>
              )}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#070615] via-[#09081a]/40 to-black/10" />
              <span className="relative mb-auto w-fit rounded-full border border-white/25 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                {category[item.kind]}
              </span>
              <span className="relative line-clamp-2 text-sm font-black leading-snug drop-shadow-lg sm:text-base">{item.title}</span>
              <span className="relative mt-1 line-clamp-2 text-[11px] text-white/75">{item.subtitle}</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
