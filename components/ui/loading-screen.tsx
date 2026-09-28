"use client"

import { Loader2, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// =============================================================================
// NOTE: For more advanced loading screens with animations and brand integration,
// see BrandLoadingScreen in './brand-loading-screen.tsx'
// =============================================================================

// =============================================================================
// LOADING SCREEN PROPS
// =============================================================================

interface LoadingScreenProps {
  message?: string
  subMessage?: string
  fullScreen?: boolean
  showLogo?: boolean
  variant?: 'default' | 'minimal' | 'card'
}

// =============================================================================
// LOADING SCREEN COMPONENT
// =============================================================================

export function LoadingScreen({ 
  message = "Loading...", 
  subMessage,
  fullScreen = true,
  showLogo = true,
  variant = 'default'
}: LoadingScreenProps) {
  // Loading content
  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center text-center space-y-4">
      {showLogo && (
        <div className="mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center mb-4 animate-pulse">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Tourify</h1>
        </div>
      )}
      
      <div className="flex items-center space-x-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <div className="text-left">
          <h2 className="text-xl font-semibold text-white">{message}</h2>
          {subMessage && (
            <p className="text-slate-400 mt-1">{subMessage}</p>
          )}
        </div>
      </div>
      
      {/* Loading animation dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className="flex items-center justify-center space-x-3 p-4">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
        <span className="text-white">{message}</span>
      </div>
    )
  }

  // Card variant
  if (variant === 'card') {
    return (
      <Card className="bg-slate-800/50 border-slate-700 mx-auto max-w-md">
        <CardContent className="p-8">
          <LoadingContent />
        </CardContent>
      </Card>
    )
  }

  // Full screen variant (default)
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        {/* Background */}
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-slate-950" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-md p-6">
          <LoadingContent />
        </div>
      </div>
    )
  }

  // Inline variant
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingContent />
    </div>
  )
}

// =============================================================================
// SPECIALIZED LOADING COMPONENTS
// =============================================================================

// Loading spinner for buttons
export function LoadingSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }
  
  return (
    <Loader2 className={`animate-spin text-current ${sizeClasses[size]} ${className}`} />
  )
}

// Loading skeleton for content
export function LoadingSkeleton({ className = '', width = 'w-full', height = 'h-4' }: { 
  className?: string
  width?: string
  height?: string 
}) {
  return <Skeleton className={`bg-slate-700 ${width} ${height} ${className}`} />
}

// Loading dots animation
export function LoadingDots({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }
  
  return (
    <div className="flex space-x-1">
      <div className={`bg-purple-500 rounded-full animate-bounce ${sizeClasses[size]}`} style={{ animationDelay: '0ms' }} />
      <div className={`bg-purple-500 rounded-full animate-bounce ${sizeClasses[size]}`} style={{ animationDelay: '150ms' }} />
      <div className={`bg-purple-500 rounded-full animate-bounce ${sizeClasses[size]}`} style={{ animationDelay: '300ms' }} />
    </div>
  )
}

// Loading states for lists
export function LoadingList({ items = 3, className = '' }: { items?: number, className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg">
          <LoadingSkeleton width="w-10" height="h-10" className="rounded-full" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton width="w-3/4" height="h-4" />
            <LoadingSkeleton width="w-1/2" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Loading state for cards
export function LoadingCard({ className = '' }: { className?: string }) {
  return (
    <Card className={`bg-slate-800/50 border-slate-700 ${className}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <LoadingSkeleton width="w-1/3" height="h-6" />
          <LoadingSkeleton width="w-full" height="h-4" />
          <LoadingSkeleton width="w-2/3" height="h-4" />
          <div className="flex space-x-2 mt-4">
            <LoadingSkeleton width="w-20" height="h-8" className="rounded-md" />
            <LoadingSkeleton width="w-16" height="h-8" className="rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
