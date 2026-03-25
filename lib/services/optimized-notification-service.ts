import { createClient } from '@/lib/supabase'
import { z } from 'zod'

const supabase = createClient()

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface OptimizedNotification {
  id: string
  userId: string
  type: string
  title: string
  content: string
  summary?: string
  metadata?: Record<string, any>
  relatedUserId?: string
  relatedContentId?: string
  relatedContentType?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isRead: boolean
  readAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferences {
  id: string
  userId: string
  emailEnabled: boolean
  pushEnabled: boolean
  inAppEnabled: boolean
  enableLikes: boolean
  enableComments: boolean
  enableShares: boolean
  enableFollows: boolean
  enableMessages: boolean
  enableEvents: boolean
  enableSystem: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  digestFrequency: 'never' | 'hourly' | 'daily' | 'weekly'
  preferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface NotificationMetrics {
  totalNotifications: number
  unreadCount: number
  deliveryRate: number
  averageLatency: number
  topNotificationTypes: Array<{
    type: string
    count: number
    engagementRate: number
  }>
  recentActivity: Array<{
    timestamp: string
    type: string
    count: number
  }>
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const notificationDataSchema = z.object({
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  summary: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  relatedUserId: z.string().uuid().optional(),
  relatedContentId: z.string().optional(),
  relatedContentType: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  expiresAt: z.string().optional()
})

const batchNotificationDataSchema = z.array(notificationDataSchema)

// =============================================================================
// OPTIMIZED NOTIFICATION SERVICE
// =============================================================================

export class OptimizedNotificationService {
  /**
   * Create a single notification with preference checking
   */
  static async createNotification(data: z.infer<typeof notificationDataSchema>): Promise<OptimizedNotification> {
    try {
      const validatedData = notificationDataSchema.parse(data)

      // Check if user should receive this notification
      const shouldSend = await this.shouldSendNotification(
        validatedData.userId,
        validatedData.type,
        validatedData.priority || 'normal'
      )

      if (!shouldSend) {
        throw new Error('Notification blocked by user preferences')
      }

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: validatedData.userId,
          type: validatedData.type,
          title: validatedData.title,
          content: validatedData.content,
          summary: validatedData.summary,
          metadata: validatedData.metadata || {},
          related_user_id: validatedData.relatedUserId,
          related_content_id: validatedData.relatedContentId,
          related_content_type: validatedData.relatedContentType,
          priority: validatedData.priority || 'normal',
          expires_at: validatedData.expiresAt,
          is_read: false
        })
        .select()
        .single()

      if (error) throw error

      // Log notification creation for analytics
      await this.logNotificationEvent(notification.id, 'created', validatedData.userId)

      return this.transformNotification(notification)
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Create multiple notifications in batch for better performance
   */
  static async createBatchNotifications(
    notifications: z.infer<typeof batchNotificationDataSchema>
  ): Promise<OptimizedNotification[]> {
    try {
      const validatedData = batchNotificationDataSchema.parse(notifications)

      // Filter notifications based on user preferences
      const filteredNotifications = []
      for (const notification of validatedData) {
        const shouldSend = await this.shouldSendNotification(
          notification.userId,
          notification.type,
          notification.priority || 'normal'
        )
        
        if (shouldSend) {
          filteredNotifications.push({
            user_id: notification.userId,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            summary: notification.summary,
            metadata: notification.metadata || {},
            related_user_id: notification.relatedUserId,
            related_content_id: notification.relatedContentId,
            related_content_type: notification.relatedContentType,
            priority: notification.priority || 'normal',
            expires_at: notification.expiresAt,
            is_read: false
          })
        }
      }

      if (filteredNotifications.length === 0) {
        return []
      }

      const { data: createdNotifications, error } = await supabase
        .from('notifications')
        .insert(filteredNotifications)
        .select()

      if (error) throw error

      // Log batch creation for analytics
      for (const notification of createdNotifications) {
        await this.logNotificationEvent(notification.id, 'created', notification.user_id)
      }

      return createdNotifications.map(this.transformNotification)
    } catch (error) {
      console.error('Error creating batch notifications:', error)
      throw error
    }
  }

  /**
   * Get notifications for a user with pagination and filtering
   */
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      type?: string
      priority?: string
      includeExpired?: boolean
    } = {}
  ): Promise<{
    notifications: OptimizedNotification[]
    totalCount: number
    unreadCount: number
  }> {
    try {
      const {
        limit = 50,
        offset = 0,
        unreadOnly = false,
        type,
        priority,
        includeExpired = false
      } = options

      let query = supabase
        .from('notifications')
        .select(`
          *,
          related_user:profiles!notifications_related_user_id_fkey(
            id,
            full_name,
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (unreadOnly) {
        query = query.eq('is_read', false)
      }

      if (type) {
        query = query.eq('type', type)
      }

      if (priority) {
        query = query.eq('priority', priority)
      }

      if (!includeExpired) {
        query = query.or('expires_at.is.null,expires_at.gt.now()')
      }

      const { data: notifications, error, count } = await query
        .range(offset, offset + limit - 1)

      if (error) throw error

      // Get unread count separately for better performance
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      return {
        notifications: notifications.map(this.transformNotification),
        totalCount: count || 0,
        unreadCount: unreadCount || 0
      }
    } catch (error) {
      console.error('Error fetching user notifications:', error)
      throw error
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)

      if (error) throw error

      // Log read event for analytics
      await this.logNotificationEvent(notificationId, 'read', userId)
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false)
        .select('id')

      if (error) throw error

      // Log batch read events for analytics
      for (const notification of data) {
        await this.logNotificationEvent(notification.id, 'read', userId)
      }

      return data.length
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  /**
   * Get notification preferences for a user
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data ? this.transformPreferences(data) : null
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      throw error
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          email_enabled: preferences.emailEnabled,
          push_enabled: preferences.pushEnabled,
          in_app_enabled: preferences.inAppEnabled,
          enable_likes: preferences.enableLikes,
          enable_comments: preferences.enableComments,
          enable_shares: preferences.enableShares,
          enable_follows: preferences.enableFollows,
          enable_messages: preferences.enableMessages,
          enable_events: preferences.enableEvents,
          enable_system: preferences.enableSystem,
          quiet_hours_enabled: preferences.quietHoursEnabled,
          quiet_hours_start: preferences.quietHoursStart,
          quiet_hours_end: preferences.quietHoursEnd,
          digest_frequency: preferences.digestFrequency,
          preferences: preferences.preferences || {}
        })
        .select()
        .single()

      if (error) throw error

      return this.transformPreferences(data)
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      throw error
    }
  }

  /**
   * Get notification metrics for analytics
   */
  static async getMetrics(userId: string): Promise<NotificationMetrics> {
    try {
      // Get total and unread counts
      const { count: totalCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      // Get top notification types
      const { data: typeStats } = await supabase
        .from('notifications')
        .select('type')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      const typeCounts = (typeStats || []).reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const topNotificationTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({
          type,
          count,
          engagementRate: 0 // TODO: Calculate from analytics
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Get recent activity (last 7 days)
      const { data: recentActivity } = await supabase
        .from('notifications')
        .select('type, created_at')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      const activityByDay = (recentActivity || []).reduce((acc, notification) => {
        const date = new Date(notification.created_at).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = {}
        }
        acc[date][notification.type] = (acc[date][notification.type] || 0) + 1
        return acc
      }, {} as Record<string, Record<string, number>>)

      const recentActivityArray = Object.entries(activityByDay).map(([date, types]) => ({
        timestamp: date,
        type: Object.keys(types).join(', '),
        count: Object.values(types).reduce((sum, count) => sum + count, 0)
      }))

      return {
        totalNotifications: totalCount || 0,
        unreadCount: unreadCount || 0,
        deliveryRate: 100, // TODO: Calculate from analytics
        averageLatency: 0, // TODO: Calculate from analytics
        topNotificationTypes,
        recentActivity: recentActivityArray
      }
    } catch (error) {
      console.error('Error fetching notification metrics:', error)
      throw error
    }
  }

  /**
   * Create optimized real-time subscription for notifications
   */
  static createOptimizedSubscription(
    userId: string,
    onNotification: (notification: OptimizedNotification) => void,
    onError?: (error: any) => void
  ) {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onNotification(this.transformNotification(payload.new))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          onNotification(this.transformNotification(payload.new))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Optimized notification subscription active for user ${userId}`)
        } else if (status === 'CHANNEL_ERROR' && onError) {
          onError(new Error('Failed to subscribe to notifications'))
        }
      })

    return channel
  }

  /**
   * Clean up old notifications
   */
  static async cleanupOldNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('cleanup_old_notifications')
      
      if (error) throw error
      
      return data || 0
    } catch (error) {
      console.error('Error cleaning up old notifications:', error)
      throw error
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private static async shouldSendNotification(
    userId: string,
    notificationType: string,
    priority: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('should_send_notification', {
        p_user_id: userId,
        p_notification_type: notificationType,
        p_priority: priority
      })

      if (error) throw error

      return data || false
    } catch (error) {
      console.error('Error checking notification preferences:', error)
      // Default to sending notification if check fails
      return true
    }
  }

  private static async logNotificationEvent(
    notificationId: string,
    eventType: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // This would log to an analytics table if implemented
      console.log(`📊 Notification ${eventType}: ${notificationId} for user ${userId}`, metadata)
    } catch (error) {
      console.error('Error logging notification event:', error)
    }
  }

  private static transformNotification(data: any): OptimizedNotification {
    return {
      id: data.id,
      userId: data.user_id,
      type: data.type,
      title: data.title,
      content: data.content,
      summary: data.summary,
      metadata: data.metadata,
      relatedUserId: data.related_user_id,
      relatedContentId: data.related_content_id,
      relatedContentType: data.related_content_type,
      priority: data.priority,
      isRead: data.is_read,
      readAt: data.read_at,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private static transformPreferences(data: any): NotificationPreferences {
    return {
      id: data.id,
      userId: data.user_id,
      emailEnabled: data.email_enabled,
      pushEnabled: data.push_enabled,
      inAppEnabled: data.in_app_enabled,
      enableLikes: data.enable_likes,
      enableComments: data.enable_comments,
      enableShares: data.enable_shares,
      enableFollows: data.enable_follows,
      enableMessages: data.enable_messages,
      enableEvents: data.enable_events,
      enableSystem: data.enable_system,
      quietHoursEnabled: data.quiet_hours_enabled,
      quietHoursStart: data.quiet_hours_start,
      quietHoursEnd: data.quiet_hours_end,
      digestFrequency: data.digest_frequency,
      preferences: data.preferences,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR COMMON NOTIFICATION TYPES
// =============================================================================

export class SocialNotificationHelpers {
  /**
   * Send like notification
   */
  static async sendLikeNotification(
    postAuthorId: string,
    likerId: string,
    postId: string,
    postContentPreview: string
  ): Promise<OptimizedNotification> {
    return OptimizedNotificationService.createNotification({
      userId: postAuthorId,
      type: 'like',
      title: 'New Like',
      content: `Someone liked your post: "${postContentPreview}"`,
      summary: 'New like received',
      relatedUserId: likerId,
      relatedContentId: postId,
      relatedContentType: 'post',
      priority: 'normal'
    })
  }

  /**
   * Send comment notification
   */
  static async sendCommentNotification(
    postAuthorId: string,
    commenterId: string,
    postId: string,
    commentContent: string,
    postContentPreview: string
  ): Promise<OptimizedNotification> {
    return OptimizedNotificationService.createNotification({
      userId: postAuthorId,
      type: 'comment',
      title: 'New Comment',
      content: `Someone commented on your post: "${commentContent.substring(0, 100)}"`,
      summary: 'New comment received',
      relatedUserId: commenterId,
      relatedContentId: postId,
      relatedContentType: 'post',
      priority: 'normal',
      metadata: {
        commentPreview: commentContent.substring(0, 100),
        postPreview: postContentPreview
      }
    })
  }

  /**
   * Send share notification
   */
  static async sendShareNotification(
    postAuthorId: string,
    sharerId: string,
    postId: string,
    postContentPreview: string,
    sharedTo: string = 'feed'
  ): Promise<OptimizedNotification> {
    return OptimizedNotificationService.createNotification({
      userId: postAuthorId,
      type: 'share',
      title: 'Post Shared',
      content: `Someone shared your post: "${postContentPreview}"`,
      summary: 'Post shared',
      relatedUserId: sharerId,
      relatedContentId: postId,
      relatedContentType: 'post',
      priority: 'normal',
      metadata: {
        sharedTo,
        postPreview: postContentPreview
      }
    })
  }

  /**
   * Send follow notification
   */
  static async sendFollowNotification(
    followedUserId: string,
    followerId: string
  ): Promise<OptimizedNotification> {
    return OptimizedNotificationService.createNotification({
      userId: followedUserId,
      type: 'follow',
      title: 'New Follower',
      content: 'Someone started following you',
      summary: 'New follower',
      relatedUserId: followerId,
      priority: 'normal'
    })
  }
}
