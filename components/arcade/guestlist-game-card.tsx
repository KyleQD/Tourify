'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, Gamepad2, Music2, Play, Ticket, X } from 'lucide-react'
import { useJukeboxOptional } from '@/contexts/jukebox-context'
import type { GuestlistFrequency, GuestlistGameId } from '@/lib/feed/guestlist-games'

const GuestlistGameSession = dynamic(
  () => import('./guestlist-game-session').then(module => module.GuestlistGameSession),
  { ssr: false, loading: () => <div role="status" className="py-8 text-center text-sm text-fuchsia-100">Loading Guestlist challenge…</div> },
)

interface GuestlistGameCardProps {
  game: GuestlistGameId
  frequency: GuestlistFrequency
  onFrequencyChange: (frequency: GuestlistFrequency) => void
}

const DETAILS = {
  'beat-deck': {
    title: 'Beat Deck: 20-second jam',
    kicker: 'RHYTHM CHALLENGE',
    description: 'Match four colored notes with D F J K. How high can you score in 20 seconds?',
    href: '/arcade/beat-deck',
    duration: '20 SEC',
    accent: 'text-pink-200',
    Icon: Music2,
  },
  'dj-odyssey': {
    title: 'DJ Odyssey: Santa Barbara Sprint',
    kicker: 'SUNSET SIDE QUEST',
    description: 'Grab records, dodge beach waves, and earn your spot on the guestlist at EOS Lounge.',
    href: '/arcade/dj-quest',
    duration: '30 SEC',
    accent: 'text-amber-200',
    Icon: Gamepad2,
  },
} as const

export function GuestlistGameCard({ game, frequency, onFrequencyChange }: GuestlistGameCardProps) {
  const [started, setStarted] = useState(false)
  const jukebox = useJukeboxOptional()
  const detail = DETAILS[game]
  const Icon = detail.Icon

  const start = () => {
    // This is an explicit user action. An active jukebox song must not compete
    // with gameplay; the user can resume it afterwards.
    if (jukebox?.state.isPlaying) jukebox.pause()
    setStarted(true)
  }

  return (
    <section aria-label="Guestlist Games feed break"
      className="relative isolate overflow-hidden rounded-[26px] border border-fuchsia-300/25 bg-gradient-to-br from-[#2c164a] via-[#181b42] to-[#123b50] p-4 text-white shadow-[0_14px_42px_rgba(12,8,35,0.22)] sm:p-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
            <Ticket className="h-4 w-4" aria-hidden="true" /> Guestlist Games
          </p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 font-bold text-white/85">{detail.duration}</span>
            <Link href="/arcade" className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/15 px-2 text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">All games <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        {started ? (
          <GuestlistGameSession game={game} onExit={() => setStarted(false)} />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/40 to-sky-400/30">
                <Icon className={'h-9 w-9 ' + detail.accent} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/60">{detail.kicker}</p>
                <h3 className="mt-1 text-lg font-black leading-tight sm:text-xl">{detail.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/75">{detail.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={start}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-fuchsia-500 px-4 text-sm font-black text-white transition-colors hover:bg-fuchsia-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <Play className="h-4 w-4" fill="currentColor" /> Play now
              </button>
              <Link href={detail.href} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-white/20 px-3 text-xs font-bold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                Full adventure <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-[11px] leading-relaxed text-white/55">Free mini-game. It only starts when you choose Play, and makes no sound.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <span className="text-[11px] text-white/55">A little music break between posts · Not a sponsored post</span>
          <div className="flex items-center gap-2">
            {frequency === 'normal' && <button type="button" onClick={() => onFrequencyChange('fewer')}
              className="min-h-9 rounded-lg px-2 text-[11px] font-semibold text-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">Show fewer</button>}
            <button type="button" onClick={() => onFrequencyChange('off')}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-white/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              aria-label="Hide Guestlist Games from your feed"><X className="h-3.5 w-3.5" /> Hide games</button>
          </div>
        </div>
      </div>
    </section>
  )
}
