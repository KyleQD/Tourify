import { supabase } from '@/lib/supabase'
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

// ---------------------------------------------------------------------------
// Helpers – every Supabase query is individually wrapped so a single 404 /
// network blip / missing table never cascades into a full page crash.
// ---------------------------------------------------------------------------

const ZERO_STATS: DashboardStats = {
  likes: 0, followers: 0, shares: 0, views: 0,
  revenue: 0, events: 0, engagement: 0, completion: 0,
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn() } catch (err) {
    console.warn('[DashboardService] Query failed (using fallback):', err)
    return fallback
  }
}

/** Sum engagement fields without loading every post in one response (keeps deploy / mobile fast). */
async function sumPostEngagementForUser(userId: string): Promise<{ likes: number; shares: number; views: number }> {
  const pageSize = 500
  const maxRows = 25_000
  let offset = 0
  let likes = 0
  let shares = 0
  let views = 0

  while (offset < maxRows) {
    const { data, error } = await supabase
      .from('posts')
      .select('likes_count, shares_count, views_count')
      .eq('user_id', userId)
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.warn('[DashboardService] posts engagement batch failed:', error.message)
      break
    }
    if (!data?.length) break

    for (const row of data) {
      likes += row.likes_count || 0
      shares += row.shares_count || 0
      views += row.views_count || 0
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return { likes, shares, views }
}

export class DashboardService {
  private static async getUserEventCount(userId: string): Promise<number> {
    // events table may have organizer_id or user_id depending on the migration state
    const [legacyOrganizer, legacyUser, v2] = await Promise.allSettled([
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('organizer_id', userId),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('events_v2').select('*', { count: 'exact', head: true }).eq('created_by', userId),
    ])
    const orgCount = legacyOrganizer.status === 'fulfilled' && !legacyOrganizer.value.error
      ? (legacyOrganizer.value.count ?? 0) : 0
    const userCount = legacyUser.status === 'fulfilled' && !legacyUser.value.error
      ? (legacyUser.value.count ?? 0) : 0
    const legacyCount = Math.max(orgCount, userCount)
    const v2Count = v2.status === 'fulfilled' ? (v2.value.count ?? 0) : 0
    return legacyCount + v2Count
  }

  private static async getRecentUserEvents(userId: string) {
    const [legacyOrgResult, legacyUserResult, v2Result] = await Promise.allSettled([
      supabase
        .from('events')
        .select('id, title, created_at, capacity')
        .eq('organizer_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('events')
        .select('id, title, created_at, capacity')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('events_v2')
        .select('id, title, created_at, capacity')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    const orgEvents = legacyOrgResult.status === 'fulfilled' && !legacyOrgResult.value.error
      ? (legacyOrgResult.value.data ?? []) : []
    const userEvents = legacyUserResult.status === 'fulfilled' && !legacyUserResult.value.error
      ? (legacyUserResult.value.data ?? []) : []
    // Deduplicate by id, preferring organizer_id results
    const seenIds = new Set(orgEvents.map(e => e.id))
    const legacy = [...orgEvents, ...userEvents.filter(e => !seenIds.has(e.id))]
    const modern = (v2Result.status === 'fulfilled' ? (v2Result.value.data ?? []) : []).map(e => ({
      ...e,
      title: e.title || 'Event',
    }))

    return [...legacy, ...modern]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
  }

  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    return safeQuery(async () => {
      const [engagementResult, followersResult, eventCountResult] = await Promise.allSettled([
        sumPostEngagementForUser(userId),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
        this.getUserEventCount(userId),
      ])

      const postTotals =
        engagementResult.status === 'fulfilled' ? engagementResult.value : { likes: 0, shares: 0, views: 0 }
      const { likes, shares, views } = postTotals
      const followers =
        followersResult.status === 'fulfilled' && !followersResult.value.error
          ? (followersResult.value.count ?? 0)
          : 0
      const events = eventCountResult.status === 'fulfilled' ? eventCountResult.value : 0

      const engagement = followers > 0 ? Math.min(100, Math.round(((likes + shares) / followers) * 10)) : 0
      const completion = events > 0 ? Math.min(100, 60 + Math.round((likes + shares) % 40)) : 60

      return { likes, followers, shares, views, revenue: 0, events, engagement, completion }
    }, ZERO_STATS)
  }

  static async getDashboardActivity(userId: string): Promise<DashboardActivity[]> {
    return safeQuery(async () => {
      const activities: DashboardActivity[] = []

      const [postsResult, eventsResult, followsResult] = await Promise.allSettled([
        supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        this.getRecentUserEvents(userId),
        supabase
          .from('follows')
          .select('id, created_at')
          .eq('following_id', userId)
          .order('created_at', { ascending: false })
          .limit(3),
      ])

      const recentPosts = postsResult.status === 'fulfilled' ? (postsResult.value.data ?? []) : []
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
          value: post.likes_count || 0,
        })
      })

      const recentEvents = eventsResult.status === 'fulfilled' ? eventsResult.value : []
      recentEvents.forEach((event) => {
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
          value: event.capacity || 0,
        })
      })

      const recentFollowers = followsResult.status === 'fulfilled' ? (followsResult.value.data ?? []) : []
      if (recentFollowers.length > 0) {
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
          value: recentFollowers.length,
        })
      }

      activities.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      })

      return activities
    }, [])
  }

  static async getAccountMetrics(accounts: UserAccount[]): Promise<AccountMetrics[]> {
    const results = await Promise.allSettled(
      accounts.map(async (account): Promise<AccountMetrics> => {
        const stats = await this.getDashboardStats(account.profile_id)

        let urgentCount = 0
        if (account.account_type === 'venue' || account.account_type === 'artist') {
          const col = account.account_type === 'venue' ? 'venue_id' : 'requester_id'
          const res = await safeQuery(
            async () => supabase
              .from('venue_booking_requests')
              .select('*', { count: 'exact', head: true })
              .eq(col, account.profile_id)
              .eq('status', 'pending'),
            { count: 0 } as any,
          )
          urgentCount = res.count ?? 0
        }

        return {
          accountId: account.profile_id,
          accountType: account.account_type,
          stats,
          urgentCount,
          recentActivity: '2 hours ago',
        }
      }),
    )

    return results
      .filter((r): r is PromiseFulfilledResult<AccountMetrics> => r.status === 'fulfilled')
      .map((r) => r.value)
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