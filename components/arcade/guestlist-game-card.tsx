'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, Gamepad2, Music2, Play, Ticket, X } from 'lucide-react'
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
  const [activeGame, setActiveGame] = useState<GuestlistGameId>(game)
  const [rotationSeconds, setRotationSeconds] = useState<number | null>(null)
  const detail = DETAILS[activeGame]
  const Icon = detail.Icon

  const nextGame = activeGame === 'beat-deck' ? 'dj-odyssey' : 'beat-deck'
  const nextDetail = DETAILS[nextGame]

  // The challenge itself is rendered only after a deliberate Play. A completed
  // card rotates to the *preview* of the next game, never silently autoplaying.
  useEffect(() => {
    if (rotationSeconds === null) return
    if (rotationSeconds <= 0) {
      setActiveGame(nextGame)
      setStarted(false)
      setRotationSeconds(null)
      return
    }
    const interval = window.setTimeout(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setRotationSeconds(seconds => seconds === null ? null : seconds - 1)
    }, 1000)
    return () => window.clearTimeout(interval)
  }, [rotationSeconds, nextGame])

  const cycleNow = () => {
    setActiveGame(nextGame)
    setStarted(false)
    setRotationSeconds(null)
  }

  const start = () => { 
    setRotationSeconds(null)
    // Mini-games are silent. Preserve existing jukebox music and queue;
    // the full-size games handle their own audio policies separately.
    setStarted(true)
  }

  return (
    <section aria-label="Guestlist Games feed break"
      className="relative isolate overflow-hidden rounded-[26px] border border-fuchsia-300/30 bg-gradient-to-br from-[#29163f] via-[#161b40] to-[#113d4b] p-3 text-white shadow-[0_14px_42px_rgba(12,8,35,0.22)] sm:p-5">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-fuchsia-400/10 blur-3xl" />
      <div className="relative space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-fuchsia-200">
            <Ticket className="h-4 w-4" aria-hidden="true" /> Guestlist Games
          </p>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 font-bold text-white/85">{detail.duration} · MINI GAME</span>
            <Link href="/arcade" className="inline-flex min-h-9 items-center gap-1 rounded-full border border-white/15 px-2 text-white/80 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">All games <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
        {started ? (
          <GuestlistGameSession key={activeGame} game={activeGame}
            onExit={() => { setStarted(false); setRotationSeconds(null) }}
            onFinished={() => setRotationSeconds(7)}
            onNext={cycleNow}
            nextGameLabel={nextDetail.title}
            onStay={() => setRotationSeconds(null)}
            rotationSeconds={rotationSeconds} />
        ) : (
          <div className="space-y-3">
            <div className={'relative overflow-hidden rounded-2xl border border-white/15 ' + (activeGame === 'beat-deck' ? 'bg-[#101329]' : 'bg-gradient-to-b from-[#2b5681] via-[#d18898] to-[#238f9b]')}>
              <div className="relative flex h-40 items-end justify-center gap-2 overflow-hidden px-5 pb-4 sm:h-44" aria-hidden="true">
                {activeGame === 'beat-deck' ? (
                  <div className="flex h-full w-full max-w-[330px] items-stretch gap-2 pt-3">
                    {['D','F','J','K'].map((lane, i) => <div key={lane} className="relative flex-1 rounded-lg border border-white/10 bg-white/5">
                      <span className="absolute left-[18%] right-[18%] h-3 rounded-full shadow-lg" style={{ top: (18 + i % 3 * 19) + '%', backgroundColor: ['#f472b6','#38bdf8','#fbbf24','#a78bfa'][i] }} />
                      <span className="absolute bottom-1 left-1 right-1 rounded-md border border-white/25 bg-white/10 py-1 text-center text-xs font-black">{lane}</span>
                    </div>)}
                  </div>
                ) : (
                  <>
                    <div className="absolute right-9 top-4 h-10 w-10 rounded-full bg-amber-200/80" />
                    <div className="absolute inset-x-0 bottom-0 h-9 bg-[#25578d]" />
                    <div className="absolute inset-x-0 bottom-8 h-5 bg-[#e6b886]" />
                    <div className="absolute bottom-13 left-9 h-12 w-9 rounded-t-lg border-2 border-pink-200 bg-fuchsia-500 text-center text-xs font-black leading-[44px]">DJ</div>
                    <div className="absolute bottom-12 right-[38%] text-3xl">💿</div>
                    <div className="absolute bottom-12 right-[20%] text-3xl">🌊</div>
                    <div className="absolute left-3 top-3 rounded-full bg-black/30 px-2 py-1 text-[10px] font-bold">SANTA BARBARA → EOS</div>
                  </>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-[#0c0b22]/20">
                <button type="button" onClick={start}
                  className="inline-flex min-h-14 items-center gap-3 rounded-full border border-white/55 bg-[#240f40]/90 px-6 text-sm font-black text-white shadow-xl hover:bg-[#451968] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                  <Play className="h-5 w-5" fill="currentColor" /> Play in feed
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/40 to-sky-400/30">
                <Icon className={'h-6 w-6 ' + detail.accent} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/60">{detail.kicker}</p>
                <h3 className="mt-1 text-lg font-black leading-tight sm:text-xl">{detail.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-white/75">{detail.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">

              <Link href={detail.href + (activeGame === 'dj-odyssey' ? '?chapter=eos' : '')} className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-white/20 px-3 text-xs font-bold hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                Full adventure <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="text-[11px] leading-relaxed text-white/55">Play instantly in your feed. Silent mini-game, no autoplay, jukebox keeps playing. Finishing reveals the next challenge.</p>
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
