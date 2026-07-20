import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { NotificationService } from '@/lib/services/notification-service'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { generalNotificationTarget } from '@/lib/notifications/notification-target'

/**
 * Auth model: bearer/cookie via `resolveActingContext` → `authenticateApiRequest` (user-scoped).
 * NotificationService may use service-role internally for cross-user fanout writes;
 * this route never elevates the request client to service-role for ownership checks.
 */

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
  expiresAt: z.string().optional(),
  targetProfileId: z.string().uuid().optional(),
  targetAccountType: z.enum(['general', 'artist', 'service', 'venue', 'organization']).optional(),
})

// GET /api/notifications - Get user's notifications for the active account
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') || undefined

    const result = await NotificationService.getUserNotifications(ctx.userId, {
      limit,
      offset,
      unreadOnly,
      type,
      targetProfileId: ctx.profileId,
      accountType: ctx.accountType,
    })

    return NextResponse.json({
      notifications: result.notifications,
      totalCount: result.totalCount,
      unreadCount: result.unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)

    const { data: profile } = await ctx.supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', ctx.userId)
      .single()

    if (!profile?.is_admin && validatedData.userId !== ctx.userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
    }

    const defaultTarget = generalNotificationTarget(validatedData.userId)
    const notification = await NotificationService.createNotification({
      ...validatedData,
      targetProfileId: validatedData.targetProfileId ?? defaultTarget.targetProfileId,
      targetAccountType: validatedData.targetAccountType ?? defaultTarget.targetAccountType,
    })

    return NextResponse.json({ notification })
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

// PATCH /api/notifications - Update notification (mark as read, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const body = await request.json()
    const { action, notificationId } = body

    switch (action) {
      case 'markAsRead':
        if (!notificationId) {
          return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
        }
        await NotificationService.markAsRead(notificationId, ctx.userId)
        return NextResponse.json({ success: true })

      case 'markAllAsRead': {
        const markedCount = await NotificationService.markAllAsRead(ctx.userId, {
          targetProfileId: ctx.profileId,
          accountType: ctx.accountType,
        })
        return NextResponse.json({ success: true, count: markedCount })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { searchParams } = new URL(request.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    await NotificationService.deleteNotification(notificationId, ctx.userId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}
