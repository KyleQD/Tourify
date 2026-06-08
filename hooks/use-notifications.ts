import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface Notification {
  id: string
  type: string
  title: string
  content: string
  summary?: string
  metadata?: Record<string, any>
  related_user?: {
    id: string
    full_name: string
    username: string
    avatar_url: string
  }
  is_read: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
}

export interface NotificationPreferences {
  emailEnabled: boolean
  pushEnabled: boolean
  smsEnabled: boolean
  inAppEnabled: boolean
  preferences: Record<string, {
    email: boolean
    push: boolean
    sms: boolean
  }>
  digestFrequency: 'never' | 'hourly' | 'daily' | 'weekly'
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async (options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
  }) => {
    try {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from("notifications")
        .select(`
          *,
          related_user:profiles!notifications_related_user_id_fkey(
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (options?.unreadOnly) {
        query = query.eq("is_read", false)
      }

      if (options?.type) {
        query = query.eq("type", options.type)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        toast.error("Failed to fetch notifications")
        return
      }

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.is_read).length || 0)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      toast.error("Failed to fetch notifications")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error)
        return
      }

      if (data) {
        setPreferences({
          emailEnabled: data.email_enabled,
          pushEnabled: data.push_enabled,
          smsEnabled: data.sms_enabled,
          inAppEnabled: data.in_app_enabled,
          preferences: data.preferences,
          digestFrequency: data.digest_frequency,
          quietHoursEnabled: data.quiet_hours_enabled,
          quietHoursStart: data.quiet_hours_start,
          quietHoursEnd: data.quiet_hours_end
        })
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq("id", notificationId)

      if (error) {
        toast.error("Failed to mark notification as read")
        return false
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))

      return true
    } catch (error) {
      console.error("Error marking notification as read:", error)
      toast.error("Failed to mark notification as read")
      return false
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from("notifications")
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        toast.error("Failed to mark notifications as read")
        return false
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)

      toast.success("All notifications marked as read")
      return true
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      toast.error("Failed to mark notifications as read")
      return false
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)

      if (error) {
        toast.error("Failed to delete notification")
        return false
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Update unread count if notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      toast.success("Notification deleted")
      return true
    } catch (error) {
      console.error("Error deleting notification:", error)
      toast.error("Failed to delete notification")
      return false
    }
  }, [notifications])

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to save preferences')
        return false
      }

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_enabled: newPreferences.emailEnabled,
          push_enabled: newPreferences.pushEnabled,
          sms_enabled: newPreferences.smsEnabled,
          in_app_enabled: newPreferences.inAppEnabled,
          preferences: newPreferences.preferences,
          digest_frequency: newPreferences.digestFrequency,
          quiet_hours_enabled: newPreferences.quietHoursEnabled,
          quiet_hours_start: newPreferences.quietHoursStart,
          quiet_hours_end: newPreferences.quietHoursEnd,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw error
      }

      // Update local state
      if (preferences) {
        setPreferences({ ...preferences, ...newPreferences })
      }

      toast.success('Notification preferences saved successfully')
      return true
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error('Failed to save notification preferences')
      return false
    }
  }, [preferences])

  // Create notification (for testing or admin use)
  const createNotification = useCallback(async (notificationData: {
    userId: string
    type: string
    title: string
    content: string
    summary?: string
    metadata?: Record<string, any>
    relatedUserId?: string
    relatedContentId?: string
    relatedContentType?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          content: notificationData.content,
          summary: notificationData.summary,
          metadata: notificationData.metadata || {},
          related_user_id: notificationData.relatedUserId,
          related_content_id: notificationData.relatedContentId,
          related_content_type: notificationData.relatedContentType,
          priority: notificationData.priority || 'normal'
        })
        .select()
        .single()

      if (error) {
        toast.error("Failed to create notification")
        return null
      }

      // Add to local state if it's for the current user
      const { data: { user } } = await supabase.auth.getUser()
      if (user && notificationData.userId === user.id) {
        setNotifications(prev => [data, ...prev])
        if (!data.is_read) {
          setUnreadCount(prev => prev + 1)
        }
      }

      return data
    } catch (error) {
      console.error("Error creating notification:", error)
      toast.error("Failed to create notification")
      return null
    }
  }, [])

  // Get unread count
  const getUnreadCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      const { count, error } = await supabase
        .from("notifications")
        .select('*', { count: 'exact', head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (error) {
        console.error("Error fetching unread count:", error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error("Error fetching unread count:", error)
      return 0
    }
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    fetchNotifications()
    fetchPreferences()

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications'
      }, async (payload) => {
        // Handle real-time updates
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as any
          const { data: { user } } = await supabase.auth.getUser()
          
          if (user && newNotification.user_id === user.id) {
            setNotifications(prev => [newNotification as Notification, ...prev])
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1)
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedNotification = payload.new as Notification
          setNotifications(prev => 
            prev.map(n => 
              n.id === updatedNotification.id 
                ? updatedNotification 
                : n
            )
          )
          
          // Update unread count
          getUnreadCount().then(count => setUnreadCount(count))
        } else if (payload.eventType === 'DELETE') {
          const deletedNotification = payload.old as Notification
          setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id))
          
          // Update unread count
          getUnreadCount().then(count => setUnreadCount(count))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, fetchPreferences, getUnreadCount])

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    preferences,
    
    // Actions
    fetchNotifications,
    fetchPreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    createNotification,
    getUnreadCount
  }
} 