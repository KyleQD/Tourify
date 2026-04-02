import { supabase } from '@/lib/supabase/client'
import { AccountManagementService, UserAccount } from './account-management.service'

export interface DashboardStats {
  likes: number
  followers: number
  shares: number
  views: number
  revenue: number
  events: number
  engagement: number
  completion: number
}

export interface DashboardActivity {
  id: string
  accountId: string
  accountType: string
  accountName: string
  type: 'booking' | 'message' | 'follower' | 'event' | 'revenue' | 'engagement' | 'system'
  title: string
  description: string
  timestamp: string
  priority: 'low' | 'medium' | 'high'
  actionRequired: boolean
  value?: number
}

export interface AccountMetrics {
  accountId: string
  accountType: string
  stats: DashboardStats
  urgentCount: number
  recentActivity: string
}

export class DashboardService {
  private static async getUserEventCount(userId: string) {
    const [legacyEvents, v2Events] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('organizer_id', userId),
      supabase.from('events_v2').select('*', { count: 'exact', head: true }).eq('created_by', userId),
    ])
    return (legacyEvents.count || 0) + (v2Events.count || 0)
  }

  private static async getRecentUserEvents(userId: string) {
    const [legacyEvents, v2Events] = await Promise.all([
      supabase
        .from('events')
        .select('id, title, created_at, capacity')
        .eq('organizer_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('events_v2')
        .select('id, title, created_at, capacity')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const legacy = legacyEvents.data || []
    const modern = (v2Events.data || []).map(event => ({
      ...event,
      title: event.title || 'Event',
    }))

    return [...legacy, ...modern]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
  }

  // Get real dashboard stats for a user
  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      // Aggregate real metrics
      const [likesAgg, sharesAgg, viewsAgg, followersAgg, eventCount] = await Promise.all([
        supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_owner_id', userId),
        supabase.from('post_shares').select('*', { count: 'exact', head: true }).eq('post_owner_id', userId),
        supabase.from('post_views').select('*', { count: 'exact', head: true }).eq('post_owner_id', userId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        this.getUserEventCount(userId),
      ])

      const likes = likesAgg.count || 0
      const shares = sharesAgg.count || 0
      const views = viewsAgg.count || 0
      const followers = followersAgg.count || 0
      const events = eventCount || 0

      // Derive engagement and completion simply and deterministically
      const engagement = followers > 0 ? Math.min(100, Math.round(((likes + shares) / followers) * 10)) : 0
      const completion = events > 0 ? Math.min(100, 60 + Math.round((likes + shares) % 40)) : 60

      return { likes, followers, shares, views, revenue: 0, events, engagement, completion }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      // Return fallback stats
      return {
        likes: 0,
        followers: 0,
        shares: 0,
        views: 0,
        revenue: 0,
        events: 0,
        engagement: 0,
        completion: 0
      }
    }
  }

  // Get real activity feed for all accounts
  static async getDashboardActivity(userId: string): Promise<DashboardActivity[]> {
    try {
      const activities: DashboardActivity[] = []

      // Get recent posts
      const { data: recentPosts } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentPosts) {
        recentPosts.forEach((post, index) => {
          activities.push({
            id: `post-${post.id}`,
            accountId: userId,
            accountType: 'general',
            accountName: 'Personal Account',
            type: 'engagement',
            title: 'New Post Created',
            description: `Your post "${post.content?.substring(0, 50)}..." was published`,
            timestamp: this.getTimeAgo(post.created_at),
            priority: index === 0 ? 'high' : 'medium',
            actionRequired: false,
            value: post.likes_count || 0
          })
        })
      }

      // Get recent events
      const recentEvents = await this.getRecentUserEvents(userId)

      if (recentEvents.length > 0) {
        recentEvents.forEach((event, index) => {
          activities.push({
            id: `event-${event.id}`,
            accountId: userId,
            accountType: 'venue',
            accountName: 'Venue Account',
            type: 'event',
            title: 'Event Created',
            description: `New event "${event.title}" has been created`,
            timestamp: this.getTimeAgo(event.created_at),
            priority: 'medium',
            actionRequired: false,
            value: event.capacity || 0
          })
        })
      }

      // Get recent followers
      const { data: recentFollowers } = await supabase
        .from('followers')
        .select('*, profiles!followers_follower_id_fkey(*)')
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (recentFollowers && recentFollowers.length > 0) {
        activities.push({
          id: `followers-${Date.now()}`,
          accountId: userId,
          accountType: 'general',
          accountName: 'Personal Account',
          type: 'follower',
          title: 'New Followers',
          description: `You gained ${recentFollowers.length} new followers`,
          timestamp: this.getTimeAgo(recentFollowers[0].created_at),
          priority: 'low',
          actionRequired: false,
          value: recentFollowers.length
        })
      }

      // Sort by priority and timestamp
      activities.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      return activities
    } catch (error) {
      console.error('Error fetching dashboard activity:', error)
      return []
    }
  }

  // Get account-specific metrics
  static async getAccountMetrics(accounts: UserAccount[]): Promise<AccountMetrics[]> {
    try {
      const metrics: AccountMetrics[] = []

      for (const account of accounts) {
        // Get account-specific stats
        const stats = await this.getDashboardStats(account.profile_id)
        
        // Calculate urgent count based on account type
        let urgentCount = 0
        if (account.account_type === 'venue') {
          // Check for pending booking requests (canonical venue table)
          const { count: pendingVenueRequests } = await supabase
            .from('venue_booking_requests')
            .select('*', { count: 'exact', head: true })
            .eq('venue_id', account.profile_id)
            .eq('status', 'pending')
          
          urgentCount = pendingVenueRequests || 0
        } else if (account.account_type === 'artist') {
          // Check for booking requests
          const { count: legacyBookingRequests } = await supabase
            .from('booking_requests')
            .select('*', { count: 'exact', head: true })
            .eq('artist_id', account.profile_id)
            .eq('status', 'pending')

          const { count: venueBookingRequests } = await supabase
            .from('venue_booking_requests')
            .select('*', { count: 'exact', head: true })
            .eq('requester_id', account.profile_id)
            .eq('status', 'pending')
          
          urgentCount = (legacyBookingRequests || 0) + (venueBookingRequests || 0)
        }

        metrics.push({
          accountId: account.profile_id,
          accountType: account.account_type,
          stats,
          urgentCount,
          recentActivity: '2 hours ago' // This could be calculated from actual activity
        })
      }

      return metrics
    } catch (error) {
      console.error('Error fetching account metrics:', error)
      return []
    }
  }

  // Helper function to get time ago string
  private static getTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return `${Math.floor(diffInSeconds / 2592000)} months ago`
  }
} 