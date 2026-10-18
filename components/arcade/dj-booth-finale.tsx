'use client'

import { useEffect, useRef, useState } from 'react'
import { Disc3, SlidersHorizontal, Volume2, VolumeX } from 'lucide-react'
import { DJ_DECK_NOTES, getDJMixLevels } from '@/lib/arcade/dj-mixer'

type Deck = 'a' | 'b'

/**
 * Studio 54 victory bonus: entirely original synthesized notes, no
 * copyrighted samples or artist-uploaded masters. Deliberately a small
 * celebratory toy, not a professional audio mixer.
 */
export function DJBoothFinale() {
  const audioRef = useRef<AudioContext | null>(null)
  const playingRef = useRef({ a: false, b: false })
  const crossRef = useRef(50)
  const beatRef = useRef(0)
  const [playing, setPlaying] = useState({ a: false, b: false })
  const [crossfader, setCrossfader] = useState(50)
  const [message, setMessage] = useState('You made the guest list. Drop your own original set!')

  playingRef.current = playing
  crossRef.current = crossfader

  const activateAudio = async (): Promise<AudioContext | null> => {
    try {
      if (!audioRef.current) audioRef.current = new window.AudioContext()
      if (audioRef.current.state !== 'running') await audioRef.current.resume()
      return audioRef.current
    } catch {
      setMessage('Audio is blocked by this browser. Tap a deck to try again.')
      return null
    }
  }

  const playTone = (ctx: AudioContext, frequency: number, deck: Deck, scratch = false) => {
    if (frequency <= 0) return
    const mix = getDJMixLevels(crossRef.current)
    const level = mix[deck]
    if (level < 0.003) return
    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const envelope = ctx.createGain()
    oscillator.type = deck === 'a' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(frequency, now)
    if (scratch) oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.52, now + 0.13)
    envelope.gain.setValueAtTime(0.001, now)
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.07 * level), now + 0.013)
    envelope.gain.exponentialRampToValueAtTime(0.001, now + (scratch ? 0.15 : 0.2))
    oscillator.connect(envelope)
    envelope.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + (scratch ? 0.17 : 0.22))
  }

  // Two distinct eight-step patterns. Clock is a local original practice
  // sequencer; full Web Audio lookahead scheduling is future work.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const ctx = audioRef.current
      if (!ctx || ctx.state !== 'running') return
      const active = playingRef.current
      if (!active.a && !active.b) return
      const step = beatRef.current++ % 8
      if (active.a) playTone(ctx, DJ_DECK_NOTES.a[step], 'a')
      if (active.b) playTone(ctx, DJ_DECK_NOTES.b[step], 'b')
    }, 240)
    return () => {
      window.clearInterval(timer)
      void audioRef.current?.close()
      audioRef.current = null
    }
  }, [])

  const toggle = async (deck: Deck) => {
    if (playingRef.current[deck]) {
      setPlaying(current => ({ ...current, [deck]: false }))
      setMessage((deck === 'a' ? 'Bassline' : 'Starlight') + ' deck paused.')
      return
    }
    if (!await activateAudio()) return
    setPlaying(current => ({ ...current, [deck]: true }))
    setMessage((deck === 'a' ? 'Bassline' : 'Starlight') + ' deck live! Move the crossfader to mix.')
  }

  const scratch = async (deck: Deck) => {
    const ctx = await activateAudio()
    if (!ctx) return
    playTone(ctx, deck === 'a' ? 420 : 820, deck, true)
    setMessage('✦ ' + (deck === 'a' ? 'Vinyl scratch!' : 'Star sweep!'))
  }

  const silence = () => {
    setPlaying({ a: false, b: false })
    setMessage('Both decks are stopped. The room is yours.')
    void audioRef.current?.suspend().catch(() => {})
  }

  return (
    <section aria-label="Playable DJ booth finale" className="space-y-4 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-[#30173b] to-[#0e2444] p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-200">Unlocked · Studio 54 DJ Booth</p>
          <h3 className="mt-1 text-xl font-black text-white sm:text-2xl">Play your encore</h3>
        </div>
        <Disc3 aria-hidden="true" className="h-8 w-8 text-fuchsia-300" />
      </div>
      <p className="text-xs text-white/70">Two original synth decks. Start either loop, scratch a vinyl, and blend them with the crossfader. No licensed songs or downloads are used.</p>
      <div className="grid grid-cols-2 gap-3">
        {([
          { deck: 'a' as const, name: 'Bassline', accent: 'border-pink-400/40 text-pink-100' },
          { deck: 'b' as const, name: 'Starlight', accent: 'border-sky-400/40 text-sky-100' },
        ]).map(({ deck, name, accent }) => (
          <div key={deck} className={'flex flex-col items-center gap-3 rounded-2xl border bg-black/20 p-3 ' + accent}>
            <span className="text-xs font-bold uppercase tracking-wider">Deck {deck.toUpperCase()} · {name}</span>
            <button type="button" onClick={() => void scratch(deck)}
              aria-label={'Scratch ' + name + ' record'}
              className={'flex h-24 w-24 items-center justify-center rounded-full border-[9px] border-[#151025] bg-gradient-to-br from-slate-700 to-slate-950 shadow-[0_0_25px_#ffffff20] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:h-32 sm:w-32 ' + (playing[deck] ? 'motion-safe:animate-spin' : '')}
              style={{ animationDuration: '3s' }}>
              <span className={'flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-white/20 text-xl font-black ' + (deck === 'a' ? 'bg-pink-500' : 'bg-sky-500')}>
                {deck === 'a' ? 'A' : 'B'}
              </span>
            </button>
            <button type="button" onClick={() => void toggle(deck)} aria-pressed={playing[deck]}
              className="min-h-11 w-full rounded-xl border border-white/20 bg-white/15 px-3 py-2 text-sm font-black text-white hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
              {playing[deck] ? 'Ⅱ Pause' : '▶ Start'} {name}
            </button>
          </div>
        ))}
      </div>
      <label className="block rounded-xl border border-white/15 bg-black/20 p-4 text-xs font-bold text-white/85">
        <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Crossfader · {crossfader}% toward Deck B</span>
        <input type="range" min={0} max={100} step={1} value={crossfader}
          onChange={event => setCrossfader(Number(event.target.value))}
          className="mt-3 block h-8 w-full accent-amber-300" aria-label="DJ booth crossfader between Bassline and Starlight" />
        <span className="flex justify-between text-[11px] text-white/60"><span>Bassline A</span><span>Starlight B</span></span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-fuchsia-100" role="status" aria-live="polite">{message}</p>
        <button type="button" onClick={silence} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-3 text-xs font-bold hover:bg-white/10">
          {playing.a || playing.b ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          Stop all
        </button>
      </div>
    </section>
  )
}
