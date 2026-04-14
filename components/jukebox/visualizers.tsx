"use client"

import React, { memo, useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface VisualizerProps {
  isPlaying: boolean
  getAudioElement?: () => HTMLAudioElement | null
}

export const DefaultBg = memo(function DefaultBg({ isPlaying }: VisualizerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-radial from-purple-900/30 via-transparent to-transparent" />
      <div
        className="absolute -inset-[50%] opacity-20"
        style={{
          background: "radial-gradient(circle at 30% 40%, rgba(168,85,247,0.4) 0%, transparent 60%), radial-gradient(circle at 70% 60%, rgba(236,72,153,0.3) 0%, transparent 60%)",
          animation: isPlaying ? "defaultDrift 12s ease-in-out infinite" : "none",
        }}
      />
      <style>{`
        @keyframes defaultDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(5%, -3%) scale(1.05); }
          66% { transform: translate(-3%, 5%) scale(0.97); }
        }
      `}</style>
    </div>
  )
})

export const NeonGlowBg = memo(function NeonGlowBg({ isPlaying }: VisualizerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-slate-950" />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${180 + i * 60}px`,
            height: `${180 + i * 60}px`,
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
            border: `2px solid`,
            borderColor: i === 0 ? "rgba(34,211,238,0.4)" : i === 1 ? "rgba(168,85,247,0.3)" : "rgba(34,211,238,0.15)",
            boxShadow: i === 0
              ? "0 0 30px rgba(34,211,238,0.3), inset 0 0 30px rgba(34,211,238,0.1)"
              : i === 1
                ? "0 0 25px rgba(168,85,247,0.25), inset 0 0 25px rgba(168,85,247,0.08)"
                : "0 0 20px rgba(34,211,238,0.1)",
          }}
          animate={isPlaying ? {
            scale: [1, 1.1 + i * 0.05, 1],
            opacity: [0.6, 1, 0.6],
          } : { scale: 1, opacity: 0.3 }}
          transition={{
            duration: 2.5 + i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}
    </div>
  )
})

export const VinylBg = memo(function VinylBg({ isPlaying }: VisualizerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-stone-950" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          animation: isPlaying ? "vinylTextureSpin 30s linear infinite" : "none",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10"
        style={{
          width: 320,
          height: 320,
          background: "repeating-radial-gradient(circle, transparent, transparent 4px, rgba(251,191,36,0.15) 4px, rgba(251,191,36,0.15) 5px)",
          animation: isPlaying ? "vinylTextureSpin 8s linear infinite" : "none",
        }}
      />
      <style>{`
        @keyframes vinylTextureSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
})

export const AuroraBg = memo(function AuroraBg({ isPlaying }: VisualizerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-slate-950" />
      {[
        { color: "rgba(52,211,153,0.25)", delay: "0s", dur: "8s", x1: "-20%", y1: "-10%", x2: "20%", y2: "10%" },
        { color: "rgba(20,184,166,0.2)", delay: "2s", dur: "10s", x1: "15%", y1: "15%", x2: "-15%", y2: "-5%" },
        { color: "rgba(16,185,129,0.15)", delay: "4s", dur: "12s", x1: "10%", y1: "-20%", x2: "-10%", y2: "15%" },
      ].map((blob, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 260 + i * 40,
            height: 200 + i * 30,
            left: `${30 + i * 15}%`,
            top: `${20 + i * 20}%`,
            background: `radial-gradient(ellipse, ${blob.color} 0%, transparent 70%)`,
            filter: "blur(40px)",
            animation: isPlaying
              ? `auroraBlob${i} ${blob.dur} ease-in-out ${blob.delay} infinite`
              : "none",
            opacity: isPlaying ? 1 : 0.4,
            transition: "opacity 0.5s",
          }}
        />
      ))}
      <style>{`
        @keyframes auroraBlob0 {
          0%, 100% { transform: translate(-20%, -10%) scale(1); }
          50% { transform: translate(20%, 10%) scale(1.2); }
        }
        @keyframes auroraBlob1 {
          0%, 100% { transform: translate(15%, 15%) scale(1.1); }
          50% { transform: translate(-15%, -5%) scale(0.9); }
        }
        @keyframes auroraBlob2 {
          0%, 100% { transform: translate(10%, -20%) scale(1); }
          50% { transform: translate(-10%, 15%) scale(1.15); }
        }
      `}</style>
    </div>
  )
})

export const SynthwaveBg = memo(function SynthwaveBg({ isPlaying }: VisualizerProps) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #0a0015 0%, #1a0030 40%, #ff006e22 70%, #ff006e11 100%)",
      }} />
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: "60%",
          backgroundImage: `
            linear-gradient(90deg, rgba(255,0,110,0.15) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255,0,110,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          transform: "perspective(400px) rotateX(60deg)",
          transformOrigin: "bottom center",
          animation: isPlaying ? "synthGridScroll 2s linear infinite" : "none",
          opacity: isPlaying ? 0.8 : 0.3,
          transition: "opacity 0.5s",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: "38%",
          width: "120%",
          height: 3,
          background: "linear-gradient(90deg, transparent 0%, #ff006e 20%, #ff006e 80%, transparent 100%)",
          boxShadow: "0 0 20px #ff006e, 0 0 60px rgba(255,0,110,0.3)",
          opacity: isPlaying ? 0.8 : 0.2,
          transition: "opacity 0.5s",
        }}
      />
      <style>{`
        @keyframes synthGridScroll {
          from { background-position: 0 0; }
          to { background-position: 0 40px; }
        }
      `}</style>
    </div>
  )
})

export const ParticlesBg = memo(function ParticlesBg({ isPlaying }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Array<{
    x: number; y: number; vx: number; vy: number; r: number; alpha: number; hue: number
  }>>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    if (particlesRef.current.length === 0) {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      for (let i = 0; i < 45; i++) {
        particlesRef.current.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.5 - 0.2,
          r: Math.random() * 2 + 1,
          alpha: Math.random() * 0.5 + 0.2,
          hue: 260 + Math.random() * 40,
        })
      }
    }

    let running = true
    function draw() {
      if (!running || !canvas || !ctx) return
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      for (const p of particlesRef.current) {
        if (isPlaying) {
          p.x += p.vx
          p.y += p.vy
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w }
          if (p.x < -10) p.x = w + 10
          if (p.x > w + 10) p.x = -10
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${isPlaying ? p.alpha : p.alpha * 0.4})`
        ctx.fill()
      }
      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [isPlaying])

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-slate-950" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
      />
    </div>
  )
})

export const RetroJukeboxBg = memo(function RetroJukeboxBg({
  isPlaying,
  getAudioElement,
}: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const dataRef = useRef<Uint8Array>(new Uint8Array(64))

  useEffect(() => {
    if (!isPlaying || !getAudioElement) return

    const audio = getAudioElement()
    if (!audio) return

    if (!ctxRef.current) {
      try {
        ctxRef.current = new AudioContext()
      } catch {
        return
      }
    }

    const audioCtx = ctxRef.current
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {})

    if (!sourceRef.current) {
      try {
        sourceRef.current = audioCtx.createMediaElementSource(audio)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.8
        sourceRef.current.connect(analyser)
        analyser.connect(audioCtx.destination)
        analyserRef.current = analyser
        dataRef.current = new Uint8Array(analyser.frequencyBinCount)
      } catch {
        // source may already be connected
      }
    }
  }, [isPlaying, getAudioElement])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio)
    }
    resize()

    let running = true
    const neonColors = [
      "#ff2d55", "#ff6b35", "#ffcc00", "#22d3ee",
      "#a855f7", "#ff2d55", "#22d3ee", "#ff6b35",
    ]

    function draw() {
      if (!running || !canvas || !ctx) return
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      ctx.fillStyle = "#0a0810"
      ctx.fillRect(0, 0, w, h)

      const analyser = analyserRef.current
      const freqData = dataRef.current
      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(freqData)
      }

      const barCount = 16
      const barWidth = (w * 0.7) / barCount
      const gap = barWidth * 0.25
      const startX = w * 0.15
      const maxBarH = h * 0.45

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * freqData.length)
        const val = isPlaying ? freqData[dataIdx] / 255 : 0.05 + Math.sin(Date.now() / 1000 + i) * 0.03
        const barH = Math.max(4, val * maxBarH)
        const x = startX + i * (barWidth + gap)
        const y = h * 0.72 - barH

        const color = neonColors[i % neonColors.length]
        ctx.shadowColor = color
        ctx.shadowBlur = 12 + val * 20
        ctx.fillStyle = color

        const r = Math.min(barWidth * 0.3, 4)
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + barWidth - r, y)
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + r)
        ctx.lineTo(x + barWidth, y + barH)
        ctx.lineTo(x, y + barH)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.fill()

        ctx.shadowBlur = 0
        ctx.fillStyle = `${color}33`
        ctx.fillRect(x, y + barH + 2, barWidth, 3)
      }

      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0

      const energy = isPlaying
        ? Array.from(freqData).reduce((s, v) => s + v, 0) / freqData.length / 255
        : 0

      const archCx = w / 2
      const archCy = h * 0.18
      const archR = w * 0.38
      ctx.beginPath()
      ctx.arc(archCx, archCy + archR * 0.3, archR, Math.PI, 0, false)
      ctx.strokeStyle = `rgba(255,45,85,${0.15 + energy * 0.35})`
      ctx.lineWidth = 3
      ctx.shadowColor = "#ff2d55"
      ctx.shadowBlur = 20 + energy * 40
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(archCx, archCy + archR * 0.3, archR + 12, Math.PI, 0, false)
      ctx.strokeStyle = `rgba(34,211,238,${0.1 + energy * 0.25})`
      ctx.lineWidth = 2
      ctx.shadowColor = "#22d3ee"
      ctx.shadowBlur = 15 + energy * 30
      ctx.stroke()

      ctx.shadowBlur = 0

      const trimY = h * 0.75
      const grad = ctx.createLinearGradient(0, trimY, w, trimY)
      grad.addColorStop(0, "rgba(120,100,80,0.1)")
      grad.addColorStop(0.3, "rgba(200,180,140,0.25)")
      grad.addColorStop(0.5, "rgba(255,230,180,0.35)")
      grad.addColorStop(0.7, "rgba(200,180,140,0.25)")
      grad.addColorStop(1, "rgba(120,100,80,0.1)")
      ctx.fillStyle = grad
      ctx.fillRect(0, trimY, w, 3)

      ctx.fillStyle = `rgba(255,230,180,${0.06 + energy * 0.08})`
      ctx.fillRect(0, trimY + 5, w, h - trimY - 5)

      const cornerR = 12
      for (const cx of [w * 0.08, w * 0.92]) {
        for (const cy of [h * 0.08, h * 0.88]) {
          ctx.beginPath()
          ctx.arc(cx, cy, cornerR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(200,180,140,${0.1 + energy * 0.15})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(cx, cy, cornerR - 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,230,180,${0.15 + energy * 0.2})`
          ctx.fill()
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    return () => {
      running = false
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
    }
  }, [isPlaying])

  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
})

const VISUALIZER_MAP: Record<string, React.ComponentType<VisualizerProps>> = {
  default: DefaultBg,
  neon: NeonGlowBg,
  vinyl: VinylBg,
  aurora: AuroraBg,
  synthwave: SynthwaveBg,
  particles: ParticlesBg,
  retrojukebox: RetroJukeboxBg,
}

export function VisualizerBackground({
  themeId,
  isPlaying,
  getAudioElement,
}: {
  themeId: string
  isPlaying: boolean
  getAudioElement?: () => HTMLAudioElement | null
}) {
  const Component = VISUALIZER_MAP[themeId] || DefaultBg
  return <Component isPlaying={isPlaying} getAudioElement={getAudioElement} />
}
