'use client'

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, Pause, Play, RotateCcw, X } from 'lucide-react'
import type { GuestlistGameId } from '@/lib/feed/guestlist-games'

type Phase = 'playing' | 'paused' | 'finished'
const GAME_SECONDS: Record<GuestlistGameId, number> = { 'beat-deck': 20, 'dj-odyssey': 30 }
const NOTE_KEYS = ['d', 'f', 'j', 'k'] as const
const LANE_SEQUENCE = [0, 2, 1, 3, 2, 0, 3, 1, 0, 3, 2, 1, 3, 0, 1, 2] as const
const NOTE_COLORS = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa'] as const
const HAZARD_SECONDS = [5, 9, 13, 18, 23, 27] as const
const VINYL_SECONDS = [2, 4, 7, 11, 14, 17, 20, 24, 28] as const
const JUMP_MS = 950

function noteLane(index: number): number {
  return LANE_SEQUENCE[index % LANE_SEQUENCE.length]
}

function noteTime(index: number): number {
  return 1200 + index * 650
}

function getJumpHeight(time: number, started: number): number {
  const age = time - started
  if (age < 0 || age >= JUMP_MS) return 0
  return Math.sin(age / JUMP_MS * Math.PI) * 84
}

const BEST_KEY = (game: GuestlistGameId) => 'tourify:guestlist-games:best:v1:' + game

interface GuestlistGameSessionProps {
  game: GuestlistGameId
  onExit: () => void
  onFinished: () => void
  onNext: () => void
  nextGameLabel: string
  onStay: () => void
  rotationSeconds: number | null
}

export function GuestlistGameSession({ game, onExit, onFinished, onNext, nextGameLabel, onStay, rotationSeconds }: GuestlistGameSessionProps) {
  const rootRef = useRef<HTMLElement>(null)
  const finishedCallbackRef = useRef(onFinished)
  finishedCallbackRef.current = onFinished
  const clockOriginRef = useRef(0)
  const elapsedBaseRef = useRef(0)
  const elapsedRef = useRef(0)
  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const livesRef = useRef(3)
  const jumpStartedRef = useRef(Number.NEGATIVE_INFINITY)
  const handledNotesRef = useRef(new Set<number>())
  const laneFlashTimerRef = useRef<number | null>(null)
  const handledObstaclesRef = useRef(new Set<string>())
  const [phase, setPhase] = useState<Phase>('playing')
  const [elapsed, setElapsed] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [activeLane, setActiveLane] = useState<number | null>(null)
  const [lives, setLives] = useState(3)
  const [feedback, setFeedback] = useState(game === 'beat-deck' ? 'Hit D F J K as notes reach the target!' : 'Jump over the waves and collect records!')
  const [best, setBest] = useState(0)
  const duration = GAME_SECONDS[game] * 1000
  const fullGameUrl = game === 'beat-deck' ? '/arcade/beat-deck' : '/arcade/dj-quest?chapter=eos'

  useEffect(() => {
    if (phase === 'finished') finishedCallbackRef.current()
  }, [phase])

  useEffect(() => () => {
    if (laneFlashTimerRef.current !== null) window.clearTimeout(laneFlashTimerRef.current)
  }, [])

  useEffect(() => {
    try { setBest(Math.max(0, Number(localStorage.getItem(BEST_KEY(game))) || 0)) }
    catch { /* private browsing still supports gameplay */ }
    rootRef.current?.focus({ preventScroll: true })
  }, [game])

  const finish = () => {
    elapsedBaseRef.current = duration
    elapsedRef.current = duration
    setElapsed(duration)
    setPhase('finished')
    const result = scoreRef.current
    setBest(previous => {
      const next = Math.max(previous, result)
      try { localStorage.setItem(BEST_KEY(game), String(next)) } catch { /* optional */ }
      return next
    })
  }

  const pause = () => {
    if (phase !== 'playing') return
    const next = Math.min(duration, elapsedBaseRef.current + performance.now() - clockOriginRef.current)
    elapsedBaseRef.current = next
    elapsedRef.current = next
    setElapsed(next)
    setPhase('paused')
  }

  const resume = () => {
    if (phase !== 'paused') return
    setPhase('playing')
    rootRef.current?.focus({ preventScroll: true })
  }

  const reset = () => {
    elapsedBaseRef.current = 0
    elapsedRef.current = 0
    scoreRef.current = 0
    comboRef.current = 0
    livesRef.current = 3
    jumpStartedRef.current = Number.NEGATIVE_INFINITY
    handledNotesRef.current.clear()
    handledObstaclesRef.current.clear()
    setElapsed(0); setScore(0); setCombo(0); setLives(3); setActiveLane(null)
    setFeedback(game === 'beat-deck' ? 'Follow the falling notes!' : 'Jump over the waves!')
    setPhase('playing')
    rootRef.current?.focus({ preventScroll: true })
  }

  // The timer exists only while the player intentionally plays. There is no
  // autoplay, no Web Audio and no perpetual animation loop offscreen.
  useEffect(() => {
    if (phase !== 'playing') return
    clockOriginRef.current = performance.now()
    const interval = window.setInterval(() => {
      const time = Math.min(duration, elapsedBaseRef.current + performance.now() - clockOriginRef.current)
      elapsedRef.current = time
      setElapsed(time)
      if (game === 'dj-odyssey') {
        for (const at of VINYL_SECONDS) {
          const id = 'vinyl:' + at
          if (time < at * 1000 || handledObstaclesRef.current.has(id)) continue
          handledObstaclesRef.current.add(id)
          scoreRef.current += 100
          setScore(scoreRef.current)
          setFeedback('✦ Vinyl collected! +100')
        }
        for (const at of HAZARD_SECONDS) {
          const id = 'wave:' + at
          if (time < at * 1000 || handledObstaclesRef.current.has(id)) continue
          handledObstaclesRef.current.add(id)
          const jumpHeight = getJumpHeight(at * 1000, jumpStartedRef.current)
          if (jumpHeight >= 24) {
            scoreRef.current += 150
            setScore(scoreRef.current)
            setFeedback('✦ Nice jump! +150')
          } else {
            livesRef.current -= 1
            setLives(livesRef.current)
            setFeedback('Wave hit! Press JUMP before the next wave.')
            if (livesRef.current <= 0) {
              elapsedBaseRef.current = time
              setPhase('finished')
              const result = scoreRef.current
              setBest(previous => {
                const next = Math.max(previous, result)
                try { localStorage.setItem(BEST_KEY(game), String(next)) } catch {}
                return next
              })
              return
            }
          }
        }
      }
      if (time >= duration) finish()
    }, 50)
    return () => window.clearInterval(interval)
  }, [phase, game, duration])

  // Scrolling an active card away or switching tabs pauses immediately.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(
      entries => {
        if (entries[0] && entries[0].intersectionRatio < 0.12) {
          // React's event handler is refreshed each render. For an active run,
          // compute exact elapsed from refs to avoid clock loss on pause.
          if (phase === 'playing') pause()
        }
      },
      { threshold: [0, 0.12, 0.5] },
    )
    observer?.observe(root)
    const onHidden = () => { if (document.hidden && phase === 'playing') pause() }
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [phase])

  const hit = (lane: number) => {
    if (game !== 'beat-deck' || phase !== 'playing') return
    setActiveLane(lane)
    if (laneFlashTimerRef.current !== null) window.clearTimeout(laneFlashTimerRef.current)
    laneFlashTimerRef.current = window.setTimeout(() => setActiveLane(null), 175)
    const t = elapsedRef.current
    const index = Math.max(0, Math.round((t - 1200) / 650))
    const delta = Math.abs(t - noteTime(index))
    if (delta > 235 || noteLane(index) !== lane || handledNotesRef.current.has(index)) {
      comboRef.current = 0
      setCombo(0)
      setFeedback(NOTE_KEYS[lane].toUpperCase() + ' registered · wait for the matching note')
      return
    }
    handledNotesRef.current.add(index)
    comboRef.current += 1
    const pts = delta <= 105 ? 120 : 80
    scoreRef.current += pts
    setScore(scoreRef.current)
    setCombo(comboRef.current)
    setFeedback(NOTE_KEYS[lane].toUpperCase() + (delta <= 105 ? ' ✦ PERFECT +120' : ' ✓ NICE +80'))
  }

  const jump = () => {
    if (game !== 'dj-odyssey' || phase !== 'playing') return
    const t = elapsedRef.current
    if (getJumpHeight(t, jumpStartedRef.current) > 0) return
    if (t - jumpStartedRef.current < JUMP_MS) return
    jumpStartedRef.current = t
    setFeedback('↑ Jump! Time your landing before the next wave.')
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.matches('input, textarea, select, [contenteditable="true"]') || target.closest('[contenteditable="true"],[role="textbox"]')) return
    if (event.repeat) return
    const key = event.key.toLowerCase()
    if (game === 'beat-deck') {
      const lane = NOTE_KEYS.indexOf(key as typeof NOTE_KEYS[number])
      if (lane !== -1 && phase === 'playing') {
        event.preventDefault()
        hit(lane)
      }
    } else if ((key === ' ' || key === 'arrowup' || key === 'w') && phase === 'playing') {
      event.preventDefault()
      jump()
    }
  }

  const nearbyNotes = game === 'beat-deck'
    ? Array.from({ length: 6 }, (_, i) => Math.max(0, Math.floor((elapsed - 1200) / 650) - 1 + i))
        .filter((index, i, all) => all.indexOf(index) === i)
        .filter(index => noteTime(index) <= duration && noteTime(index) >= elapsed - 300 && noteTime(index) <= elapsed + 1400)
    : []
  const nearbyObstacles = game === 'dj-odyssey'
    ? [
      ...HAZARD_SECONDS.map((at, i) => ({ at, kind: 'wave' as const, id: 'wave:' + at, index: i })),
      ...VINYL_SECONDS.map((at, i) => ({ at, kind: 'vinyl' as const, id: 'vinyl:' + at, index: i })),
    ].filter(obstacle => !handledObstaclesRef.current.has(obstacle.id) && obstacle.at * 1000 >= elapsed - 800 && obstacle.at * 1000 < elapsed + 3300)
    : []
  const jumpHeight = getJumpHeight(elapsed, jumpStartedRef.current)

  return (
    <section ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown}
      className="space-y-3 outline-none" aria-label={game === 'beat-deck' ? 'Guestlist Games Beat Deck quick challenge' : 'Guestlist Games DJ Odyssey Santa Barbara Sprint'}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white/85">
        <span>{game === 'beat-deck' ? '🎵 BEAT DECK · 20-SECOND JAM' : '🌴 DJ ODYSSEY · SANTA BARBARA SPRINT'}</span>
        <span className="tabular-nums">{Math.ceil(Math.max(0, duration - elapsed) / 1000)}s · {score} pts {game === 'beat-deck' ? '· ' + combo + ' combo' : '· ' + '♥'.repeat(Math.max(0, lives))}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar"
        aria-label="Challenge time elapsed" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={Math.floor(elapsed)}>
        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-amber-300" style={{ width: elapsed / duration * 100 + '%' }} />
      </div>
      {game === 'beat-deck' ? (
        <div className="space-y-2">
          <div className="relative grid h-44 grid-cols-4 gap-1 overflow-hidden rounded-xl border border-white/15 bg-slate-950/75 p-2 sm:h-48"
            aria-label="Four note lanes, press D F J K when a matching note reaches the bottom">
            {NOTE_KEYS.map((key, lane) => (
              <div key={key} className="relative rounded-lg border border-white/10 bg-white/[0.035]">
                {nearbyNotes.filter(index => noteLane(index) === lane && !handledNotesRef.current.has(index)).map(index => {
                  // Note center meets the bright bottom hit line at its scheduled beat.
                  const pct = Math.max(0, Math.min(74, 74 + (elapsed - noteTime(index)) / 1300 * 74))
                  return <span key={index} className="absolute left-[12%] right-[12%] h-4 rounded-full shadow-lg"
                    style={{ top: pct + '%', backgroundColor: NOTE_COLORS[lane], boxShadow: '0 0 16px ' + NOTE_COLORS[lane] }} />
                })}
                <span className="absolute bottom-1 left-1 right-1 rounded-md border border-white/35 bg-white/10 py-1 text-center text-xs font-black text-white">{key.toUpperCase()}</span>
              </div>
            ))}
            <div className="pointer-events-none absolute bottom-10 left-2 right-2 h-0.5 bg-amber-200/90" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {NOTE_KEYS.map((key, lane) => (
              <button key={key} type="button" disabled={phase !== 'playing'} aria-label={'Hit ' + key.toUpperCase() + ' rhythm lane'}
                onPointerDown={event => { event.preventDefault(); hit(lane) }}
                onClick={event => { if (event.detail === 0) hit(lane) }}
                className={'min-h-12 touch-manipulation rounded-xl border-2 font-black text-white active:bg-white/30 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ' + (activeLane === lane ? 'bg-white/35 ring-2 ring-white/80' : 'bg-white/10')}
                style={{ borderColor: NOTE_COLORS[lane] }}>
                {key.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative h-44 overflow-hidden rounded-xl border border-sky-300/20 bg-gradient-to-b from-[#2e4376] via-[#d88e91] to-[#59bbc6] sm:h-48"
            aria-label="Santa Barbara Sprint. Automatically running DJ collects records; jump when the waves approach.">
            <div className="absolute bottom-9 left-0 right-0 h-6 bg-[#e2bb82]" />
            <div className="absolute bottom-0 left-0 right-0 h-9 bg-[#315c93]" />
            <div className="absolute right-5 top-3 text-4xl opacity-60" aria-hidden="true">☀</div>
            <div className="absolute bottom-8 left-[12%] z-10 flex h-12 w-9 items-center justify-center rounded-t-xl border-2 border-fuchsia-200 bg-fuchsia-500 text-xs font-black text-white"
              style={{ transform: 'translateY(' + -jumpHeight + 'px)' }} aria-hidden="true">DJ</div>
            {nearbyObstacles.map(item => {
              const left = 12 + (item.at * 1000 - elapsed) / 3000 * 88
              return <div key={item.id} className="absolute bottom-9 text-2xl"
                style={{ left: left + '%' }} aria-hidden="true">
                {item.kind === 'wave' ? '🌊' : '💿'}
              </div>
            })}
            <div className="absolute left-3 top-3 rounded-full bg-black/35 px-2 py-1 text-[11px] font-semibold text-white">EOS Lounge · Santa Barbara</div>
            <div className="absolute bottom-1 right-2 text-[10px] text-white/85">SUNSET COAST</div>
          </div>
          <button type="button" onClick={jump} disabled={phase !== 'playing'}
            className="min-h-12 w-full touch-manipulation rounded-xl bg-sky-500 px-4 font-black text-white active:bg-sky-400 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            aria-label="Jump over wave obstacle">↑ JUMP <span className="ml-1 text-xs opacity-90">(W / SPACE / ↑)</span></button>
        </div>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-xs font-semibold text-fuchsia-100">{feedback}</p>
      {phase === 'finished' && (
        <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-3 text-sm text-white" role="status">
          <p className="font-black">{game === 'dj-odyssey' && lives <= 0 ? 'The waves got you!' : '🎉 Guestlist Challenge complete!'}</p>
          <p className="mt-1">Your score: <strong>{score}</strong> · Best on this device: <strong>{Math.max(score, best)}</strong></p>
          <p className="mt-1 text-xs text-amber-100/75">Next up: {nextGameLabel}{rotationSeconds !== null ? ' · switching in ' + rotationSeconds + 's' : ''}</p>
        </div>
      )}
      {phase === 'paused' && <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-white">Paused. Resume when you are ready.</div>}
      <div className="flex flex-wrap items-center gap-2">
        {phase === 'finished' && <button type="button" onClick={onNext} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-amber-300 px-3 text-xs font-black text-slate-950 hover:bg-amber-200">Next challenge <ArrowRight className="h-4 w-4" /></button>}
        {phase === 'finished' && rotationSeconds !== null && <button type="button" onClick={onStay} className="min-h-10 rounded-xl border border-white/20 px-3 text-xs font-bold text-white hover:bg-white/10">Stay on results</button>}
        {phase === 'playing'
          ? <button type="button" onClick={pause} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/20 px-3 text-xs font-bold text-white hover:bg-white/10"><Pause className="h-4 w-4" /> Pause</button>
          : phase === 'paused'
            ? <button type="button" onClick={resume} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-fuchsia-500 px-3 text-xs font-bold text-white"><Play className="h-4 w-4" /> Resume</button>
            : <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-fuchsia-500 px-3 text-xs font-bold text-white"><RotateCcw className="h-4 w-4" /> Play again</button>}
        <Link href={fullGameUrl} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/25 px-3 text-xs font-bold text-white hover:bg-white/10">Full game <ArrowRight className="h-4 w-4" /></Link>
        <button type="button" onClick={onExit} className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold text-white/75 hover:bg-white/10"><X className="h-4 w-4" /> Continue scrolling</button>
      </div>
      <p className="text-[11px] leading-relaxed text-white/60">Silent by design. No music autoplay. Controls work only while this game card has keyboard focus; tapping a key never interferes with writing a post.</p>
    </section>
  )
}
