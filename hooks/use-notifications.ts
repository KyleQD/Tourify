import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import {
  fetchUnreadNotificationCount,
  fetchUserNotifications,
  markAccountNotificationsAsRead,
} from '@/lib/notifications/fetch-user-notifications'
import { useMultiAccount } from '@/hooks/use-multi-account'

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
  } | null
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
  const [hasError, setHasError] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const { currentAccount } = useMultiAccount()

  const fetchNotifications = useCallback(async (options?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
  }) => {
    try {
      setIsLoading(true)
      setHasError(false)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const result = await fetchUserNotifications({
        supabase,
        userId: user.id,
        limit: options?.limit ?? 100,
        unreadOnly: options?.unreadOnly,
        type: options?.type,
        targetProfileId: currentAccount?.profile_id,
        accountType: currentAccount?.account_type,
      })

      if (result.error) {
        setHasError(true)
        toast.error('Failed to fetch notifications')
        return
      }

      setNotifications(result.notifications as Notification[])
      setUnreadCount(result.unreadCount)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setHasError(true)
      toast.error('Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [currentAccount?.account_type, currentAccount?.profile_id])

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
          quietHoursEnd: data.quiet_hours_end,
        })
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)

      if (error) {
        toast.error('Failed to mark notification as read')
        return false
      }

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: true }
            : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
      return false
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await markAccountNotificationsAsRead({
        supabase,
        userId: user.id,
        targetProfileId: currentAccount?.profile_id,
        accountType: currentAccount?.account_type,
      })

      if (error) {
        toast.error('Failed to mark notifications as read')
        return false
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      )
      setUnreadCount(0)

      toast.success('All notifications marked as read')
      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark notifications as read')
      return false
    }
  }, [currentAccount?.account_type, currentAccount?.profile_id])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        toast.error('Failed to delete notification')
        return false
      }

      setNotifications((prev) => {
        const deleted = prev.find((n) => n.id === notificationId)
        if (deleted && !deleted.is_read)
          setUnreadCount((count) => Math.max(0, count - 1))
        return prev.filter((n) => n.id !== notificationId)
      })

      toast.success('Notification deleted')
      return true
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
      return false
    }
  }, [])

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
          updated_at: new Date().toISOString(),
        })

      if (error)
        throw error

      if (preferences)
        setPreferences({ ...preferences, ...newPreferences })

      toast.success('Notification preferences saved successfully')
      return true
    } catch (error) {
      console.error('Error saving notification preferences:', error)
      toast.error('Failed to save notification preferences')
      return false
    }
  }, [preferences])

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
        .from('notifications')
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
          priority: notificationData.priority || 'normal',
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to create notification')
        return null
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user && notificationData.userId === user.id) {
        setNotifications((prev) => [data, ...prev])
        if (!data.is_read)
          setUnreadCount((prev) => prev + 1)
      }

      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      toast.error('Failed to create notification')
      return null
    }
  }, [])

  const getUnreadCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      return await fetchUnreadNotificationCount({
        supabase,
        userId: user.id,
        targetProfileId: currentAccount?.profile_id,
        accountType: currentAccount?.account_type,
      })
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }, [currentAccount?.account_type, currentAccount?.profile_id])

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()

    let channel: ReturnType<typeof supabase.channel> | null = null

    async function setupSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      channel = supabase
        .channel(`notifications-hook-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchNotifications()
        })
        .subscribe()
    }

    void setupSubscription()

    return () => {
      if (channel)
        supabase.removeChannel(channel)
    }
  }, [fetchNotifications, fetchPreferences])

  return {
    notifications,
    unreadCount,
    isLoading,
    hasError,
    preferences,
    fetchNotifications,
    fetchPreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    createNotification,
    getUnreadCount,
  }
}
