"use client"

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Circle, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// =============================================================================
// CONNECTION STATUS TYPES
// =============================================================================

type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected'

interface ConnectionStatusIndicatorProps {
  isConnected: boolean
  quality: ConnectionQuality
  showText?: boolean
  compact?: boolean
  showDetails?: boolean
}

// =============================================================================
// CONNECTION STATUS COMPONENT
// =============================================================================

export function ConnectionStatusIndicator({
  isConnected,
  quality,
  showText = false,
  compact = false,
  showDetails = false
}: ConnectionStatusIndicatorProps) {
  const [lastConnected, setLastConnected] = useState<Date | null>(null)
  const [blinkVisible, setBlinkVisible] = useState(true)

  // Track connection state
  useEffect(() => {
    if (isConnected) {
      setLastConnected(new Date())
    }
  }, [isConnected])

  // Blinking animation for poor connection
  useEffect(() => {
    if (quality === 'poor' && isConnected) {
      const interval = setInterval(() => {
        setBlinkVisible(prev => !prev)
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setBlinkVisible(true)
    }
  }, [quality, isConnected])

  // Get status styling
  const getStatusStyles = () => {
    if (!isConnected) {
      return {
        icon: WifiOff,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 hover:bg-red-500/20',
        borderColor: 'border-red-500/30',
        label: 'Disconnected',
        description: 'No connection to server'
      }
    }

    switch (quality) {
      case 'excellent':
        return {
          icon: Wifi,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 hover:bg-green-500/20',
          borderColor: 'border-green-500/30',
          label: 'Excellent',
          description: 'Real-time sync active'
        }
      case 'good':
        return {
          icon: Wifi,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10 hover:bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          label: 'Good',
          description: 'Stable connection'
        }
      case 'poor':
        return {
          icon: AlertTriangle,
          color: blinkVisible ? 'text-orange-400' : 'text-orange-200',
          bgColor: 'bg-orange-500/10 hover:bg-orange-500/20',
          borderColor: 'border-orange-500/30',
          label: 'Poor',
          description: 'Connection issues detected'
        }
      default:
        return {
          icon: WifiOff,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10 hover:bg-red-500/20',
          borderColor: 'border-red-500/30',
          label: 'Disconnected',
          description: 'No connection'
        }
    }
  }

  const statusStyles = getStatusStyles()
  const Icon = statusStyles.icon

  // Compact version
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              <Circle className={`h-2 w-2 ${statusStyles.color} fill-current`} />
              {showText && (
                <span className="text-xs text-slate-400">{statusStyles.label}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{statusStyles.description}</p>
            {lastConnected && !isConnected && (
              <p className="text-xs text-slate-400 mt-1">
                Last connected: {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(lastConnected)}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Full version
  return (
    <div className={`${
      showDetails ? 'p-3 rounded-lg border' : 'p-2 rounded-md'
    } ${statusStyles.bgColor} ${statusStyles.borderColor} backdrop-blur-sm transition-all duration-200`}>
      <div className="flex items-center space-x-2">
        <Icon className={`h-4 w-4 ${statusStyles.color} transition-colors duration-200`} />
        
        {showText && (
          <div className="flex items-center space-x-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${statusStyles.color} ${statusStyles.borderColor}`}
            >
              {statusStyles.label}
            </Badge>
            
            {showDetails && (
              <span className="text-xs text-slate-400">
                {statusStyles.description}
              </span>
            )}
          </div>
        )}
      </div>

      {showDetails && (
        <div className="mt-2 space-y-1 text-xs text-slate-400">
          {isConnected ? (
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-green-400" />
              <span>Real-time sync active</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Circle className="h-3 w-3 text-red-400 fill-red-400" />
                <span>Attempting to reconnect...</span>
              </div>
              {lastConnected && (
                <div className="text-xs text-slate-500">
                  Last connected: {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(lastConnected)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// MINI CONNECTION INDICATOR
// =============================================================================

export function MiniConnectionIndicator({ 
  isConnected, 
  quality,
  className = ""
}: {
  isConnected: boolean
  quality: ConnectionQuality
  className?: string
}) {
  const getColor = () => {
    if (!isConnected) return 'text-red-400'
    switch (quality) {
      case 'excellent': return 'text-green-400'
      case 'good': return 'text-yellow-400'
      case 'poor': return 'text-orange-400'
      default: return 'text-red-400'
    }
  }

  return (
    <Circle className={`h-2 w-2 fill-current ${getColor()} ${className}`} />
  )
}

// =============================================================================
// CONNECTION STATUS BAR
// =============================================================================

export function ConnectionStatusBar({ 
  isConnected, 
  quality,
  onlineUsers = 0,
  lastUpdate
}: {
  isConnected: boolean
  quality: ConnectionQuality
  onlineUsers?: number
  lastUpdate?: Date
}) {
  const statusStyles = isConnected
    ? quality === 'excellent' ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : quality === 'good' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    : 'bg-red-500/20 text-red-400 border-red-500/30'

  return (
    <div className={`px-3 py-2 rounded-lg border ${statusStyles} backdrop-blur-sm`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <MiniConnectionIndicator isConnected={isConnected} quality={quality} />
          <span className="font-medium">
            {isConnected ? `Connected (${quality})` : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          {onlineUsers > 0 && (
            <span>{onlineUsers} users online</span>
          )}
          {lastUpdate && (
            <span>
              Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(lastUpdate)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}