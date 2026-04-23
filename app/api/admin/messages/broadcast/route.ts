import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { OptimizedNotificationService } from '@/lib/services/optimized-notification-service'

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateApiRequest(request)
    if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { user } = auth
    const hasAdmin = await checkAdminPermissions(user)
    if (!hasAdmin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { recipientGroup, message, templateId } = body || {}

    if (!recipientGroup || !message) {
      return NextResponse.json({ success: false, error: 'recipientGroup and message are required' }, { status: 400 })
    }

    const svc = createServiceRoleClient()
    const recipientUserIds = await resolveRecipientGroup(svc, recipientGroup)

    if (recipientUserIds.length === 0) {
      return NextResponse.json({ success: true, broadcastId: null, recipientCount: 0 })
    }

    const broadcastId = crypto.randomUUID()
    const title = templateId ? `Broadcast (${templateId})` : 'Admin Broadcast'

    const BATCH_SIZE = 200
    let delivered = 0
    for (let i = 0; i < recipientUserIds.length; i += BATCH_SIZE) {
      const slice = recipientUserIds.slice(i, i + BATCH_SIZE)
      const batch = slice.map((recipientId: string) => ({
        userId: recipientId,
        type: 'admin_broadcast',
        title,
        content: typeof message === 'string' ? message : String(message),
        summary: 'Broadcast from Tourify admin',
        metadata: {
          broadcastId,
          recipientGroup,
          templateId: templateId || null,
          senderUserId: user.id,
        },
        relatedUserId: user.id,
        priority: 'normal' as const,
      }))

      const created = await OptimizedNotificationService.createBatchNotifications(batch)
      delivered += created.length
    }

    return NextResponse.json({
      success: true,
      broadcastId,
      recipientCount: recipientUserIds.length,
      deliveredCount: delivered,
    })
  } catch (error) {
    console.error('[Admin Messages Broadcast API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to broadcast message' }, { status: 500 })
  }
}

async function resolveRecipientGroup(supabase: ReturnType<typeof createServiceRoleClient>, group: string): Promise<string[]> {
  try {
    let query = supabase.from('profiles').select('id')

    switch (group) {
      case 'all-staff':
        query = query.in('account_type', ['artist', 'venue', 'admin', 'organizer', 'organization', 'general'])
        break
      case 'tour-managers':
      case 'organizers':
        query = query.in('account_type', ['admin', 'organizer', 'organization'])
        break
      case 'artists':
        query = query.eq('account_type', 'artist')
        break
      case 'venues':
        query = query.eq('account_type', 'venue')
        break
      default:
        query = query.in('account_type', ['artist', 'venue', 'admin', 'organizer', 'organization', 'general'])
        break
    }

    const { data, error } = await query
    if (error) {
      console.error('[Broadcast] Failed to resolve recipient group:', error)
      return []
    }
    return (data || []).map((row: { id: string }) => row.id)
  } catch (err) {
    console.error('[Broadcast] resolveRecipientGroup error:', err)
    return []
  }
}
