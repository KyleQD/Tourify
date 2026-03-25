import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return null
  }

  return user
}

async function checkAdmin(user: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin || false
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/notifications/analytics - Get notification analytics
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'user' // 'user' or 'system'
    const timeRange = searchParams.get('timeRange') || '30d' // '7d', '30d', '90d'

    if (scope === 'system') {
      // System-wide analytics (admin only)
      const isAdmin = await checkAdmin(user)
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Calculate time range
      const days = parseInt(timeRange.replace('d', ''))
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      // Get system-wide metrics
      const [
        totalNotifications,
        totalUsers,
        notificationsByType,
        deliveryMetrics,
        topUsers,
        recentActivity
      ] = await Promise.all([
        // Total notifications in time range
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate),

        // Total active users
        supabase
          .from('notifications')
          .select('user_id')
          .gte('created_at', startDate)
          .then(result => {
            const uniqueUsers = new Set(result.data?.map(n => n.user_id) || [])
            return uniqueUsers.size
          }),

        // Notifications by type
        supabase
          .from('notifications')
          .select('type')
          .gte('created_at', startDate)
          .then(result => {
            const typeCounts = result.data?.reduce((acc, notification) => {
              acc[notification.type] = (acc[notification.type] || 0) + 1
              return acc
            }, {} as Record<string, number>) || {}
            
            return Object.entries(typeCounts)
              .map(([type, count]) => ({ type, count }))
              .sort((a, b) => b.count - a.count)
          }),

        // Delivery metrics (placeholder - would need analytics table)
        Promise.resolve({
          deliveryRate: 99.5,
          averageLatency: 150,
          errorRate: 0.5
        }),

        // Top users by notification count
        supabase
          .from('notifications')
          .select(`
            user_id,
            profiles!notifications_user_id_fkey(full_name, username)
          `)
          .gte('created_at', startDate)
          .then(result => {
            const userCounts = result.data?.reduce((acc, notification) => {
              const userId = notification.user_id
              acc[userId] = (acc[userId] || 0) + 1
              return acc
            }, {} as Record<string, number>) || {}
            
            return Object.entries(userCounts)
              .map(([userId, count]) => ({
                userId,
                count,
                user: result.data?.find(n => n.user_id === userId)?.profiles
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
          }),

        // Recent activity (last 7 days)
        supabase
          .from('notifications')
          .select('type, created_at')
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(100)
      ])

      return NextResponse.json({
        scope: 'system',
        timeRange,
        metrics: {
          totalNotifications: totalNotifications.count || 0,
          totalUsers,
          notificationsByType,
          deliveryMetrics,
          topUsers,
          recentActivity: recentActivity || []
        }
      })

    } else {
      // User-specific analytics
      const metrics = await OptimizedNotificationService.getMetrics(user.id)

      return NextResponse.json({
        scope: 'user',
        timeRange,
        metrics
      })
    }

  } catch (error) {
    console.error('Error fetching notification analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification analytics' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/analytics - Create analytics report
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, timeRange = '30d', format = 'json' } = body

    if (action === 'generate_report') {
      const isAdmin = await checkAdmin(user)
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Generate comprehensive analytics report
      const days = parseInt(timeRange.replace('d', ''))
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const [
        totalNotificationsCount,
        notificationsByType,
        notificationsByDay,
        userEngagement,
        deliveryMetrics
      ] = await Promise.all([
        // Total notifications
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', startDate),

        // Notifications by type
        supabase
          .from('notifications')
          .select('type')
          .gte('created_at', startDate),

        // Notifications by day
        supabase
          .from('notifications')
          .select('created_at')
          .gte('created_at', startDate),

        // User engagement
        supabase
          .from('notifications')
          .select('user_id, is_read')
          .gte('created_at', startDate),

        // Delivery metrics (placeholder)
        Promise.resolve({
          deliveryRate: 99.5,
          averageLatency: 150,
          errorRate: 0.5
        })
      ])

      // Process daily data
      const dailyData = notificationsByDay.data?.reduce((acc, notification) => {
        const date = new Date(notification.created_at).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Process type data
      const typeData = notificationsByType.data?.reduce((acc, notification) => {
        acc[notification.type] = (acc[notification.type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      // Process engagement data
      const totalNotifications = notificationsByType.data?.length || 0
      const readNotifications = userEngagement.data?.filter(n => n.is_read).length || 0
      const engagementRate = totalNotifications > 0 ? (readNotifications / totalNotifications) * 100 : 0

      const report = {
        generatedAt: new Date().toISOString(),
        timeRange,
        period: {
          startDate,
          endDate: new Date().toISOString()
        },
        summary: {
          totalNotifications: totalNotificationsCount.count || 0,
          uniqueUsers: new Set(userEngagement.data?.map(n => n.user_id)).size,
          engagementRate: Math.round(engagementRate * 100) / 100,
          deliveryMetrics
        },
        breakdown: {
          byType: typeData,
          byDay: dailyData
        },
        insights: {
          mostActiveType: Object.entries(typeData).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A',
          averageNotificationsPerDay: Math.round(totalNotifications / days * 100) / 100,
          peakDay: Object.entries(dailyData).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        }
      }

      return NextResponse.json({
        report,
        format,
        message: 'Analytics report generated successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "generate_report"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error generating analytics report:', error)
    return NextResponse.json(
      { error: 'Failed to generate analytics report' },
      { status: 500 }
    )
  }
}
