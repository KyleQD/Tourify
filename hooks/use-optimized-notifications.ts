import { useState, useEffect, useCallback, useRef } from 'react'
import { OptimizedNotificationService, OptimizedNotification, NotificationPreferences, NotificationMetrics } from '@/lib/services/optimized-notification-service'
import { createClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import type { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient()

interface UseOptimizedNotificationsOptions {
  userId?: string
  autoSubscribe?: boolean
  pollInterval?: number
  limit?: number
}

interface UseOptimizedNotificationsReturn {
  // State
  notifications: OptimizedNotification[]
  unreadCount: number
  totalCount: number
  isLoading: boolean
  isConnected: boolean
  error: string | null
  
  // Preferences
  preferences: NotificationPreferences | null
  isPreferencesLoading: boolean
  
  // Metrics
  metrics: NotificationMetrics | null
  isMetricsLoading: boolean
  
  // Actions
  fetchNotifications: (options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
    priority?: string
  }) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>
  refreshMetrics: () => Promise<void>
  
  // Real-time
  subscribe: () => void
  unsubscribe: () => void
  
  // Utilities
  clearError: () => void
}

export function useOptimizedNotifications(
  options: UseOptimizedNotificationsOptions = {}
): UseOptimizedNotificationsReturn {
  const {
    userId,
    autoSubscribe = true,
    pollInterval = 30000, // 30 seconds
    limit = 50
  } = options

  const { toast } = useToast()
  
  // State
  const [notifications, setNotifications] = useState<OptimizedNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Preferences
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isPreferencesLoading, setIsPreferencesLoading] = useState(false)
  
  // Metrics
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null)
  const [isMetricsLoading, setIsMetricsLoading] = useState(false)
  
  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  // =============================================================================
  // NOTIFICATION MANAGEMENT
  // =============================================================================

  const fetchNotifications = useCallback(async (fetchOptions: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
    priority?: string
  } = {}) => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      const result = await OptimizedNotificationService.getUserNotifications(
        userId,
        {
          limit: fetchOptions.limit || limit,
          offset: fetchOptions.offset || 0,
          unreadOnly: fetchOptions.unreadOnly,
          type: fetchOptions.type,
          priority: fetchOptions.priority
        }
      )

      setNotifications(result.notifications)
      setUnreadCount(result.unreadCount)
      setTotalCount(result.totalCount)
      lastFetchRef.current = Date.now()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notifications'
      setError(errorMessage)
      console.error('Error fetching notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, limit])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return

    try {
      await OptimizedNotificationService.markAsRead(notificationId, userId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [userId, toast])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    try {
      const markedCount = await OptimizedNotificationService.markAllAsRead(userId)
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          isRead: true,
          readAt: new Date().toISOString()
        }))
      )
      setUnreadCount(0)
      
      toast({
        title: 'Success',
        description: `Marked ${markedCount} notifications as read`,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark all notifications as read'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [userId, toast])

  // =============================================================================
  // PREFERENCES MANAGEMENT
  // =============================================================================

  const fetchPreferences = useCallback(async () => {
    if (!userId) return

    try {
      setIsPreferencesLoading(true)
      const prefs = await OptimizedNotificationService.getPreferences(userId)
      setPreferences(prefs)
    } catch (err) {
      console.error('Error fetching notification preferences:', err)
    } finally {
      setIsPreferencesLoading(false)
    }
  }, [userId])

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!userId) return

    try {
      const updatedPrefs = await OptimizedNotificationService.updatePreferences(userId, newPreferences)
      setPreferences(updatedPrefs)
      
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [userId, toast])

  // =============================================================================
  // METRICS MANAGEMENT
  // =============================================================================

  const refreshMetrics = useCallback(async () => {
    if (!userId) return

    try {
      setIsMetricsLoading(true)
      const notificationMetrics = await OptimizedNotificationService.getMetrics(userId)
      setMetrics(notificationMetrics)
    } catch (err) {
      console.error('Error fetching notification metrics:', err)
    } finally {
      setIsMetricsLoading(false)
    }
  }, [userId])

  // =============================================================================
  // REAL-TIME SUBSCRIPTION
  // =============================================================================

  const subscribe = useCallback(() => {
    if (!userId || channelRef.current) return

    try {
      const channel = OptimizedNotificationService.createOptimizedSubscription(
        userId,
        (notification) => {
          // Handle new/updated notification
          setNotifications(prev => {
            const existingIndex = prev.findIndex(n => n.id === notification.id)
            
            if (existingIndex >= 0) {
              // Update existing notification
              const updated = [...prev]
              updated[existingIndex] = notification
              return updated
            } else {
              // Add new notification at the beginning
              return [notification, ...prev]
            }
          })
          
          // Update unread count
          if (!notification.isRead) {
            setUnreadCount(prev => prev + 1)
            setTotalCount(prev => prev + 1)
          }
          
          // Show toast for new notifications
          toast({
            title: notification.title,
            description: notification.summary || notification.content,
            duration: 5000,
          })
        },
        (error) => {
          console.error('Real-time notification error:', error)
          setError('Real-time connection failed')
        }
      )

      channelRef.current = channel
      setIsConnected(true)
    } catch (err) {
      console.error('Error subscribing to notifications:', err)
      setError('Failed to subscribe to notifications')
    }
  }, [userId, toast])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setIsConnected(false)
    }
  }, [])

  // =============================================================================
  // POLLING FALLBACK
  // =============================================================================

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) return

    pollIntervalRef.current = setInterval(() => {
      // Only poll if we haven't fetched recently and real-time is not connected
      if (!isConnected && Date.now() - lastFetchRef.current > pollInterval) {
        fetchNotifications()
      }
    }, pollInterval)
  }, [fetchNotifications, isConnected, pollInterval])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // =============================================================================
  // UTILITIES
  // =============================================================================

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Initial fetch and subscription setup
  useEffect(() => {
    if (!userId) return

    fetchNotifications()
    fetchPreferences()
    refreshMetrics()

    if (autoSubscribe) {
      subscribe()
      startPolling()
    }

    return () => {
      unsubscribe()
      stopPolling()
    }
  }, [userId, autoSubscribe, subscribe, unsubscribe, startPolling, stopPolling, fetchNotifications, fetchPreferences, refreshMetrics])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe()
      stopPolling()
    }
  }, [unsubscribe, stopPolling])

  // =============================================================================
  // RETURN INTERFACE
  // =============================================================================

  return {
    // State
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    isConnected,
    error,
    
    // Preferences
    preferences,
    isPreferencesLoading,
    
    // Metrics
    metrics,
    isMetricsLoading,
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    refreshMetrics,
    
    // Real-time
    subscribe,
    unsubscribe,
    
    // Utilities
    clearError
  }
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook for notification preferences only
 */
export function useNotificationPreferences(userId?: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const fetchPreferences = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const prefs = await OptimizedNotificationService.getPreferences(userId)
      setPreferences(prefs)
    } catch (err) {
      console.error('Error fetching notification preferences:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!userId) return

    try {
      const updatedPrefs = await OptimizedNotificationService.updatePreferences(userId, newPreferences)
      setPreferences(updatedPrefs)
      
      toast({
        title: 'Success',
        description: 'Notification preferences updated',
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [userId, toast])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    isLoading,
    updatePreferences,
    refresh: fetchPreferences
  }
}

/**
 * Hook for notification metrics only
 */
export function useNotificationMetrics(userId?: string) {
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchMetrics = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      const notificationMetrics = await OptimizedNotificationService.getMetrics(userId)
      setMetrics(notificationMetrics)
    } catch (err) {
      console.error('Error fetching notification metrics:', err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    metrics,
    isLoading,
    refresh: fetchMetrics
  }
}
