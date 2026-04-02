"use client"

import { cn } from "@/lib/utils"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"

interface LoadingProps {
  className?: string
  variant?: 'default' | 'dots' | 'pulse' | 'glow'
  size?: 'sm' | 'md' | 'lg'
  text?: string
}

export function Loading({ className, variant = 'default', size = 'md', text }: LoadingProps) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  if (variant === 'dots') {
    return (
      <div className={cn("flex items-center justify-center space-x-2", className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse",
              size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'
            )}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
        {text && <span className="ml-3 text-slate-300 text-sm">{text}</span>}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-3", className)}>
        <div className="relative">
          <div className={cn(
            "rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse",
            sizes[size]
          )} />
          <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-50 animate-ping",
            sizes[size]
          )} />
        </div>
        {text && <span className="text-slate-300 text-sm animate-pulse">{text}</span>}
      </div>
    )
  }

  if (variant === 'glow') {
    return (
      <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
        <div className="relative">
          <div className={cn(
            "absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 opacity-75 blur-lg animate-pulse",
            sizes[size]
          )} />
          <div className={cn(
            "relative rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-spin",
            sizes[size]
          )}>
            <div className="absolute inset-2 rounded-full bg-slate-900" />
          </div>
        </div>
        {text && (
          <div className="text-center">
            <p className="text-white font-medium">{text}</p>
            <div className="mt-2 flex items-center justify-center space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1 w-1 rounded-full bg-purple-400 animate-pulse"
                  style={{
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Default spinner
  return (
    <div className={cn("flex items-center justify-center space-x-3", className)}>
      <div className={cn(
        "animate-spin rounded-full border-2 border-purple-400 border-t-transparent",
        sizes[size]
      )} />
      {text && <span className="text-slate-300 text-sm">{text}</span>}
    </div>
  )
}

// Full page loading overlay
export function LoadingOverlay({ text = "Loading..." }: { text?: string }) {
  return <BrandLoadingScreen message={text} logoSrc="/tourify-logo-white.svg" fullScreen={true} />
}

// Page transition loading
export function PageLoading() {
  return <BrandLoadingScreen message="Loading..." logoSrc="/tourify-logo-white.svg" fullScreen={true} />
} 