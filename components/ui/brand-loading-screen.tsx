"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'

type LoadingVariant = 'pulse' | 'rotate' | 'glow' | 'particles' | 'waves' | 'orbit' | 'breathe'

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

function LoadingContainer({ children, fullScreen }: LoadingContainerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_50%)]" />
        </div>
        <div className="relative z-10 w-full max-w-md px-6">{children}</div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden px-4 py-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-52 w-52 rounded-full bg-blue-500/20 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  )
}

function getLoadingDots({ dots }: { dots: string }) {
  if (!dots) return ' '
  return dots
}

export function BrandLoadingScreen({
  message = 'Loading...',
  subMessage = 'Preparing your Tourify experience',
  variant = 'glow',
  showProgress = false,
  progress = 0,
  fullScreen = true,
  logoSrc = '/tourify-logo-white.svg',
  primaryColor,
  secondaryColor,
  onComplete
}: BrandLoadingScreenProps) {
  const [dots, setDots] = useState('')
  const [simulatedProgress, setSimulatedProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((currentDots) => (currentDots.length >= 3 ? '' : `${currentDots}.`))
    }, 450)

    return () => clearInterval(interval)
  }, [])

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

  return (
    <LoadingContainer fullScreen={fullScreen}>
      <Card
        className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl"
        style={styleVars}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent" />

        <div className="relative flex flex-col items-center gap-6 text-center">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-white/25 bg-white/15 p-4 shadow-xl backdrop-blur-xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 to-blue-400/10" />
            <img
              src={logoSrc}
              alt="Tourify logo"
              className="relative h-full w-full object-contain drop-shadow-[0_0_18px_rgba(192,132,252,0.55)]"
            />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium text-white">
              {message}
              {getLoadingDots({ dots })}
            </p>
            <p className="text-sm text-slate-300">{subMessage}</p>
          </div>

          {showProgress ? (
            <div className="w-full max-w-xs space-y-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-blue-400 transition-all duration-200"
                  style={{ width: `${effectiveProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-300">{Math.round(effectiveProgress)}%</p>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-300/90"
                  style={{ animationDelay: `${item * 120}ms` }}
                />
              ))}
            </div>
          )}

          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Tourify</span>
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
