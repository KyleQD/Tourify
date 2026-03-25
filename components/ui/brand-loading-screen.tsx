"use client"

import { useState, useEffect } from 'react'
import { Zap, Music, Calendar, Users, MapPin, Radio } from 'lucide-react'
import { Card } from '@/components/ui/card'

// =============================================================================
// LOADING ANIMATION VARIANTS
// =============================================================================

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

// =============================================================================
// LOGO ANIMATIONS
// =============================================================================

const LogoAnimations = {
  pulse: `
    @keyframes logoPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .logo-pulse {
      animation: logoPulse 2s ease-in-out infinite;
    }
  `,
  
  rotate: `
    @keyframes logoRotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .logo-rotate {
      animation: logoRotate 3s linear infinite;
    }
  `,
  
  glow: `
    @keyframes logoGlow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2);
        filter: brightness(1);
      }
      50% { 
        box-shadow: 0 0 40px rgba(139, 92, 246, 0.8), 0 0 80px rgba(139, 92, 246, 0.4);
        filter: brightness(1.2);
      }
    }
    .logo-glow {
      animation: logoGlow 2.5s ease-in-out infinite;
    }
  `,
  
  breathe: `
    @keyframes logoBreathe {
      0%, 100% { 
        transform: scale(1) rotate(0deg); 
        filter: hue-rotate(0deg);
      }
      25% { 
        transform: scale(1.05) rotate(2deg); 
        filter: hue-rotate(90deg);
      }
      50% { 
        transform: scale(1.1) rotate(0deg); 
        filter: hue-rotate(180deg);
      }
      75% { 
        transform: scale(1.05) rotate(-2deg); 
        filter: hue-rotate(270deg);
      }
    }
    .logo-breathe {
      animation: logoBreathe 4s ease-in-out infinite;
    }
  `,
  
  particles: `
    @keyframes logoPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .logo-particles {
      animation: logoPulse 2s ease-in-out infinite;
    }
  `,
  
  waves: `
    @keyframes logoPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .logo-waves {
      animation: logoPulse 2s ease-in-out infinite;
    }
  `,
  
  orbit: `
    @keyframes logoPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    .logo-orbit {
      animation: logoPulse 2s ease-in-out infinite;
    }
  `
}

// =============================================================================
// PARTICLE EFFECTS
// =============================================================================

const ParticleEffect = ({ variant }: { variant: LoadingVariant }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([])

  useEffect(() => {
    if (variant === 'particles') {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 50 + (Math.cos((i / 12) * 2 * Math.PI) * 30),
        y: 50 + (Math.sin((i / 12) * 2 * Math.PI) * 30),
        delay: i * 0.1
      }))
      setParticles(newParticles)
    }
  }, [variant])

  if (variant !== 'particles') return null

  return (
    <div className="absolute inset-0">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 bg-purple-400 rounded-full animate-ping"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: '2s'
          }}
        />
      ))}
    </div>
  )
}

// =============================================================================
// WAVE EFFECT
// =============================================================================

const WaveEffect = ({ variant }: { variant: LoadingVariant }) => {
  if (variant !== 'waves') return null

  return (
    <div className="absolute inset-0 overflow-hidden rounded-full">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute inset-0 border-2 border-purple-400/30 rounded-full animate-ping"
          style={{
            animationDelay: `${i * 0.5}s`,
            animationDuration: '2s'
          }}
        />
      ))}
    </div>
  )
}

// =============================================================================
// ORBITAL ICONS
// =============================================================================

const OrbitalIcons = ({ variant }: { variant: LoadingVariant }) => {
  const icons = [Music, Calendar, Users, MapPin, Radio]
  
  if (variant !== 'orbit') return null

  return (
    <div className="absolute inset-0">
      {icons.map((Icon, i) => (
        <div
          key={i}
          className="absolute w-8 h-8 flex items-center justify-center"
          style={{
            left: `${50 + Math.cos((i / icons.length) * 2 * Math.PI + Date.now() / 1000) * 40}%`,
            top: `${50 + Math.sin((i / icons.length) * 2 * Math.PI + Date.now() / 1000) * 40}%`,
            transform: 'translate(-50%, -50%)',
            animation: `orbit 4s linear infinite`,
            animationDelay: `${i * 0.2}s`
          }}
        >
          <Icon className="w-4 h-4 text-purple-400/60" />
        </div>
      ))}
      <style jsx>{`
        @keyframes orbit {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(80px) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(80px) rotate(-360deg); }
        }
      `}</style>
    </div>
  )
}

// =============================================================================
// PROGRESS RING
// =============================================================================

const ProgressRing = ({ progress = 0, size = 120 }: { progress?: number; size?: number }) => {
  const radius = (size - 8) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(139 92 246 / 0.2)"
          strokeWidth="3"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgb(139 92 246)"
          strokeWidth="3"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
          style={{
            filter: 'drop-shadow(0 0 6px rgb(139 92 246 / 0.6))'
          }}
        />
      </svg>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function BrandLoadingScreen({
  message = "Loading Tourify...",
  subMessage = "Preparing your tour management experience",
  variant = 'glow',
  showProgress = false,
  progress = 0,
  fullScreen = true,
  logoSrc = '/tourify-logo-white.svg',
  primaryColor = 'rgb(139, 92, 246)',
  secondaryColor = 'rgb(59, 130, 246)',
  onComplete
}: BrandLoadingScreenProps) {
  const [currentProgress, setCurrentProgress] = useState(0)
  const [loadingPhase, setLoadingPhase] = useState<'initializing' | 'loading' | 'finalizing' | 'complete'>('initializing')
  const [dots, setDots] = useState('')

  // Simulate loading progress if not provided
  useEffect(() => {
    if (!showProgress) return

    const targetProgress = progress || 100
    const interval = setInterval(() => {
      setCurrentProgress(prev => {
        if (prev >= targetProgress) {
          clearInterval(interval)
          if (targetProgress >= 100) {
            setLoadingPhase('complete')
            setTimeout(() => onComplete?.(), 500)
          }
          return targetProgress
        }
        return prev + Math.random() * 3
      })
    }, 100)

    return () => clearInterval(interval)
  }, [progress, showProgress, onComplete])

  // Update loading phases
  useEffect(() => {
    if (currentProgress > 30 && loadingPhase === 'initializing') {
      setLoadingPhase('loading')
    } else if (currentProgress > 80 && loadingPhase === 'loading') {
      setLoadingPhase('finalizing')
    }
  }, [currentProgress, loadingPhase])

  // Animated dots for loading text
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Get phase-specific messages
  const getPhaseMessage = () => {
    // If message is provided and doesn't look like a default, use it
    if (message && message !== "Loading Tourify..." && !showProgress) {
      return message
    }
    
    // Otherwise use phase-based messages
    switch (loadingPhase) {
      case 'initializing':
        return message || 'Starting Up...'
      case 'loading':
        return message || 'Loading...'
      case 'finalizing':
        return message || 'Almost Ready...'
      case 'complete':
        return 'All Set!'
      default:
        return message
    }
  }

  // Main loading content - Simplified
  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-6 relative">
      {/* Logo Container with Shine Effect */}
      <div className="relative">
        {/* Main Logo with Shine Effect */}
        <div className="relative z-10 logo-container">
          <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-slate-900/50 via-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-purple-500/30 flex items-center justify-center shadow-2xl p-4 overflow-hidden">
            {/* Shine overlay */}
            <div className="absolute inset-0 shine-effect" />
            
            {/* Logo */}
            <img
              src={logoSrc}
              alt="Tourify Logo"
              className="w-full h-full object-contain drop-shadow-2xl relative z-10"
              onError={(e) => {
                // Fallback to Zap icon if logo fails to load
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  const fallback = document.createElement('div')
                  fallback.className = 'w-full h-full flex items-center justify-center'
                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
                  parent.appendChild(fallback)
                }
              }}
            />
          </div>
          
          {/* Subtle glow behind logo */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl blur-xl -z-10 animate-pulse" />
        </div>
      </div>

      {/* Brand Name - Simplified */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Tourify
          </span>
        </h1>
      </div>

      {/* Loading Message - Simplified */}
      {message && (
        <div className="space-y-2">
          <p className="text-base text-slate-400 font-light">
            {getPhaseMessage()}{dots}
          </p>
          
          {/* Progress Bar - Only show if explicitly requested */}
          {showProgress && (
            <div className="w-48 max-w-sm mx-auto">
              <div className="w-full bg-slate-800/50 rounded-full h-1 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // Inject animations
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* Shine effect animation */
      @keyframes shine {
        0% {
          transform: translateX(-100%) translateY(-100%) rotate(30deg);
        }
        100% {
          transform: translateX(100%) translateY(100%) rotate(30deg);
        }
      }
      
      .shine-effect {
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          120deg,
          transparent,
          transparent 40%,
          rgba(255, 255, 255, 0.1) 50%,
          rgba(255, 255, 255, 0.2) 55%,
          transparent 70%,
          transparent
        );
        animation: shine 3s ease-in-out infinite;
      }
      
      /* Logo container subtle pulse */
      .logo-container {
        animation: logoPulse 3s ease-in-out infinite;
      }
      
      @keyframes logoPulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.02);
        }
      }
      
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
        opacity: 0;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // Full screen variant
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Simple gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black" />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-md p-6">
          <LoadingContent />
        </div>
      </div>
    )
  }

  // Card variant
  return (
    <Card className="bg-slate-800/50 border-slate-700 mx-auto max-w-lg">
      <div className="p-12">
        <LoadingContent />
      </div>
    </Card>
  )
}

// =============================================================================
// SPECIALIZED VARIANTS
// =============================================================================

// Quick access to different loading styles
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

// =============================================================================
// LOADING HOOK FOR EASY INTEGRATION
// =============================================================================

export function useBrandLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'initializing' | 'loading' | 'finalizing' | 'complete'>('initializing')

  const startLoading = (duration = 3000) => {
    setIsLoading(true)
    setProgress(0)
    setPhase('initializing')

    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 5
        
        if (next > 30 && phase === 'initializing') setPhase('loading')
        if (next > 80 && phase === 'loading') setPhase('finalizing')
        if (next >= 100) {
          setPhase('complete')
          setTimeout(() => setIsLoading(false), 500)
          clearInterval(interval)
          return 100
        }
        
        return next
      })
    }, duration / 50)

    return () => clearInterval(interval)
  }

  const stopLoading = () => {
    setIsLoading(false)
    setProgress(100)
    setPhase('complete')
  }

  return {
    isLoading,
    progress,
    phase,
    startLoading,
    stopLoading
  }
}