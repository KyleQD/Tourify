'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Disc3, Headphones, Pause, Play, RotateCcw, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { useJukeboxOptional } from '@/contexts/jukebox-context'
import {
  createPracticeChart,
  findHittableNote,
  judgeTiming,
  LANE_KEYS,
  type BeatNote,
  type Lane,
  type RhythmDifficulty,
} from '@/lib/arcade/rhythm-chart'

interface EligibleTrack {
  id: string
  title: string
  genre: string | null
  duration: number | null
  coverUrl: string | null
  accessMode: string | null
  previewMode: string | null
  previewDurationSeconds: number | null
}
type Phase = 'idle' | 'loading' | 'playing' | 'paused' | 'finished'
type Results = { score: number; combo: number; bestCombo: number; perfect: number; good: number; missed: number }
const initialResults = (): Results => ({ score: 0, combo: 0, bestCombo: 0, perfect: 0, good: 0, missed: 0 })
const colors = ['#f472b6', '#a78bfa', '#38bdf8', '#fbbf24'] as const
const WIDTH = 760
const HEIGHT = 360
const HIT_LINE = 288

export function RhythmGame() {
  const jukebox = useJukeboxOptional()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const practiceContextRef = useRef<AudioContext | null>(null)
  const lastBeatIndexRef = useRef(-1)
  const generationRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')
  const notesRef = useRef<BeatNote[]>([])
  const handledRef = useRef(new Set<number>())
  const resultsRef = useRef<Results>(initialResults())
  const wallStartRef = useRef(0)
  const frozenTimeRef = useRef(0)
  const durationRef = useRef(30)
  const hitFnRef = useRef<(lane: Lane) => void>(() => {})
  const [tracks, setTracks] = useState<EligibleTrack[]>([])
  const [catalogMessage, setCatalogMessage] = useState('Loading eligible music…')
  const [selected, setSelected] = useState('practice')
  const [tempo, setTempo] = useState(110)
  const [difficulty, setDifficulty] = useState<RhythmDifficulty>('normal')
  const [offsetMs, setOffsetMs] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<Results>(initialResults)
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState('Ready when you are')
  const [error, setError] = useState('')

  const updatePhase = (next: Phase) => { phaseRef.current = next; setPhase(next) }
  const getTime = useCallback(() => {
    if (audioRef.current) return audioRef.current.currentTime || 0
    if (phaseRef.current === 'playing') return Math.max(0, (performance.now() - wallStartRef.current) / 1000)
    return frozenTimeRef.current
  }, [])
  // Positive calibration delays the chart to match a slower audio output device.
  // It never changes playback permissions or the underlying audio.
  const chartTime = useCallback(() => Math.max(0, getTime() - offsetMs / 1000), [getTime, offsetMs])

  const stopAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.onended = null
    audio.onerror = null
    audio.removeAttribute('src')
    audio.load()
    audioRef.current = null
  }

  const reset = () => {
    generationRef.current++
    stopAudio()
    notesRef.current = []
    handledRef.current = new Set()
    lastBeatIndexRef.current = -1
    resultsRef.current = initialResults()
    frozenTimeRef.current = 0
    setResults(initialResults())
    setElapsed(0)
    setFeedback('Ready when you are')
    setError('')
    updatePhase('idle')
  }

  useEffect(() => {
    let cancelled = false
    void fetch('/api/arcade/tracks', { credentials: 'include', cache: 'no-store' })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Could not load songs')
        if (cancelled) return
        const list = Array.isArray(data.tracks) ? data.tracks as EligibleTrack[] : []
        setTracks(list)
        setCatalogMessage(list.length ? 'Your published, rights-cleared tracks' : data.message || 'No eligible creator tracks yet. Practice mode is ready.')
      })
      .catch(() => { if (!cancelled) setCatalogMessage('Music catalog unavailable. Practice mode still works.') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    reset()
    // Reset timing each time the selected track/tempo changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tempo, difficulty])

  useEffect(() => () => {
    generationRef.current++
    stopAudio()
    void practiceContextRef.current?.close()
  }, [])

  const start = async () => {
    if (phaseRef.current === 'loading' || phaseRef.current === 'playing') return
    if (jukebox?.state.isPlaying) jukebox.pause()
    if (phaseRef.current === 'paused') {
      try {
        if (audioRef.current) await audioRef.current.play()
        else wallStartRef.current = performance.now() - frozenTimeRef.current * 1000
        updatePhase('playing')
        sectionRef.current?.focus()
      } catch { setError('Playback was blocked. Tap Resume again.') }
      return
    }

    reset()
    const generation = generationRef.current
    const track = tracks.find(t => t.id === selected)
    const length = track
      ? Math.min(240, Math.max(8, track.previewMode === 'clip'
        ? track.previewDurationSeconds || 15 : Number(track.duration) || 90))
      : 30
    durationRef.current = length
    notesRef.current = createPracticeChart(tempo, length, selected, difficulty)
    if (track) {
      updatePhase('loading')
      try {
        const response = await fetch('/api/music/stream?trackId=' + encodeURIComponent(track.id), {
          credentials: 'include',
          cache: 'no-store',
        })
        const data = await response.json()
        if (generation !== generationRef.current) return
        if (!response.ok || typeof data.url !== 'string') {
          throw new Error(response.status === 401 || response.status === 403
            ? 'You do not have playback access to this track.' : 'The track is not available for streaming.')
        }
        // The authoritative stream response controls whether this listener gets a
        // full song or a clip; do not infer playback length from upload metadata.
        const permittedSeconds = data.accessLevel === 'preview'
          ? Number(track.previewDurationSeconds) || 15
          : Number(track.duration) || 90
        durationRef.current = Math.max(8, Math.min(240, permittedSeconds))
        notesRef.current = createPracticeChart(tempo, durationRef.current, track.id, difficulty)
        const audio = new Audio()
        audio.preload = 'auto'
        audio.src = data.url
        audioRef.current = audio
        audio.onended = () => { frozenTimeRef.current = audio.currentTime; updatePhase('finished'); setFeedback('Set complete!') }
        audio.onerror = () => { setError('Stream stopped. Choose Practice or another track.'); frozenTimeRef.current = audio.currentTime; updatePhase('paused') }
        await audio.play()
        if (generation !== generationRef.current) { stopAudio(); return }
      } catch (caught) {
        if (generation !== generationRef.current) return
        // iOS Safari and some browsers require a second explicit tap after
        // the asynchronous signed-URL fetch before audio can begin.
        if (caught instanceof DOMException && caught.name === 'NotAllowedError' && audioRef.current?.src) {
          setError('Your browser requires a second tap. Press Resume to start the song.')
          updatePhase('paused')
          return
        }
        stopAudio()
        setError(caught instanceof Error ? caught.message : 'Could not start playback.')
        updatePhase('idle')
        return
      }
    } else {
      try {
        if (window.AudioContext && !practiceContextRef.current) practiceContextRef.current = new window.AudioContext()
        void practiceContextRef.current?.resume().catch(() => {})
      } catch { /* The note highway remains playable without audio */ }
      wallStartRef.current = performance.now()
    }
    updatePhase('playing')
    sectionRef.current?.focus()
  }

  const pause = () => {
    if (phaseRef.current !== 'playing') return
    frozenTimeRef.current = getTime()
    audioRef.current?.pause()
    updatePhase('paused')
  }

  const hitLane = (lane: Lane) => {
    if (phaseRef.current !== 'playing') return
    const now = chartTime()
    const note = findHittableNote(notesRef.current, handledRef.current, lane, now)
    if (!note) { setFeedback('Keep watching the beat line'); return }
    const judgement = judgeTiming(now - note.at)
    handledRef.current.add(note.id)
    const previous = resultsRef.current
    const combo = previous.combo + 1
    const next = {
      ...previous,
      score: previous.score + (judgement === 'perfect' ? 1000 : 500) + Math.min(50, combo * 5),
      combo, bestCombo: Math.max(previous.bestCombo, combo),
      perfect: previous.perfect + (judgement === 'perfect' ? 1 : 0),
      good: previous.good + (judgement === 'good' ? 1 : 0),
    }
    resultsRef.current = next
    setResults(next)
    setFeedback(judgement === 'perfect' ? '✦ PERFECT!' : 'NICE!')
  }
  hitFnRef.current = hitLane

  useEffect(() => {
    const handleKeys = (event: KeyboardEvent) => {
      if (!sectionRef.current?.contains(document.activeElement)) return
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      if (document.activeElement instanceof HTMLSelectElement || document.activeElement instanceof HTMLInputElement) return
      const laneIndex = LANE_KEYS.indexOf(event.key.toLowerCase() as typeof LANE_KEYS[number])
      if (laneIndex >= 0) {
        event.preventDefault()
        hitFnRef.current(laneIndex as Lane)
      } else if (event.key === 'Escape' && phaseRef.current === 'playing') {
        event.preventDefault()
        pauseRef.current()
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [])
  const pauseRef = useRef<() => void>(() => {})
  pauseRef.current = pause

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let frame = 0
    let lastHud = 0
    const draw = () => {
      const t = chartTime()
      const playbackTime = getTime()
      if (phaseRef.current === 'playing') {
        // Original oscillator beat for practice mode; no external songs or samples.
        if (!audioRef.current && practiceContextRef.current?.state === 'running') {
          const index = Math.floor(playbackTime * tempo / 60)
          if (index > lastBeatIndexRef.current) {
            lastBeatIndexRef.current = index
            const audioCtx = practiceContextRef.current
            const tone = audioCtx.createOscillator()
            const volume = audioCtx.createGain()
            const downbeat = index % 4 === 0
            tone.type = downbeat ? 'sine' : 'triangle'
            tone.frequency.setValueAtTime(downbeat ? 104 : 390, audioCtx.currentTime)
            tone.frequency.exponentialRampToValueAtTime(downbeat ? 66 : 260, audioCtx.currentTime + 0.065)
            volume.gain.setValueAtTime(downbeat ? 0.085 : 0.024, audioCtx.currentTime)
            volume.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.085)
            tone.connect(volume); volume.connect(audioCtx.destination)
            tone.start(); tone.stop(audioCtx.currentTime + 0.09)
          }
        }
        let newlyMissed = 0
        for (const n of notesRef.current) {
          if (n.at + 0.18 < t && !handledRef.current.has(n.id)) {
            handledRef.current.add(n.id); newlyMissed++
          }
          if (n.at > t + 1) break
        }
        if (newlyMissed) {
          const next = { ...resultsRef.current, combo: 0, missed: resultsRef.current.missed + newlyMissed }
          resultsRef.current = next
          setResults(next)
          setFeedback('Keep going!')
        }
        if (!audioRef.current && playbackTime >= durationRef.current) {
          frozenTimeRef.current = durationRef.current
          updatePhase('finished')
          setFeedback('Set complete!')
        }
        if (performance.now() - lastHud > 125) { setElapsed(playbackTime); lastHud = performance.now() }
      }

      ctx.fillStyle = '#09091a'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      const grd = ctx.createLinearGradient(0, 0, 0, HEIGHT)
      grd.addColorStop(0, '#21103e')
      grd.addColorStop(0.68, '#12102d')
      grd.addColorStop(1, '#101b30')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      for (let lane = 0; lane < 4; lane++) {
        const x = 46 + lane * 175
        ctx.fillStyle = lane % 2 ? '#ffffff08' : '#ffffff03'
        ctx.fillRect(x, 20, 160, HEIGHT - 40)
        ctx.strokeStyle = '#ffffff1c'; ctx.strokeRect(x, 20, 160, HEIGHT - 40)
        ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = colors[lane]
        ctx.fillText(LANE_KEYS[lane].toUpperCase(), x + 80, 340)
      }

      for (let b = 0; b < 6; b++) {
        const y = (t * (tempo / 60) * 60 + b * 78) % 300
        ctx.fillStyle = '#ffffff0c'
        ctx.fillRect(46, y, 685, 2)
      }
      ctx.shadowBlur = 17; ctx.shadowColor = '#e879f9'; ctx.fillStyle = '#f0abfc'
      ctx.fillRect(46, HIT_LINE, 685, 5); ctx.shadowBlur = 0

      for (const note of notesRef.current) {
        if (handledRef.current.has(note.id)) continue
        const y = HIT_LINE - (note.at - t) * 184
        if (y < 0 || y > HEIGHT - 42) continue
        const x = 46 + note.lane * 175
        ctx.shadowColor = colors[note.lane]; ctx.shadowBlur = 16
        ctx.fillStyle = colors[note.lane]; ctx.fillRect(x + 23, y - 10, 114, 20)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffff90'; ctx.fillRect(x + 33, y - 6, 94, 4)
      }

      if (phaseRef.current !== 'playing') {
        ctx.fillStyle = '#02061777'; ctx.fillRect(0, 0, WIDTH, HEIGHT - 44)
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 27px sans-serif'
        ctx.fillText(phaseRef.current === 'finished' ? 'SET COMPLETE' : phaseRef.current === 'paused' ? 'PAUSED' : 'READY TO DROP?', WIDTH / 2, 153)
        ctx.font = '15px sans-serif'; ctx.fillStyle = '#d4c9f9'
        ctx.fillText('Hit notes as they cross the bright line', WIDTH / 2, 185)
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [chartTime, getTime, tempo])

  useEffect(() => {
    const onHide = () => { if (document.hidden) pauseRef.current() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  return (
    <section ref={sectionRef} tabIndex={-1} className="space-y-5 rounded-3xl border border-fuchsia-400/20 bg-[#100d22] p-4 text-white outline-none sm:p-6" aria-label="Beat Deck rhythm game">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/arcade" className="inline-flex items-center gap-2 text-sm text-fuchsia-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-200"><Disc3 className="h-3.5 w-3.5" /> BEAT DECK · PRACTICE CHART</span>
      </div>
      <div>
        <h2 className="text-2xl font-black sm:text-3xl">Hit the beat. Own the stage.</h2>
        <p className="mt-1 text-sm text-slate-300">Four lanes. D F J K on keyboard, or tap the lane pads below. Practice patterns are tempo-based, not automatically transcribed from audio.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
        <label className="text-xs font-medium text-white/80">Choose your track
          <select value={selected} disabled={phase === 'loading'} onChange={e => setSelected(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-white/20 bg-[#211a3a] px-3 text-base text-white">
            <option value="practice">🎛️ Original synth practice beat · 30s</option>
            {tracks.map(track => <option value={track.id} key={track.id}>{track.title}{track.genre ? ' · ' + track.genre : ''}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-white/80">Chart tempo · <strong className="text-fuchsia-200">{tempo} BPM</strong>
          <input type="range" min={65} max={200} step={5} value={tempo} onChange={e => setTempo(Number(e.target.value))} className="mt-1 block min-h-11 w-full accent-fuchsia-400" />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-white/80">Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as RhythmDifficulty)} className="mt-1 block min-h-11 w-full rounded-xl border border-white/20 bg-[#211a3a] px-3 text-base capitalize text-white">
            <option value="easy">Easy · fewer notes</option>
            <option value="normal">Normal · quarter notes</option>
            <option value="hard">Hard · rapid notes</option>
          </select>
        </label>
        <label className="text-xs font-medium text-white/80">Audio calibration: {offsetMs > 0 ? '+' : ''}{offsetMs} ms
          <input type="range" min={-150} max={150} step={10} value={offsetMs} onChange={e => setOffsetMs(Number(e.target.value))} className="mt-1 block min-h-11 w-full accent-sky-400" />
        </label>
      </div>
      <p className="text-xs text-white/55"><Headphones className="mr-1 inline h-3.5 w-3.5" />{catalogMessage}. Artist-uploaded tracks are played through Tourify’s existing permission-checked streaming service.</p>

      <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm" aria-live="polite">
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-fuchsia-200">{results.score.toLocaleString()}</span>Score</div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-sky-200">{results.combo}×</span>Combo</div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-amber-200">{results.perfect}</span>Perfect</div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-[760/360] w-full" aria-label="Rhythm highway: four falling note lanes, from left to right D F J K" />
      </div>

      <div className="grid grid-cols-4 gap-2" role="group" aria-label="Tap or press a lane when a note reaches the line">
        {LANE_KEYS.map((key, lane) => <button key={key} type="button" onPointerDown={e => { e.preventDefault(); hitLane(lane as Lane) }}
          disabled={phase !== 'playing'} className="min-h-14 touch-manipulation rounded-2xl border-2 border-white/20 bg-white/10 text-lg font-black text-white transition-transform active:scale-95 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
          style={{ borderColor: colors[lane] }} aria-label={'Hit lane ' + key.toUpperCase()}>{key.toUpperCase()}</button>)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span aria-live="polite" className="min-w-0 text-sm font-bold text-fuchsia-200">{error || feedback} <span className="ml-2 text-xs font-normal text-white/50">{Math.floor(elapsed)}s / {Math.ceil(durationRef.current)}s</span></span>
        <div className="flex flex-wrap gap-2">
          {phase === 'playing'
            ? <button type="button" onClick={pause} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 font-semibold hover:bg-white/25"><Pause className="h-4 w-4" /> Pause</button>
            : <button type="button" onClick={() => void start()} disabled={phase === 'loading'} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-fuchsia-500 px-4 font-bold text-white hover:bg-fuchsia-400 disabled:opacity-40"><Play className="h-4 w-4" />{phase === 'paused' ? 'Resume' : phase === 'loading' ? 'Loading…' : 'Start set'}</button>}
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 hover:bg-white/10"><RotateCcw className="h-4 w-4" /> Reset</button>
        </div>
      </div>
      {phase === 'finished' && <p className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/10 p-4 text-sm">Set finished! Best combo: <strong>{results.bestCombo}×</strong> · Good: <strong>{results.good}</strong> · Missed: <strong>{results.missed}</strong>. Try a faster tempo or a new track.</p>}
      <p className="text-xs leading-relaxed text-white/45"><Volume2 className="mr-1 inline h-3.5 w-3.5" />Music starts only after you tap Start. Pause stops the track. This is an original rhythm-game prototype; it contains no Guitar Hero assets or note charts.</p>
    </section>
  )
}
