'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Disc3, Headphones, Pause, Play, RotateCcw, Volume2, Waves, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useJukeboxOptional } from '@/contexts/jukebox-context'
import { readPersonalBest, savePersonalBest } from '@/lib/arcade/personal-best'
import { BEAT_DECK_ORIGINALS, createOriginalSongChart, getOriginalSong, getNextOriginalSong } from '@/lib/arcade/beat-deck-originals'
import { OriginalBeatDeckPlayer } from '@/lib/arcade/beat-deck-audio'
import { BEAT_DECK_STAGES, getShowEnergy, getShowTier, type BeatDeckStage } from '@/lib/arcade/stage-director'
import { laneFromKeyboardEvent, isRhythmEditableTarget, explainUnscoredPress } from '@/lib/arcade/rhythm-input'
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
  const originalPlayerRef = useRef<OriginalBeatDeckPlayer | null>(null)
  const lastBeatIndexRef = useRef(-1)
  const generationRef = useRef(0)
  const roundIdRef = useRef('practice:normal')
  const phaseRef = useRef<Phase>('idle')
  const notesRef = useRef<BeatNote[]>([])
  const handledRef = useRef(new Set<number>())
  const resultsRef = useRef<Results>(initialResults())
  const wallStartRef = useRef(0)
  const frozenTimeRef = useRef(0)
  const durationRef = useRef(30)
  const hitFnRef = useRef<(lane: Lane) => void>(() => {})
  const pressFnRef = useRef<(lane: Lane, pressed: boolean) => void>(() => {})
  const releaseAllFnRef = useRef<() => void>(() => {})
  const pressedLanesRef = useRef(new Set<Lane>())
  const laneFlashUntilRef = useRef<number[]>([0, 0, 0, 0])
  const [tracks, setTracks] = useState<EligibleTrack[]>([])
  const [catalogMessage, setCatalogMessage] = useState('Loading eligible music…')
  const [selected, setSelected] = useState('original:midnight-circuit')
  const [tempo, setTempo] = useState(120)
  const [difficulty, setDifficulty] = useState<RhythmDifficulty>('normal')
  const [stage, setStage] = useState<BeatDeckStage>('neon-city')
  const [reducedMotion, setReducedMotion] = useState(false)
  const [offsetMs, setOffsetMs] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<Results>(initialResults)
  const [personalBest, setPersonalBest] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [feedback, setFeedback] = useState('Ready when you are')
  const [heldLanes, setHeldLanes] = useState<Lane[]>([])
  const [lastRegisteredKey, setLastRegisteredKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const selectedOriginal = getOriginalSong(selected)
  const selectSong = (songId: string) => {
    setSelected(songId)
    const composed = getOriginalSong(songId)
    if (composed) { setTempo(composed.bpm); setStage(composed.stage) }
  }

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  const updatePhase = (next: Phase) => { phaseRef.current = next; setPhase(next) }
  const getTime = useCallback(() => {
    if (audioRef.current) return audioRef.current.currentTime || 0
    if (originalPlayerRef.current) return originalPlayerRef.current.getTime()
    if (phaseRef.current === 'playing') return Math.max(0, (performance.now() - wallStartRef.current) / 1000)
    return frozenTimeRef.current
  }, [])
  // Positive calibration delays the chart to match a slower audio output device.
  // It never changes playback permissions or the underlying audio.
  const chartTime = useCallback(() => Math.max(0, getTime() - offsetMs / 1000), [getTime, offsetMs])

  const updateLanePressed = (lane: Lane, pressed: boolean) => {
    const current = pressedLanesRef.current
    if (pressed) {
      laneFlashUntilRef.current[lane] = performance.now() + 160
      if (current.has(lane)) return
      current.add(lane)
    } else {
      if (!current.has(lane)) return
      current.delete(lane)
    }
    setHeldLanes([...current])
  }
  const releaseAllLanes = () => {
    pressedLanesRef.current.clear()
    setHeldLanes([])
  }
  pressFnRef.current = updateLanePressed
  releaseAllFnRef.current = releaseAllLanes

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
    originalPlayerRef.current?.dispose()
    originalPlayerRef.current = null
    notesRef.current = []
    handledRef.current = new Set()
    lastBeatIndexRef.current = -1
    releaseAllLanes()
    laneFlashUntilRef.current = [0, 0, 0, 0]
    setLastRegisteredKey(null)
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

  useEffect(() => {
    setPersonalBest(readPersonalBest('beat-deck', selected + ':' + difficulty))
  }, [selected, difficulty])

  useEffect(() => {
    if (phase !== 'finished') return
    setPersonalBest(savePersonalBest('beat-deck', roundIdRef.current, resultsRef.current.score))
  }, [phase])

  useEffect(() => () => {
    generationRef.current++
    stopAudio()
    originalPlayerRef.current?.dispose()
    originalPlayerRef.current = null
    void practiceContextRef.current?.close()
  }, [])

  const start = async () => {
    if (phaseRef.current === 'loading' || phaseRef.current === 'playing') return
    if (jukebox?.state.isPlaying) jukebox.pause()
    if (phaseRef.current === 'paused') {
      try {
        if (audioRef.current) await audioRef.current.play()
        else if (originalPlayerRef.current) await originalPlayerRef.current.start()
        else wallStartRef.current = performance.now() - frozenTimeRef.current * 1000
        updatePhase('playing')
        sectionRef.current?.focus()
      } catch { setError('Playback was blocked. Tap Resume again.') }
      return
    }

    reset()
    roundIdRef.current = selected + ':' + difficulty
    const generation = generationRef.current
    const track = tracks.find(t => t.id === selected)
    const original = getOriginalSong(selected)
    const length = original ? original.duration : track
      ? Math.min(240, Math.max(8, track.previewMode === 'clip'
        ? track.previewDurationSeconds || 15 : Number(track.duration) || 90))
      : 30
    durationRef.current = length
    notesRef.current = original ? createOriginalSongChart(original.id, difficulty) : createPracticeChart(tempo, length, selected, difficulty)
    if (original) {
      try {
        if (!window.AudioContext) throw new Error('This browser cannot synthesize the original tracks')
        if (!practiceContextRef.current) practiceContextRef.current = new window.AudioContext()
        if (generation !== generationRef.current) return
        originalPlayerRef.current = new OriginalBeatDeckPlayer(original.id, practiceContextRef.current)
        await originalPlayerRef.current.start()
        if (generation !== generationRef.current) { originalPlayerRef.current?.stop(); return }
      } catch (caught) {
        originalPlayerRef.current?.dispose()
        originalPlayerRef.current = null
        setError(caught instanceof Error ? caught.message : 'Unable to start original soundtrack')
        updatePhase('idle')
        return
      }
    } else if (track) {
      updatePhase('loading')
      try {
        const response = await fetch('/api/music/stream?source=arcade&trackId=' + encodeURIComponent(track.id), {
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
    releaseAllLanes()
    frozenTimeRef.current = getTime()
    audioRef.current?.pause()
    originalPlayerRef.current?.pause()
    updatePhase('paused')
  }

  const hitLane = (lane: Lane) => {
    if (phaseRef.current !== 'playing') return
    const key = LANE_KEYS[lane].toUpperCase()
    setLastRegisteredKey(key)
    laneFlashUntilRef.current[lane] = performance.now() + 175
    const now = chartTime()
    const note = findHittableNote(notesRef.current, handledRef.current, lane, now)
    if (!note) {
      const timing = explainUnscoredPress(notesRef.current, handledRef.current, lane, now)
      const description = timing === 'early' ? 'too early' : timing === 'late' ? 'too late' : 'no note waiting'
      setFeedback(key + ' REGISTERED · ' + description + '. Aim for the bright line!')
      return
    }
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
    setFeedback(key + (judgement === 'perfect' ? ' REGISTERED · ✦ PERFECT!' : ' REGISTERED · NICE!'))
  }
  hitFnRef.current = hitLane

  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      // Starting a round explicitly arms the game. Focus can drift to the page
      // or canvas without silently disabling the D/F/J/K controls.
      if (phaseRef.current !== 'playing') return
      if (isRhythmEditableTarget(event.target as HTMLElement | null)) return
      const lane = laneFromKeyboardEvent(event)
      if (lane !== null) {
        event.preventDefault()
        if (!event.repeat) {
          pressFnRef.current(lane, true)
          hitFnRef.current(lane)
        }
      } else if (event.key === 'Escape' && !event.repeat) {
        event.preventDefault()
        pauseRef.current()
      }
    }
    const handleUp = (event: KeyboardEvent) => {
      // Always release tracked lanes, even if the player paused mid-press.
      const lane = laneFromKeyboardEvent({ key: event.key, code: event.code })
      if (lane !== null) pressFnRef.current(lane, false)
    }
    const releaseAll = () => releaseAllFnRef.current()
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      window.removeEventListener('blur', releaseAll)
    }
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
        if (!audioRef.current && !originalPlayerRef.current && practiceContextRef.current?.state === 'running') {
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
          originalPlayerRef.current?.pause()
          updatePhase('finished')
          setFeedback('Set complete!')
        }
        if (performance.now() - lastHud > 125) { setElapsed(playbackTime); lastHud = performance.now() }
      }

      // Scenery stays behind note lanes; stage changes never change score/timing.
      const theme = BEAT_DECK_STAGES.find(option => option.id === stage) || BEAT_DECK_STAGES[0]
      const authoredSong = getOriginalSong(roundIdRef.current.split(':').slice(0, 2).join(':')) || getOriginalSong(selected)
      const energy = getShowEnergy(resultsRef.current.combo)
      const pulse = reducedMotion ? 0.55 : 0.6 + 0.4 * Math.sin(playbackTime * tempo / 60 * Math.PI * 2)
      const grd = ctx.createLinearGradient(0, 0, 0, HEIGHT)
      grd.addColorStop(0, authoredSong?.tint[0] || theme.sky)
      grd.addColorStop(0.67, authoredSong?.tint[1] || theme.horizon)
      grd.addColorStop(1, authoredSong?.tint[2] || theme.floor)
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, WIDTH, HEIGHT)

      ctx.save()
      const beams = stage === 'festival' ? 9 : stage === 'neon-city' ? 7 : 5
      for (let i = 0; i < beams; i++) {
        const originX = (i + 0.5) * WIDTH / beams
        const sway = reducedMotion ? 0 : Math.sin(playbackTime * 0.8 + i * 2) * (42 + energy * 75)
        ctx.globalAlpha = Math.min(0.28, 0.05 + energy * 0.13 + pulse * 0.08)
        ctx.fillStyle = i % 2 ? theme.secondary : theme.light
        ctx.beginPath()
        ctx.moveTo(originX - 3, stage === 'festival' ? 13 : 51)
        ctx.lineTo(originX - 68 + sway, HIT_LINE + 40)
        ctx.lineTo(originX + 68 + sway, HIT_LINE + 40)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = 0.4 + energy * 0.33
      if (stage === 'neon-city') {
        for (let i = 0; i < 13; i++) {
          const h = 24 + (i * 29 % 71)
          const x = i * 62
          ctx.fillStyle = '#09142c'; ctx.fillRect(x, 171 - h, 48, h)
          ctx.fillStyle = theme.light; ctx.fillRect(x + 10, 181 - h, 4, 6); ctx.fillRect(x + 27, 191 - h, 4, 6)
        }
      } else {
        ctx.strokeStyle = theme.secondary
        ctx.lineWidth = 4
        ctx.beginPath(); ctx.moveTo(14, 84); ctx.lineTo(744, 84); ctx.stroke()
        if (stage === 'festival') {
          for (let i = 0; i < 13; i++) {
            const x = i * 62
            ctx.fillStyle = i % 2 ? theme.light : theme.secondary
            ctx.fillRect(x, 87, 26, 4 + energy * 18 * pulse)
          }
        }
      }
      ctx.globalAlpha = 0.42 + energy * 0.4
      ctx.fillStyle = '#090817'
      for (let i = 0; i < 33; i++) {
        const x = i * 25
        const crowdY = 313 - (i * 13 % 14) - energy * 14
        ctx.beginPath(); ctx.arc(x + 5, crowdY, 8, 0, Math.PI * 2); ctx.fill()
        ctx.fillRect(x - 2, crowdY + 5, 16, 35)
      }
      ctx.restore()
      // Concert rig: bass-reactive speakers, stage truss and visualizers.
      // The bars are deterministic music-position visuals, not microphone input.
      ctx.save()
      ctx.globalAlpha = 0.62 + 0.23 * pulse
      for (const sx of [14, WIDTH - 14]) {
        ctx.fillStyle = '#090b22'
        ctx.fillRect(sx - 24, 132, 48, 127)
        ctx.strokeStyle = theme.light; ctx.lineWidth = 2
        ctx.strokeRect(sx - 24, 132, 48, 127)
        for (const radius of [9, 17]) {
          ctx.beginPath(); ctx.arc(sx, 207, radius + (reducedMotion ? 0 : pulse * 2), 0, 2 * Math.PI)
          ctx.strokeStyle = radius === 9 ? theme.secondary : '#e2e8f0'
          ctx.stroke()
        }
      }
      ctx.fillStyle = '#ffffff99'
      for (let bar = 0; bar < 25; bar++) {
        const x = 108 + bar * 22
        const level = 6 + 13 * (0.5 + 0.5 * Math.sin(playbackTime * (3.5 + bar % 3) + bar * 0.8))
        ctx.globalAlpha = reducedMotion ? 0.22 : 0.18 + energy * 0.16
        ctx.fillRect(x, 108 - level / 2, 8, level)
      }
      ctx.globalAlpha = 1
      ctx.restore()
      for (let lane = 0; lane < 4; lane++) {
        const x = 46 + lane * 175
        ctx.fillStyle = lane % 2 ? '#05051ab5' : '#05051a9c'
        ctx.fillRect(x, 20, 160, HEIGHT - 40)
        ctx.strokeStyle = '#ffffff1c'; ctx.strokeRect(x, 20, 160, HEIGHT - 40)
        ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = colors[lane]
        ctx.fillText(LANE_KEYS[lane].toUpperCase(), x + 80, 340)
        ctx.strokeStyle = colors[lane] + '55'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x, 24); ctx.lineTo(x - 5, HIT_LINE)
        ctx.moveTo(x + 160, 24); ctx.lineTo(x + 165, HIT_LINE); ctx.stroke()
      }

      for (let b = 0; b < 6; b++) {
        const y = (t * (tempo / 60) * 60 + b * 78) % 300
        ctx.fillStyle = '#ffffff0c'
        ctx.fillRect(46, y, 685, 2)
      }
      ctx.shadowBlur = reducedMotion ? 0 : 17 + getShowEnergy(resultsRef.current.combo) * 14; ctx.shadowColor = theme.light; ctx.fillStyle = theme.secondary
      ctx.fillRect(46, HIT_LINE, 685, 5); ctx.shadowBlur = 0

      for (const note of notesRef.current) {
        if (handledRef.current.has(note.id)) continue
        const y = HIT_LINE - (note.at - t) * 184
        if (y < 0 || y > HEIGHT - 42) continue
        const x = 46 + note.lane * 175
        ctx.shadowColor = colors[note.lane]; ctx.shadowBlur = 16
        ctx.fillStyle = colors[note.lane]; ctx.fillRect(x + 23, y - 10, 114, 20)
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffffffdd'; ctx.fillRect(x + 33, y - 6, 94, 3)
        ctx.fillStyle = '#ffffff88'; ctx.fillRect(x + 48, y + 3, 64, 2)
      }

      // Every registered keyboard/touch press illuminates its hit receptor,
      // even when timing is early, late or there is no note to score.
      for (let lane = 0; lane < 4; lane++) {
        const x = 46 + lane * 175
        const held = pressedLanesRef.current.has(lane as Lane)
        const flashing = laneFlashUntilRef.current[lane] > performance.now()
        if (!held && !flashing) continue
        ctx.save()
        ctx.fillStyle = colors[lane] + (held ? '70' : '35')
        ctx.fillRect(x + 3, HIT_LINE - 14, 154, 39)
        ctx.strokeStyle = colors[lane]
        ctx.lineWidth = held ? 5 : 3
        ctx.strokeRect(x + 4, HIT_LINE - 14, 152, 36)
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.font = 'bold 17px sans-serif'
        ctx.fillText(LANE_KEYS[lane].toUpperCase() + ' ✓', x + 80, HIT_LINE - 25)
        ctx.restore()
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
  }, [chartTime, getTime, tempo, stage, reducedMotion])

  useEffect(() => {
    const onHide = () => { if (document.hidden) pauseRef.current() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  return (
    <section ref={sectionRef} tabIndex={-1} className="space-y-5 rounded-3xl border border-fuchsia-400/20 bg-[#100d22] p-4 text-white outline-none sm:p-6" aria-label="Beat Deck rhythm game">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/arcade" className="inline-flex items-center gap-2 text-sm text-fuchsia-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-100"><Disc3 className="h-3.5 w-3.5" /> BEAT DECK · ORIGINAL MUSIC EXPERIENCE</span>
      </div>
      <div>
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Beat Deck <span className="text-fuchsia-300">LIVE</span></h2>
        <p className="mt-1 text-xs text-slate-300">D F J K or tap the lanes. Press Start set to play; customize the setlist and stage below.</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-r from-[#1a193d] to-[#25154a] px-4 py-3">
        <div className="pointer-events-none absolute -right-10 -top-16 h-32 w-32 rounded-full bg-fuchsia-400/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20"
              style={{ background: selectedOriginal ? 'linear-gradient(130deg, ' + selectedOriginal.tint.join(',') + ')' : 'linear-gradient(130deg,#312e81,#db2777)' }}>
              <Waves className="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-200">{selectedOriginal ? 'NOW PLAYING · ORIGINAL 60s MIX' : 'ON THE DECK · PRACTICE / CREATOR TRACK'}</span>
              <p className="truncate text-lg font-black text-white">{selectedOriginal?.title || (selected === 'practice' ? 'Synth Practice Beat' : tracks.find(track => track.id === selected)?.title || 'Choose a track')}</p>
              <p className="text-xs text-white/70">{selectedOriginal ? selectedOriginal.genre + ' · ' + selectedOriginal.key : 'Beat Deck original gameplay chart'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedOriginal && <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-bold text-amber-100">{selectedOriginal.bpm} BPM</span>}
            <span className="rounded-full border border-white/20 bg-black/30 px-2.5 py-1.5 text-xs font-bold text-white">{Math.floor(elapsed / 60).toString().padStart(2, '0')}:{Math.floor(elapsed % 60).toString().padStart(2, '0')} / {Math.floor(durationRef.current / 60).toString().padStart(2, '0')}:{Math.floor(durationRef.current % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4 sm:text-sm" aria-live="polite">
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-fuchsia-200">{results.score.toLocaleString()}</span>Score</div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-sky-200">{results.combo}×</span>Combo</div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-amber-200">{results.perfect}</span>Perfect</div>
        <div className="rounded-xl bg-white/5 p-3"><span className="block text-lg font-black text-emerald-200">{personalBest.toLocaleString()}</span>Best · this device</div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/5 px-3 py-2 text-sm"><span className="font-bold text-fuchsia-200">SHOW STATUS · {getShowTier(results.combo)}</span><span className="text-xs text-white/60">Build a streak for brighter stage effects</span></div>
      <div className="overflow-hidden rounded-2xl border-2 border-fuchsia-300/25 bg-[#060716] shadow-[0_12px_44px_rgba(50,10,75,0.45)]">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-[760/360] w-full" aria-label="Rhythm highway: four falling note lanes, from left to right D F J K" />
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs" role="status" aria-live="polite">
          <span className={phase === 'playing' ? 'font-bold text-emerald-200' : 'font-medium text-white/60'}>
            {phase === 'playing' ? '● KEYBOARD ACTIVE · D F J K' : '○ KEYBOARD STANDBY · press Start set'}
          </span>
          <span className="font-medium text-fuchsia-200">Last recognized: {lastRegisteredKey || '—'}</span>
        </div>
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Rhythm hit pads: D, F, J and K">
          {LANE_KEYS.map((key, lane) => {
            const index = lane as Lane
            const isHeld = heldLanes.includes(index)
            return <button key={key} type="button"
              onPointerDown={event => {
                if (phaseRef.current !== 'playing') return
                event.preventDefault()
                event.currentTarget.setPointerCapture(event.pointerId)
                updateLanePressed(index, true)
                hitLane(index)
              }}
              onPointerUp={() => updateLanePressed(index, false)}
              onPointerCancel={() => updateLanePressed(index, false)}
              onLostPointerCapture={() => updateLanePressed(index, false)}
              onClick={event => {
                // Enter/Space can activate a focused pad for keyboard users.
                // Pointer input was already handled above; do not double-score.
                if (event.detail === 0 && phaseRef.current === 'playing') hitLane(index)
              }}
              disabled={phase !== 'playing'} aria-keyshortcuts={key.toUpperCase()}
              aria-pressed={isHeld}
              className={'min-h-16 touch-none rounded-2xl border-2 text-lg font-black transition-[background-color,box-shadow,transform] duration-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40 ' + (isHeld ? 'scale-[1.035] bg-white/25 text-white' : 'bg-white/10 text-white active:scale-95')}
              style={{ borderColor: colors[lane], boxShadow: isHeld ? '0 0 0 3px ' + colors[lane] + '66, 0 0 24px ' + colors[lane] + '88' : undefined }}
              aria-label={'Hit lane ' + key.toUpperCase()}>
              <span className="block">{key.toUpperCase()}</span>
              <span className="block text-[10px] font-bold uppercase tracking-wide">{isHeld ? 'PRESSED ✓' : 'TAP / KEY'}</span>
            </button>
          })}
        </div>
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
      <div className="space-y-3" aria-label="Original one-minute Beat Deck songs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-amber-200"><Sparkles className="h-4 w-4" /> Three original 60-second tracks</h3>
          <span className="text-xs text-white/55">Select a track to switch its sounds, beat map and light show</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {BEAT_DECK_ORIGINALS.map(song => (
            <button type="button" key={song.id} onClick={() => selectSong(song.id)} aria-pressed={selected === song.id}
              disabled={phase === 'loading'} className={'group relative min-w-0 overflow-hidden rounded-2xl border-2 p-3 text-left transition-transform motion-safe:hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 ' +
              (selected === song.id ? 'border-amber-300 shadow-[0_0_0_2px_rgba(251,191,36,.18)]' : 'border-white/20 hover:border-white/50')}>
              <span className="pointer-events-none absolute inset-0 opacity-90" style={{ background: 'linear-gradient(145deg, ' + song.tint.join(',') + ')' }} />
              <span className="relative flex h-14 items-end gap-1 overflow-hidden rounded-lg bg-black/20 px-3 pb-2" aria-hidden="true">
                {Array.from({ length: 17 }, (_, index) => (
                  <span key={index} className="w-full rounded-full bg-white/65"
                    style={{ height: (8 + (index * 13 + song.bpm) % 29) + 'px', opacity: 0.45 + index % 3 * .16 }} />
                ))}
              </span>
              <span className="relative mt-2 block text-[10px] font-bold uppercase tracking-widest text-white/75">{song.genre}</span>
              <span className="relative mt-0.5 block text-base font-black text-white">{song.title}</span>
              <span className="relative mt-1 flex items-center justify-between text-xs font-semibold text-white/85"><span>{song.bpm} BPM · {song.key}</span><span>1:00</span></span>
              {selected === song.id && <span className="relative mt-2 block text-[10px] font-black uppercase tracking-wider text-amber-200">◆ Selected · Ready to play</span>}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-white/60">Original, procedurally synthesized instrumentals: drums, bass, chords and lead melody. Every target note follows the same musical clock. No external samples or streaming permissions required.</p>
      </div>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4" aria-label="Beat Deck set and stage settings">
        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-fuchsia-200">Setlist & stage settings</h3>
      <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
        <label className="text-xs font-medium text-white/80">Choose your track
          <select value={selected} disabled={phase === 'loading'} onChange={e => selectSong(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-white/20 bg-[#211a3a] px-3 text-base text-white">
            <optgroup label="Original 60-second Beat Deck tracks">
              {BEAT_DECK_ORIGINALS.map(song => <option key={song.id} value={song.id}>{song.title} · {song.bpm} BPM · 1:00</option>)}
            </optgroup>
            <option value="practice">🎛️ Classic practice beat · 30s</option>
            {tracks.map(track => <option value={track.id} key={track.id}>{track.title}{track.genre ? ' · ' + track.genre : ''}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-white/80">{selectedOriginal ? 'Original song tempo (locked)' : 'Chart tempo'} · <strong className="text-fuchsia-200">{tempo} BPM</strong>
          <input type="range" min={65} max={200} step={5} value={tempo} disabled={Boolean(selectedOriginal)} onChange={e => setTempo(Number(e.target.value))} className="mt-1 block min-h-11 w-full accent-fuchsia-400 disabled:opacity-45" />
          {selectedOriginal && <span className="mt-1 block text-[11px] text-white/55">The tempo stays fixed so notes match the actual music.</span>}
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="min-w-[220px] text-xs font-medium text-white/80">Concert venue
          <select value={stage} onChange={event => setStage(event.target.value as BeatDeckStage)} className="mt-1 block min-h-11 w-full rounded-xl border border-white/20 bg-[#211a3a] px-3 text-base text-white">
            {BEAT_DECK_STAGES.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-white/80"><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} className="h-4 w-4 accent-fuchsia-400" /> Calm stage lighting</label>
      </div>
      <p className="text-xs text-white/55"><Headphones className="mr-1 inline h-3.5 w-3.5" />The three original 60-second songs work offline after the page loads. For published artist tracks: {catalogMessage}. Artist uploads still use permission-checked streaming.</p>

      </div>
      {phase === 'finished' && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/10 p-4 text-sm">
        <div><p className="font-black text-white">🎉 Set complete! {selectedOriginal ? selectedOriginal.title + ' · 1:00' : ''}</p>
          <p className="mt-1 text-fuchsia-100/80">Final score: {results.score.toLocaleString()} · Best combo: {results.bestCombo}× · Perfect: {results.perfect} · Good: {results.good} · Missed: {results.missed}</p>
          <p className="mt-1 text-xs text-white/60">Finished music never autoplays the next track. Choose another original set whenever you're ready.</p>
        </div>
        {selectedOriginal && <button type="button" onClick={() => selectSong(getNextOriginalSong(selectedOriginal.id).id)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-slate-950 hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Next set: {getNextOriginalSong(selectedOriginal.id).title} →
        </button>}
      </div>}
      <p className="text-xs leading-relaxed text-white/45"><Volume2 className="mr-1 inline h-3.5 w-3.5" />Sound begins only after Start. Pause stops the music and chart clock together. The three original tracks are synthesized live, not recordings or copyrighted samples; external artist songs retain entitlement checks.</p>
    </section>
  )
}
