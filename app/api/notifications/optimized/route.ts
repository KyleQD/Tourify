import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { OptimizedNotificationService, SocialNotificationHelpers } from '@/lib/services/optimized-notification-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createNotificationSchema = z.object({
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

const batchNotificationSchema = z.array(createNotificationSchema)

const getUserNotificationsSchema = z.object({
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  unreadOnly: z.boolean().optional(),
  type: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  includeExpired: z.boolean().optional()
})

const markAsReadSchema = z.object({
  notificationId: z.string().uuid()
})

const socialInteractionSchema = z.object({
  type: z.enum(['like', 'comment', 'share']),
  postId: z.string().uuid(),
  content: z.string().optional(), // For comments
  sharedTo: z.string().optional() // For shares
})

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

async function checkAdminOrSelf(user: any, targetUserId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin || user.id === targetUserId
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

// GET /api/notifications/optimized - Get user's notifications with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = {
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      unreadOnly: searchParams.get('unreadOnly') === 'true',
      type: searchParams.get('type') || undefined,
      priority: searchParams.get('priority') as 'low' | 'normal' | 'high' | 'urgent' || undefined,
      includeExpired: searchParams.get('includeExpired') === 'true'
    }

    const validatedParams = getUserNotificationsSchema.parse(params)

    const result = await OptimizedNotificationService.getUserNotifications(
      user.id,
      validatedParams
    )

    return NextResponse.json({
      notifications: result.notifications,
      totalCount: result.totalCount,
      unreadCount: result.unreadCount,
      pagination: {
        limit: validatedParams.limit || 50,
        offset: validatedParams.offset || 0,
        hasMore: result.notifications.length === (validatedParams.limit || 50)
      }
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/optimized - Create notification(s)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Check if it's a batch request
    if (Array.isArray(body)) {
      const validatedData = batchNotificationSchema.parse(body)

      // Check permissions for batch
      for (const notification of validatedData) {
        const hasPermission = await checkAdminOrSelf(user, notification.userId)
        if (!hasPermission) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      const notifications = await OptimizedNotificationService.createBatchNotifications(validatedData)
      
      return NextResponse.json({
        notifications,
        count: notifications.length,
        type: 'batch'
      })
    } else {
      const validatedData = createNotificationSchema.parse(body)

      // Check permissions
      const hasPermission = await checkAdminOrSelf(user, validatedData.userId)
      if (!hasPermission) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const notification = await OptimizedNotificationService.createNotification(validatedData)
      
      return NextResponse.json({
        notification,
        type: 'single'
      })
    }
  } catch (error) {
    console.error('Error creating notification:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// PATCH /api/notifications/optimized - Update notification status
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationId } = body

    if (action === 'markAsRead' && notificationId) {
      const validatedData = markAsReadSchema.parse({ notificationId })
      await OptimizedNotificationService.markAsRead(validatedData.notificationId, user.id)
      
      return NextResponse.json({ success: true, action: 'markedAsRead' })
    } else if (action === 'markAllAsRead') {
      const markedCount = await OptimizedNotificationService.markAllAsRead(user.id)
      
      return NextResponse.json({ 
        success: true, 
        action: 'markedAllAsRead',
        count: markedCount
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "markAsRead" or "markAllAsRead"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error updating notification:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/optimized - Delete notification
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    // Delete notification (user can only delete their own)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
