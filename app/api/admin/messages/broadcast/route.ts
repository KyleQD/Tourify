import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

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

    const supabase = await createClient()

    const recipientUserIds = await resolveRecipientGroup(supabase, recipientGroup)

    if (recipientUserIds.length === 0) {
      return NextResponse.json({ success: true, broadcastId: null, recipientCount: 0 })
    }

    const broadcastId = crypto.randomUUID()

    const notificationRows = recipientUserIds.map((userId: string) => ({
      user_id: userId,
      type: 'admin_broadcast',
      title: templateId ? `Broadcast (${templateId})` : 'Admin Broadcast',
      message,
      data: { broadcastId, recipientGroup, templateId: templateId || null },
      read: false,
    }))

    const BATCH_SIZE = 500
    for (let i = 0; i < notificationRows.length; i += BATCH_SIZE) {
      const batch = notificationRows.slice(i, i + BATCH_SIZE)
      const { error: insertError } = await supabase.from('notifications').insert(batch)
      if (insertError) {
        console.error('[Broadcast] Insert error at batch', i, insertError)
        return NextResponse.json(
          { success: false, error: 'Failed to insert broadcast notifications' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      broadcastId,
      recipientCount: recipientUserIds.length,
    })
  } catch (error) {
    console.error('[Admin Messages Broadcast API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to broadcast message' }, { status: 500 })
  }
}

async function resolveRecipientGroup(supabase: any, group: string): Promise<string[]> {
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
