'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RealTimeIndicatorProps {
  isConnected?: boolean
  lastUpdate?: Date
  className?: string
}

export function RealTimeIndicator({ 
  isConnected = true, 
  lastUpdate, 
  className 
}: RealTimeIndicatorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [pulse, setPulse] = useState(false)

  // Show indicator when data updates
  useEffect(() => {
    if (lastUpdate) {
      setIsVisible(true)
      setPulse(true)
      
      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        setPulse(false)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [lastUpdate])

  if (!isVisible) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        <div className={cn(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-green-500' : 'bg-red-500',
          pulse && 'animate-pulse'
        )} />
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>
      
      {lastUpdate && (
        <Badge variant="secondary" className="text-xs">
          Updated {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(lastUpdate)}
        </Badge>
      )}
    </div>
  )
}

export function RealTimeStatusBar() {
  const [isConnected, setIsConnected] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>()

  // Monitor real-time connection status
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client')
        
        // Test connection
        const { data, error } = await supabase
          .from('tours')
          .select('id')
          .limit(1)
        
        setIsConnected(!error)
      } catch (error) {
        setIsConnected(false)
      }
    }

    checkConnection()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Listen for real-time updates
  useEffect(() => {
    const setupRealTimeListener = async () => {
      try {
        const { supabase } = await import('@/lib/supabase/client')

        const subscription = supabase
          .channel('real-time-status')
          .on('postgres_changes', 
            { event: '*', schema: 'public' },
            () => {
              setLastUpdate(new Date())
            }
          )
          .subscribe()

        return () => subscription.unsubscribe()
      } catch (error) {
        console.error('Error setting up real-time listener:', error)
      }
    }

    setupRealTimeListener()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <RealTimeIndicator 
        isConnected={isConnected}
        lastUpdate={lastUpdate}
        className="bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg"
      />
    </div>
  )
} 