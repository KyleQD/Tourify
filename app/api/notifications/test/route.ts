import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { NotificationService } from '@/lib/services/notification-service'
import { isAuthorizedInternalRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to get authenticated user
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

// POST /api/notifications/test - Create test notifications
export async function POST(request: NextRequest) {
  if (!isAuthorizedInternalRequest(request)) return unauthorizedResponse()
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type = 'all' } = await request.json()

    const testNotifications = []

    if (type === 'all' || type === 'like') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'like',
          title: 'John Doe liked your post',
          content: 'John Doe liked your post "Summer Tour Announcement"',
          summary: 'John Doe liked your post',
          relatedUserId: 'test-user-1',
          metadata: {
            contentTitle: 'Summer Tour Announcement',
            contentType: 'post'
          }
        })
      )
    }

    if (type === 'all' || type === 'comment') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'comment',
          title: 'Sarah Wilson commented on your post',
          content: 'Sarah Wilson commented: "This is going to be amazing! Can\'t wait to see you live!" on your post',
          summary: 'Sarah Wilson commented on your post',
          relatedUserId: 'test-user-2',
          metadata: {
            commentText: "This is going to be amazing! Can't wait to see you live!",
            contentType: 'post'
          }
        })
      )
    }

    if (type === 'all' || type === 'follow') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'follow',
          title: 'Mike Johnson started following you',
          content: 'Mike Johnson started following you. You now have 1,247 followers.',
          summary: 'Mike Johnson started following you',
          relatedUserId: 'test-user-3'
        })
      )
    }

    if (type === 'all' || type === 'message') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'message',
          title: 'New message from Emma Davis',
          content: 'Emma Davis sent you a message: "Hey! I loved your latest track. Would you be interested in collaborating?"',
          summary: 'New message from Emma Davis',
          relatedUserId: 'test-user-4',
          priority: 'high'
        })
      )
    }

    if (type === 'all' || type === 'booking_request') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'booking_request',
          title: 'New booking request',
          content: 'The Grand Hall wants to book you for their Summer Music Festival on July 15th, 2024',
          summary: 'New booking request from The Grand Hall',
          relatedUserId: 'test-venue-1',
          priority: 'high',
          metadata: {
            eventName: 'Summer Music Festival',
            eventDate: '2024-07-15'
          }
        })
      )
    }

    if (type === 'all' || type === 'event_invite') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'event_invite',
          title: 'You\'re invited to Jazz Night',
          content: 'Blue Note Club invited you to perform at Jazz Night on June 20th, 2024 at 8:00 PM',
          summary: 'Event invitation from Blue Note Club',
          relatedUserId: 'test-venue-2',
          metadata: {
            eventName: 'Jazz Night',
            eventDate: '2024-06-20',
            eventLocation: 'Blue Note Club'
          }
        })
      )
    }

    if (type === 'all' || type === 'system_alert') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'system_alert',
          title: 'System Maintenance',
          content: 'We\'ll be performing scheduled maintenance on Sunday, June 10th from 2:00 AM to 4:00 AM EST. Some features may be temporarily unavailable.',
          summary: 'Scheduled maintenance notification',
          priority: 'normal'
        })
      )
    }

    if (type === 'all' || type === 'feature_update') {
      testNotifications.push(
        await NotificationService.createNotification({
          userId: user.id,
          type: 'feature_update',
          title: 'New Feature: Advanced Analytics',
          content: 'We\'ve added advanced analytics to help you track your performance metrics and audience engagement in real-time.',
          summary: 'New analytics feature available',
          priority: 'normal'
        })
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${testNotifications.length} test notifications`,
      notifications: testNotifications.filter(Boolean)
    })
  } catch (error) {
    console.error('Error creating test notifications:', error)
    return NextResponse.json(
      { error: 'Failed to create test notifications' },
      { status: 500 }
    )
  }
} 