'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useJukeboxOptional } from '@/contexts/jukebox-context'
import { readPersonalBest, savePersonalBest } from '@/lib/arcade/personal-best'
import { DJBoothFinale } from '@/components/arcade/dj-booth-finale'
import { DJ_CHAPTERS, DJ_CHAPTER_WORLDS, getDJChapter, getDJChapterCheckpoint, getDJChapterDistrictLabel, type DJChapterId } from '@/lib/arcade/dj-world-tour'
import { drawDJChapterScenery } from '@/lib/arcade/dj-world-art'
import { ArrowLeft, ArrowRight, Heart, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import {
  DJ_GRAVITY, DJ_JUMP_SPEED, DJ_RECORDS_NEEDED, DJ_RUN_SPEED,
  DJ_VIEW_HEIGHT, DJ_VIEW_WIDTH, DJ_WORLD_WIDTH,
  intersects, portalOpen, calculateDJRunScore, canDJJump, getDJDistrict, type DJDistrict, type Rect,
} from '@/lib/arcade/dj-quest-level'

type Phase = 'ready' | 'playing' | 'paused' | 'won' | 'gameover'
interface Hero extends Rect { vy: number; grounded: boolean; lastGroundedAt: number; lives: number; records: number; checkpoint: number; invulnerableUntil: number }
const startHero = (): Hero => ({
  x: 54, y: 260, w: 28, h: 39, vy: 0, grounded: false, lastGroundedAt: Number.NEGATIVE_INFINITY, lives: 3,
  records: 0, checkpoint: 54, invulnerableUntil: 0,
})
const baseRecords = () => new Set<number>()
const baseEnemies = () => new Set<number>()

export function DJQuestGame() {
  const jukebox = useJukeboxOptional()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLElement>(null)
  const heroRef = useRef<Hero>(startHero())
  const phaseRef = useRef<Phase>('ready')
  const heldRef = useRef(new Set<string>())
  const jumpQueuedAtRef = useRef(Number.NEGATIVE_INFINITY)
  const collectedRef = useRef(baseRecords())
  const defeatedRef = useRef(baseEnemies())
  const worldTimeRef = useRef(0)
  const cameraRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const lastInfoRef = useRef(false)
  const chapterRef = useRef(DJ_CHAPTERS[0])
  const sceneRevisionRef = useRef(0)
  const [chapterId, setChapterId] = useState<DJChapterId>('studio54')
  const chapter = getDJChapter(chapterId)
  const lastHudTickRef = useRef(0)
  const districtRef = useRef<DJDistrict>('record-row')
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState({ records: 0, lives: 3 })
  const [hint, setHint] = useState('Collect records, jump over club security, and reach Studio 54.')
  const [muted, setMuted] = useState(false)
  const [winScore, setWinScore] = useState<number | null>(null)
  const [progressPercent, setProgressPercent] = useState(0)
  const [personalBest, setPersonalBest] = useState(0)

  useEffect(() => { setPersonalBest(readPersonalBest('dj-odyssey', 'first-level')) }, [])
  const scoreKey = (id: DJChapterId) => id === 'studio54' ? 'first-level' : 'tour:' + id

  const setGamePhase = (next: Phase) => { phaseRef.current = next; setPhase(next) }
  const fx = (pitch: number, seconds = 0.09) => {
    if (mutedRef.current || !audioContextRef.current) return
    const ctx = audioContextRef.current
    if (ctx.state !== 'running') return
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(pitch, ctx.currentTime)
    gain.gain.setValueAtTime(0.04, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds)
    oscillator.connect(gain); gain.connect(ctx.destination)
    oscillator.start(); oscillator.stop(ctx.currentTime + seconds)
  }
  const restart = () => {
    sceneRevisionRef.current += 1
    heroRef.current = startHero()
    collectedRef.current = baseRecords()
    defeatedRef.current = baseEnemies()
    heldRef.current.clear()
    jumpQueuedAtRef.current = Number.NEGATIVE_INFINITY
    worldTimeRef.current = 0
    cameraRef.current = 0
    lastInfoRef.current = false
    lastHudTickRef.current = 0
    districtRef.current = 'record-row'
    setProgressPercent(0)
    setHud({ records: 0, lives: 3 })
    setWinScore(null)
    setHint('Collect records and reach ' + chapterRef.current.name + '!')
    setGamePhase('ready')
  }
  const changeChapter = (id: DJChapterId) => {
    if (phaseRef.current === 'playing') return
    chapterRef.current = getDJChapter(id)
    setChapterId(id)
    restart()
    setPersonalBest(readPersonalBest('dj-odyssey', scoreKey(id)))
    setHint(chapterRef.current.description)
  }
  const play = () => {
    if (phaseRef.current === 'won' || phaseRef.current === 'gameover') restart()
    if (jukebox?.state.isPlaying) jukebox.pause()
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        if (!audioContextRef.current) audioContextRef.current = new window.AudioContext()
        void audioContextRef.current.resume().catch(() => {})
      } catch { /* gameplay works silently */ }
    }
    setGamePhase('playing')
    rootRef.current?.focus()
  }
  const pause = () => {
    if (phaseRef.current === 'playing') { heldRef.current.clear(); setGamePhase('paused') }
    else if (phaseRef.current === 'paused') play()
  }

  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement)) return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return
      const k = event.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'arrowup', 'a', 'd', 'w', ' '].includes(k)) {
        event.preventDefault()
        if (!event.repeat && phaseRef.current === 'playing' && ['arrowup', 'w', ' '].includes(k)) jumpQueuedAtRef.current = worldTimeRef.current
        heldRef.current.add(k)
      }
      if (k === 'escape' && !event.repeat) pauseFnRef.current()
    }
    const handleUp = (event: KeyboardEvent) => heldRef.current.delete(event.key.toLowerCase())
    const releaseAll = () => heldRef.current.clear()
    window.addEventListener('keydown', handleDown)
    window.addEventListener('keyup', handleUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      window.removeEventListener('keydown', handleDown)
      window.removeEventListener('keyup', handleUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [])
  const pauseFnRef = useRef(() => {})
  pauseFnRef.current = pause

  useEffect(() => {
    const hidden = () => { if (document.hidden && phaseRef.current === 'playing') pauseFnRef.current() }
    document.addEventListener('visibilitychange', hidden)
    return () => document.removeEventListener('visibilitychange', hidden)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    let frame = 0
    let previous = 0
    let drawnPhase: Phase | null = null
    let drawnRevision = -1
    function step(dt: number) {
      const h = heroRef.current
      const scene = chapterRef.current
      const world = DJ_CHAPTER_WORLDS[scene.id]
      worldTimeRef.current += dt
      const movingLeft = heldRef.current.has('arrowleft') || heldRef.current.has('a')
      const movingRight = heldRef.current.has('arrowright') || heldRef.current.has('d')
      const dx = (Number(movingRight) - Number(movingLeft)) * DJ_RUN_SPEED
      if (h.grounded) h.lastGroundedAt = worldTimeRef.current
      if (canDJJump(worldTimeRef.current, h.lastGroundedAt, jumpQueuedAtRef.current)) {
        h.vy = DJ_JUMP_SPEED
        h.grounded = false
        h.lastGroundedAt = Number.NEGATIVE_INFINITY
        jumpQueuedAtRef.current = Number.NEGATIVE_INFINITY
        fx(340)
      }
      const beforeBottom = h.y + h.h
      h.x = Math.max(0, Math.min(DJ_WORLD_WIDTH - h.w, h.x + dx * dt))
      h.vy += DJ_GRAVITY * dt
      h.y += h.vy * dt
      h.grounded = false
      for (const platform of world.platforms) {
        const touchesTop =
          h.vy >= 0 && beforeBottom <= platform.y + 9 &&
          h.y + h.h >= platform.y &&
          h.x + h.w > platform.x + 4 && h.x < platform.x + platform.w - 4
        if (touchesTop) { h.y = platform.y - h.h; h.vy = 0; h.grounded = true }
      }
      if (h.grounded) {
        h.lastGroundedAt = worldTimeRef.current
        if (canDJJump(worldTimeRef.current, h.lastGroundedAt, jumpQueuedAtRef.current)) {
          h.vy = DJ_JUMP_SPEED
          h.y -= 1
          h.grounded = false
          h.lastGroundedAt = Number.NEGATIVE_INFINITY
          jumpQueuedAtRef.current = Number.NEGATIVE_INFINITY
          fx(340)
        }
      }
      if (h.y > DJ_VIEW_HEIGHT + 100) { loseLifeFnRef.current(); return }

      const checkpoint = getDJChapterCheckpoint(scene, h.x)
      if (checkpoint > h.checkpoint) h.checkpoint = checkpoint
      const nextDistrict = getDJDistrict(h.x)
      if (nextDistrict !== districtRef.current) {
        districtRef.current = nextDistrict
        setHint('Now exploring ' + getDJChapterDistrictLabel(scene, h.x) + '!')
      }
      if (worldTimeRef.current - lastHudTickRef.current > 0.15) {
        lastHudTickRef.current = worldTimeRef.current
        setProgressPercent(Math.min(100, Math.max(0, Math.round(100 * h.x / (DJ_WORLD_WIDTH - 140)))))
      }

      world.records.forEach((record, index) => {
        if (collectedRef.current.has(index)) return
        if (Math.abs(h.x + h.w / 2 - record.x) < 23 && Math.abs(h.y + h.h / 2 - record.y) < 31) {
          collectedRef.current.add(index)
          h.records++
          fx(750, 0.14)
          setHud({ records: h.records, lives: h.lives })
          if (h.records === DJ_RECORDS_NEEDED) setHint('The guest list is ready! Reach ' + scene.name + '!')
        }
      })
      // Respawn stops collision simulation immediately; a fatal collision
      // must not simultaneously trigger the level's win portal.
      const damaged = world.enemies.some((enemy, index) => {
        if (defeatedRef.current.has(index)) return false
        const enemyX = enemy.x + Math.sin(worldTimeRef.current * enemy.speed + index) * enemy.patrol
        const enemyRect = { x: enemyX, y: enemy.y, w: enemy.w, h: enemy.h }
        if (!intersects(h, enemyRect) || worldTimeRef.current < h.invulnerableUntil) return false
        if (beforeBottom <= enemy.y + 12 && h.vy > 70) {
          defeatedRef.current.add(index); h.vy = -355; h.grounded = false; fx(560, 0.15)
          return false
        }
        loseLifeFnRef.current()
        return true
      })
      if (damaged) return

      if (h.x > DJ_WORLD_WIDTH - 170) {
        if (portalOpen(h.records)) {
          const score = calculateDJRunScore(h.records, h.lives, defeatedRef.current.size, worldTimeRef.current)
          setWinScore(score)
          setPersonalBest(savePersonalBest('dj-odyssey', scoreKey(scene.id), score))
          setGamePhase('won')
          setHint('You made it to ' + scene.name + '! The DJ booth is yours. 🎉')
          fx(900, 0.3)
        } else if (!lastInfoRef.current) {
          lastInfoRef.current = true
          setHint('The door needs ' + (DJ_RECORDS_NEEDED - h.records) + ' more records. Explore the level!')
        }
      }
      cameraRef.current = Math.max(0, Math.min(DJ_WORLD_WIDTH - DJ_VIEW_WIDTH, h.x - DJ_VIEW_WIDTH * 0.35))
    }
    function draw() {
      if (!ctx) return
      const scene = chapterRef.current
      const world = DJ_CHAPTER_WORLDS[scene.id]
      const time = worldTimeRef.current
      const cam = cameraRef.current
      const zone = getDJDistrict(heroRef.current.x)
      const palette = scene.id === 'studio54'
        ? zone === 'record-row' ? ['#100b2c', '#261340', '#4e205b']
          : zone === 'subway-beats' ? ['#0b1a30', '#19364b', '#33546f']
            : ['#1c0b36', '#50204e', '#714156']
        : scene.backdrop
      const background = ctx.createLinearGradient(0, 0, 0, DJ_VIEW_HEIGHT)
      background.addColorStop(0, palette[0]); background.addColorStop(0.65, palette[1]); background.addColorStop(1, palette[2])
      ctx.fillStyle = background; ctx.fillRect(0, 0, DJ_VIEW_WIDTH, DJ_VIEW_HEIGHT)
      // NYC / Sunset Strip skyline; other destinations have original island/city art.
      if (scene.id === 'studio54' || scene.id === 'whisky') for (let i = 0; i < 30; i++) {
        const bx = (i * 132 - cam * 0.32) % (DJ_WORLD_WIDTH * 0.46)
        const height = 90 + (i * 53 % 138)
        ctx.fillStyle = i % 3 === 0 ? '#251c48' : '#1c1a40'
        ctx.fillRect(bx, 365 - height, 107, height)
        ctx.fillStyle = i % 2 ? '#f472b655' : '#38bdf866'
        for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++)
          if ((row + col + i) % 3 !== 0) ctx.fillRect(bx + 12 + col * 28, 376 - height + row * 26, 9, 11)
      }
      drawDJChapterScenery(ctx, scene, cam, time, DJ_VIEW_WIDTH)
      // NYC chapter's original signs; other cities show landmark names.
      if (scene.id === 'studio54') for (const sign of [
        { x: 320, label: 'RECORD ROW', accent: '#f472b6' },
        { x: 1440, label: 'SUBWAY BEATS', accent: '#38bdf8' },
        { x: 2610, label: 'DISCO MILE', accent: '#fbbf24' },
      ]) {
        const sx = sign.x - cam
        if (sx < -240 || sx > DJ_VIEW_WIDTH + 240) continue
        ctx.fillStyle = '#140c30'; ctx.fillRect(sx - 116, 106, 232, 45)
        ctx.strokeStyle = sign.accent; ctx.lineWidth = 3; ctx.strokeRect(sx - 116, 106, 232, 45)
        ctx.fillStyle = sign.accent; ctx.textAlign = 'center'; ctx.font = 'bold 20px monospace'
        ctx.fillText(sign.label, sx, 135)
      }
      ctx.fillStyle = '#a78bfa13'
      for (let i = 0; i < 7; i++) {
        ctx.beginPath(); ctx.moveTo((i * 170 - cam * 0.08) % 930, 0)
        ctx.lineTo((i * 170 - cam * 0.08) % 930 - 72, 360)
        ctx.lineTo((i * 170 - cam * 0.08) % 930 + 72, 360)
        ctx.fill()
      }

      for (const p of world.platforms) {
        const x = p.x - cam
        if (x + p.w < 0 || x > DJ_VIEW_WIDTH) continue
        ctx.fillStyle = scene.id === 'amnesia' ? '#b39476' : scene.id === 'whisky' ? '#54344b' : '#31254b'; ctx.fillRect(x, p.y, p.w, p.h)
        ctx.fillStyle = scene.accent; ctx.fillRect(x, p.y, p.w, 5)
        ctx.fillStyle = scene.id === 'amnesia' ? '#fce5bb' : '#b163d0'; ctx.fillRect(x + 3, p.y + 8, p.w - 6, 3)
      }

      world.records.forEach((record, index) => {
        if (collectedRef.current.has(index)) return
        const x = record.x - cam
        if (x < -20 || x > DJ_VIEW_WIDTH + 20) return
        const y = record.y + Math.sin(time * 4 + index) * 5
        ctx.save(); ctx.translate(x, y); ctx.rotate(time * 0.9)
        ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 12
        ctx.fillStyle = '#181025'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.stroke()
        ctx.strokeStyle = '#f472b6'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(-3, -3, 6, 6)
        ctx.restore()
      })

      world.enemies.forEach((enemy, index) => {
        if (defeatedRef.current.has(index)) return
        const x = enemy.x + Math.sin(time * enemy.speed + index) * enemy.patrol - cam
        if (x < -70 || x > DJ_VIEW_WIDTH + 50) return
        ctx.save()
        if (enemy.name === 'bouncer') {
          ctx.fillStyle = '#f9b38d'; ctx.fillRect(x + 4, enemy.y + 3, 22, 13)
          ctx.fillStyle = '#111124'; ctx.fillRect(x + 3, enemy.y, 24, 6)
          ctx.fillRect(x + 3, enemy.y + 9, 24, 5)
          ctx.fillStyle = '#d946ef'; ctx.fillRect(x + 1, enemy.y + 16, 28, 18)
          ctx.fillStyle = '#140a2e'; ctx.fillRect(x + 12, enemy.y + 18, 6, 11)
        } else if (enemy.name === 'speaker') {
          ctx.fillStyle = '#111827'; ctx.fillRect(x, enemy.y, 32, 33)
          ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.strokeRect(x, enemy.y, 32, 33)
          ctx.fillStyle = '#e879f9'; ctx.beginPath(); ctx.arc(x + 16, enemy.y + 22, 9, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(x + 16, enemy.y + 22, 4, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 15
          ctx.fillStyle = '#67e8f9'
          ctx.beginPath(); ctx.arc(x + 14, enemy.y + 15, 15, Math.PI, 0)
          ctx.lineTo(x + 29, enemy.y + 34); ctx.lineTo(x + 23, enemy.y + 28); ctx.lineTo(x + 14, enemy.y + 34); ctx.lineTo(x + 6, enemy.y + 28); ctx.lineTo(x, enemy.y + 34); ctx.closePath(); ctx.fill()
          ctx.fillStyle = '#1a1333'; ctx.fillRect(x + 7, enemy.y + 14, 5, 6); ctx.fillRect(x + 19, enemy.y + 14, 5, 6)
        }
        ctx.restore()
      })

      // Fictional illustrative arrival gate; no venue logos or facade copies.
      const goalX = DJ_WORLD_WIDTH - 148 - cam
      ctx.fillStyle = '#1b1430'; ctx.fillRect(goalX, 210, 135, 155)
      ctx.shadowColor = portalOpen(heroRef.current.records) ? '#fbbf24' : scene.accent; ctx.shadowBlur = 18
      ctx.strokeStyle = portalOpen(heroRef.current.records) ? '#fbbf24' : scene.accent
      ctx.lineWidth = 6; ctx.strokeRect(goalX, 210, 135, 155); ctx.shadowBlur = 0
      ctx.fillStyle = '#fef3c7'; ctx.font = 'bold 21px monospace'; ctx.textAlign = 'center'
      ctx.fillText(scene.gateName, goalX + 67, 244, 125)
      ctx.font = scene.id === 'studio54' ? 'bold 45px monospace' : 'bold 26px monospace'; ctx.fillText(scene.gateSubtitle, goalX + 67, 289, 125)
      ctx.fillStyle = scene.accent; ctx.fillRect(goalX + 30, 317, 75, 48)
      ctx.fillStyle = '#100b2c'; ctx.fillRect(goalX + 34, 322, 67, 43)

      const h = heroRef.current
      const px = h.x - cam
      if (h.invulnerableUntil < time || Math.floor(time * 10) % 2 === 0) {
        // Original pixel DJ hero: headphones, shades, varsity jacket and shoes.
        ctx.fillStyle = '#1c1228'; ctx.fillRect(px + 2, h.y + 9, 24, 27)
        ctx.fillStyle = '#f5ba91'; ctx.fillRect(px + 5, h.y + 5, 18, 13)
        ctx.fillStyle = '#161229'; ctx.fillRect(px + 5, h.y + 1, 18, 6)
        ctx.fillStyle = '#22d3ee'; ctx.fillRect(px + 2, h.y + 5, 5, 13); ctx.fillRect(px + 21, h.y + 5, 5, 13)
        ctx.fillStyle = '#0b1230'; ctx.fillRect(px + 6, h.y + 11, 17, 4)
        ctx.fillStyle = '#ec4899'; ctx.fillRect(px + 2, h.y + 20, 24, 12)
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('DJ', px + 14, h.y + 29)
        ctx.fillStyle = '#0d1226'; ctx.fillRect(px + 2, h.y + 32, 10, 7); ctx.fillRect(px + 17, h.y + 32, 10, 7)
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(px, h.y + 36, 12, 3); ctx.fillRect(px + 17, h.y + 36, 12, 3)
      }

      ctx.fillStyle = '#0a082cdd'; ctx.fillRect(0, 0, DJ_VIEW_WIDTH, 43)
      ctx.font = 'bold 17px monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#fef3c7'
      ctx.fillText('VINYL ' + heroRef.current.records + '/' + DJ_RECORDS_NEEDED, 19, 28)
      ctx.fillStyle = '#fb7185'; ctx.fillText('♥'.repeat(Math.max(0, heroRef.current.lives)), 222, 28)
      ctx.textAlign = 'right'; ctx.fillStyle = '#e9d5ff'
      ctx.fillText('TO ' + scene.name.toUpperCase() + '  ' + Math.max(0, Math.floor((DJ_WORLD_WIDTH - heroRef.current.x) / 10)) + 'm', DJ_VIEW_WIDTH - 20, 28, 560)
      if (phaseRef.current !== 'playing') {
        ctx.fillStyle = '#09071abb'; ctx.fillRect(0, 43, DJ_VIEW_WIDTH, 377)
        ctx.textAlign = 'center'; ctx.fillStyle = '#faf5ff'; ctx.font = 'bold 40px monospace'
        ctx.fillText(phaseRef.current === 'won' ? scene.name.toUpperCase() + '! ✦' : phaseRef.current === 'gameover' ? 'GAME OVER' : phaseRef.current === 'paused' ? 'PAUSED' : 'DJ ODYSSEY', DJ_VIEW_WIDTH / 2, 168, DJ_VIEW_WIDTH - 70)
        ctx.font = '17px monospace'; ctx.fillStyle = '#f5d0fe'
        ctx.fillText(phaseRef.current === 'won' ? 'YOU MADE THE GUEST LIST!' : 'COLLECT RECORDS • DODGE BOUNCERS', DJ_VIEW_WIDTH / 2, 212)
      }
    }
    let loseLifeFnRef = { current: () => {} }
    // No effect deps: animation owns no React props, only stable refs.
    loseLifeFnRef.current = () => {
      const h = heroRef.current
      if (worldTimeRef.current < h.invulnerableUntil) return
      h.lives--; setHud({ records: h.records, lives: h.lives })
      if (h.lives <= 0) { setGamePhase('gameover'); setHint('The club security got you! Restart for another try.'); return }
      h.x = h.checkpoint; h.y = 230; h.vy = 0; h.grounded = false
      h.lastGroundedAt = Number.NEGATIVE_INFINITY
      jumpQueuedAtRef.current = Number.NEGATIVE_INFINITY
      h.invulnerableUntil = worldTimeRef.current + 1.4
      heldRef.current.clear(); setHint('Back at the checkpoint. Keep spinning!')
    }
    const loop = (now: number) => {
      const delta = previous ? Math.min((now - previous) / 1000, 0.033) : 0
      previous = now
      if (phaseRef.current === 'playing') step(delta)
      // Render on demand while paused, finished or game over so the animation
      // does not waste GPU time rebuilding a static level every frame.
      const current = phaseRef.current
      if (current === 'playing' || current !== drawnPhase || sceneRevisionRef.current !== drawnRevision) draw()
      drawnPhase = current
      drawnRevision = sceneRevisionRef.current
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => () => { void audioContextRef.current?.close() }, [])

  function setHeld(direction: 'arrowleft' | 'arrowright', down: boolean) {
    if (down) heldRef.current.add(direction)
    else heldRef.current.delete(direction)
  }
  const pointerDirection = (direction: 'arrowleft' | 'arrowright') => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setHeld(direction, true)
    },
    onPointerUp: () => setHeld(direction, false),
    onPointerCancel: () => setHeld(direction, false),
    onLostPointerCapture: () => setHeld(direction, false),
  })

  return (
    <section ref={rootRef} tabIndex={-1} className="space-y-4 rounded-3xl border border-pink-400/25 bg-[#0e0b22] p-4 text-white outline-none sm:p-6" aria-label="DJ Odyssey platform game">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/arcade" className="inline-flex items-center gap-2 text-sm text-pink-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Arcade</Link>
        <span className="rounded-full border border-amber-400/30 bg-amber-300/10 px-3 py-1 text-xs font-bold tracking-wider text-amber-200">ORIGINAL RETRO PLATFORMER</span>
      </div>
      <h2 className="text-2xl font-black tracking-tight sm:text-3xl">DJ Odyssey: World Tour</h2>
      <p className="text-sm text-white/70">Travel through legendary nightlife cities, collect {DJ_RECORDS_NEEDED} vinyl records, dodge themed enemies and unlock the destination DJ booth. Each trip is an original, fantastical side-scrolling collage—not an accurate street route.</p>
      <div className="space-y-3" aria-label="Choose a world tour chapter">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-black uppercase tracking-[0.15em] text-amber-200">Pick your destination · 5 playable chapters</h3><span className="text-xs text-white/55">{phase === 'playing' ? 'Pause before switching chapters' : 'Choose any destination to begin'}</span></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {DJ_CHAPTERS.map(option => <button type="button" key={option.id} onClick={() => changeChapter(option.id)}
            disabled={phase === 'playing'} aria-pressed={chapterId === option.id}
            className={'min-h-[122px] min-w-0 rounded-2xl border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 ' + (chapterId === option.id ? 'border-amber-300 bg-amber-200/15' : 'border-white/15 bg-white/5 hover:border-white/40')}
            style={{ borderTopColor: option.accent }}>
            <span className="block text-[10px] font-black tracking-[0.12em] text-white/55">{option.city} · {option.country}</span>
            <span className="mt-2 block text-sm font-black leading-tight text-white">{option.name}</span>
            <span className="mt-2 block text-[11px] leading-snug text-white/70">{option.genre}</span>
          </button>)}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"><span className="font-black" style={{ color: chapter.accent }}>{chapter.tagline}</span><p className="mt-1 leading-relaxed text-white/75">{chapter.description}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-white/85">
        <span className="flex items-center gap-1.5 text-amber-200">◉ {hud.records} / {DJ_RECORDS_NEEDED} records</span>
        <span className="flex items-center gap-1.5 text-pink-200"><Heart className="h-4 w-4" /> {hud.lives} lives</span>
        <span className="text-emerald-200">Best: {personalBest.toLocaleString()} <span className="text-white/50">(this device)</span></span>
        <span className="ml-auto text-xs text-white/55">A/D or ←/→ move · W/Space/↑ jump</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-white/70"><span className="font-black uppercase tracking-wider text-fuchsia-200">On the way · {getDJChapterDistrictLabel(chapter, heroRef.current.x)}</span><span>Route · {progressPercent}%</span></div>
      <div role="progressbar" aria-label={'Progress to ' + chapter.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-sky-400 to-amber-300 transition-[width] duration-150 motion-reduce:transition-none" style={{ width: progressPercent + '%' }} /></div>
      <div className="overflow-hidden rounded-2xl border-2 border-fuchsia-400/30 bg-[#100d2d]">
        <canvas ref={canvasRef} width={DJ_VIEW_WIDTH} height={DJ_VIEW_HEIGHT} className="block aspect-[820/420] w-full" aria-label={'DJ Odyssey world tour in ' + chapter.city + ': jump between platforms, collect records, avoid enemies, and reach ' + chapter.name + '.'} />
      </div>
      <p className="min-h-5 text-sm font-semibold text-fuchsia-200" role="status" aria-live="polite">{hint}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Touch game controls">
          <button type="button" {...pointerDirection('arrowleft')} disabled={phase !== 'playing'}
            className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl border border-white/20 bg-white/10 disabled:opacity-35 active:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Move left"><ArrowLeft className="h-6 w-6" /></button>
          <button type="button" {...pointerDirection('arrowright')} disabled={phase !== 'playing'}
            className="flex h-14 w-14 touch-none items-center justify-center rounded-2xl border border-white/20 bg-white/10 disabled:opacity-35 active:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Move right"><ArrowRight className="h-6 w-6" /></button>
          <button type="button" onPointerDown={e => { e.preventDefault(); if (phaseRef.current === 'playing') jumpQueuedAtRef.current = worldTimeRef.current }}
            disabled={phase !== 'playing'} className="flex h-14 min-w-[92px] touch-none items-center justify-center rounded-2xl bg-sky-500 px-4 font-black disabled:opacity-35 active:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Jump">↑ JUMP</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {phase === 'playing'
            ? <button type="button" onClick={pause} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/15 px-4 font-bold hover:bg-white/25"><Pause className="h-4 w-4" /> Pause</button>
            : <button type="button" onClick={play} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-fuchsia-500 px-4 font-bold hover:bg-fuchsia-400"><Play className="h-4 w-4" /> {phase === 'paused' ? 'Resume' : phase === 'ready' ? 'Start game' : 'Play again'}</button>}
          <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 px-4 hover:bg-white/10" aria-label="Restart game"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={() => { mutedRef.current = !mutedRef.current; setMuted(mutedRef.current) }}
            className="inline-flex min-h-11 items-center rounded-xl border border-white/20 px-3 hover:bg-white/10" aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {phase === 'won' && <div role="status" className="rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">🎉 You made it! Records collected: {hud.records}. Final score: <strong>{(winScore || 0).toLocaleString()}</strong>. Your bonus DJ set is unlocked below.</div>}
      {phase === 'won' && <DJBoothFinale venueName={chapter.name} />}
      <p className="text-xs text-white/60">Movement assist: jump briefly after leaving a platform or press jump just before landing. Collect vinyl to open the final door.</p>
      <p className="text-xs text-white/45">A fictional, stylized music adventure featuring real venue names for cultural reference only. We are not affiliated with, sponsored by, or endorsed by Studio 54, Whisky a Go Go, Amnesia, fabric or Tresor. All artwork and sound effects are original; route distances and landmarks are imaginative, not geographical navigation.</p>
    </section>
  )
}
