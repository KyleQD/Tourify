"use client"

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type LoadingVariant = 'pulse' | 'rotate' | 'glow' | 'particles' | 'waves' | 'orbit' | 'breathe'

// Canonical asset in public/ is SVG; avoid 404ing missing /images/*.png first.
const DEFAULT_LOGO = '/tourify-logo-white.svg'
const LEGACY_PNG_LOGO = '/images/tourify-logo-white.png'

interface BrandLoadingScreenProps {
  message?: string
  subMessage?: string
  variant?: LoadingVariant
  showProgress?: boolean
  progress?: number
  fullScreen?: boolean
  logoSrc?: string
  primaryColor?: string
  secondaryColor?: string
  onComplete?: () => void
}

interface LoadingContainerProps {
  children: React.ReactNode
  fullScreen: boolean
}

function loadingHeading(message: string) {
  const trimmed = message.trim()
  if (!trimmed) return 'Loading'
  return trimmed.replace(/\.+$/u, '').trim() || 'Loading'
}

function uniqueLogoCandidates(logoSrc: string) {
  return [...new Set([logoSrc, DEFAULT_LOGO, LEGACY_PNG_LOGO])].filter(Boolean)
}

function LoadingContainer({ children, fullScreen }: LoadingContainerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-zinc-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(139,92,246,0.22),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_100%,rgba(59,130,246,0.14),transparent_50%)]" />
          <div className="absolute -top-28 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.5),transparent_45%)]" />
        </div>
        <div className="relative z-10 w-full max-w-sm px-5 sm:max-w-md sm:px-6">{children}</div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-52 w-52 rounded-full bg-blue-500/12 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-sm sm:max-w-md">{children}</div>
    </div>
  )
}

export function BrandLoadingScreen({
  message = 'Loading',
  subMessage = 'Preparing your Tourify experience',
  variant = 'glow',
  showProgress = false,
  progress = 0,
  fullScreen = true,
  logoSrc = DEFAULT_LOGO,
  primaryColor,
  secondaryColor,
  onComplete
}: BrandLoadingScreenProps) {
  const logoCandidates = useMemo(() => uniqueLogoCandidates(logoSrc), [logoSrc])
  const [logoAttempt, setLogoAttempt] = useState(0)
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  useEffect(() => {
    setLogoAttempt(0)
  }, [logoSrc])

  const displayLogoSrc =
    logoCandidates[Math.min(logoAttempt, logoCandidates.length - 1)] ?? DEFAULT_LOGO

  useEffect(() => {
    if (!showProgress) return
    if (progress > 0) {
      setSimulatedProgress(progress)
      return
    }

    const interval = setInterval(() => {
      setSimulatedProgress((currentValue) => {
        if (currentValue >= 95) return 95
        return currentValue + Math.random() * 4 + 1
      })
    }, 120)

    return () => clearInterval(interval)
  }, [progress, showProgress])

  const effectiveProgress = useMemo(() => {
    if (!showProgress) return 0
    return Math.min(100, progress > 0 ? progress : simulatedProgress)
  }, [progress, showProgress, simulatedProgress])

  useEffect(() => {
    if (!onComplete || !showProgress) return
    if (effectiveProgress < 100) return

    const timer = setTimeout(() => onComplete(), 250)
    return () => clearTimeout(timer)
  }, [effectiveProgress, onComplete, showProgress])

  const styleVars = {
    '--brand-primary': primaryColor ?? 'rgba(168, 85, 247, 1)',
    '--brand-secondary': secondaryColor ?? 'rgba(59, 130, 246, 1)'
  } as React.CSSProperties

  function handleLogoError() {
    setLogoAttempt((attempt) =>
      attempt < logoCandidates.length - 1 ? attempt + 1 : attempt
    )
  }

  const heading = loadingHeading(message)

  const cardVariantClass =
    variant === 'pulse'
      ? 'ring-1 ring-violet-500/25'
      : variant === 'glow'
        ? 'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_25px_80px_-20px_rgba(139,92,246,0.35),0_18px_50px_-24px_rgba(59,130,246,0.2)]'
        : ''

  return (
    <LoadingContainer fullScreen={fullScreen}>
      <Card
        className={cn(
          'relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/45 p-9 shadow-2xl backdrop-blur-2xl sm:rounded-3xl sm:p-10',
          cardVariantClass
        )}
        style={styleVars}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-transparent" />
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-violet-500/[0.14] via-transparent to-sky-500/[0.12] opacity-70 sm:rounded-3xl" />

        <div className="relative flex flex-col items-center gap-7 text-center">
          <div className="relative flex h-[4.5rem] w-full max-w-[220px] items-center justify-center rounded-xl px-4 py-3 ring-1 ring-white/10 sm:h-[5rem] sm:max-w-[240px]">
            <div
              className={cn(
                'absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/10 via-transparent to-sky-500/10',
                variant === 'pulse' && 'motion-safe:animate-pulse'
              )}
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- dynamic public paths + chained fallbacks */}
            <img
              src={displayLogoSrc}
              alt="Tourify"
              width={220}
              height={72}
              decoding="async"
              fetchPriority={fullScreen ? 'high' : 'auto'}
              onError={handleLogoError}
              className="relative z-[1] h-12 w-auto max-w-full object-contain object-center drop-shadow-[0_0_20px_rgba(167,139,250,0.35)] sm:h-14"
            />
          </div>

          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2.5">
              <Loader2
                className="h-5 w-5 shrink-0 animate-spin text-violet-400/90"
                aria-hidden
              />
              <p className="text-lg font-semibold tracking-tight text-white sm:text-xl">{heading}</p>
            </div>
            <p className="max-w-[280px] text-sm leading-relaxed text-zinc-400 sm:max-w-xs">{subMessage}</p>
          </div>

          {showProgress ? (
            <div className="w-full max-w-xs space-y-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400/90 to-sky-400 transition-[width] duration-300 ease-out"
                  style={{ width: `${effectiveProgress}%` }}
                />
              </div>
              <p className="text-xs tabular-nums text-zinc-500">{Math.round(effectiveProgress)}%</p>
            </div>
          ) : (
            <div className="flex h-5 items-center gap-1.5" aria-hidden>
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-gradient-to-r from-violet-300 to-sky-300/90 shadow-[0_0_8px_rgba(167,139,250,0.45)]"
                  style={{ animationDelay: `${item * 140}ms` }}
                />
              ))}
            </div>
          )}

          <span className="text-[0.65rem] font-medium uppercase tracking-[0.32em] text-zinc-500">Tourify</span>
        </div>
      </Card>
    </LoadingContainer>
  )
}

export const TourifyLoading = {
  Pulse: (props: Omit<BrandLoadingScreenProps, 'variant'>) => (
    <BrandLoadingScreen {...props} variant="pulse" />
  ),
  Glow: (props: Omit<BrandLoadingScreenProps, 'variant'>) => (
    <BrandLoadingScreen {...props} variant="glow" />
  ),
  Particles: (props: Omit<BrandLoadingScreenProps, 'variant'>) => (
    <BrandLoadingScreen {...props} variant="particles" />
  ),
  Waves: (props: Omit<BrandLoadingScreenProps, 'variant'>) => (
    <BrandLoadingScreen {...props} variant="waves" />
  ),
  Orbit: (props: Omit<BrandLoadingScreenProps, 'variant'>) => (
    <BrandLoadingScreen {...props} variant="orbit" />
  ),
  Breathe: (props: Omit<BrandLoadingScreenProps, 'variant'>) => (
    <BrandLoadingScreen {...props} variant="breathe" />
  )
}

export function useBrandLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'initializing' | 'loading' | 'finalizing' | 'complete'>('initializing')

  function startLoading(duration = 3000) {
    setIsLoading(true)
    setProgress(0)
    setPhase('initializing')

    const interval = setInterval(() => {
      setProgress((currentProgress) => {
        const nextProgress = Math.min(100, currentProgress + Math.random() * 6 + 1)

        if (nextProgress >= 100) {
          setPhase('complete')
          clearInterval(interval)
          setTimeout(() => setIsLoading(false), 300)
          return 100
        }

        if (nextProgress > 75) setPhase('finalizing')
        else if (nextProgress > 30) setPhase('loading')

        return nextProgress
      })
    }, Math.max(80, Math.floor(duration / 40)))

    return () => clearInterval(interval)
  }

  function stopLoading() {
    setProgress(100)
    setPhase('complete')
    setIsLoading(false)
  }

  return {
    isLoading,
    progress,
    phase,
    startLoading,
    stopLoading
  }
}
