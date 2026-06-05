import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('events')
  return idx >= 0 ? segments[idx + 1] : null
}

export const POST = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

  const { recipients } = await request.json()
  if (!Array.isArray(recipients) || recipients.length === 0)
    return NextResponse.json({ error: 'recipients array is required' }, { status: 400 })

  const now = new Date().toISOString()

  // Mark day sheet as distributed
  await supabase
    .from('day_sheets')
    .update({ distributed_at: now, recipients, updated_at: now })
    .eq('event_id', eventId)

  // Fetch the event title for the notification
  const { data: event } = await supabase
    .from('events_v2')
    .select('title')
    .eq('id', eventId)
    .maybeSingle()

  const eventTitle = event?.title || 'your event'
  const daySheetUrl = `/admin/dashboard/events/${eventId}/day-sheet`

  // Resolve user IDs from recipients (may be emails or user IDs)
  const serviceClient = createServiceRoleClient()
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const userIds: string[] = []
  const emails: string[] = []

  for (const r of recipients) {
    if (typeof r === 'string' && uuidRegex.test(r)) {
      userIds.push(r)
    } else if (typeof r === 'string' && r.includes('@')) {
      emails.push(r)
    }
  }

  // Look up user IDs for email addresses
  if (emails.length > 0) {
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id')
      .in('email', emails)

    ;(profiles || []).forEach((p: any) => userIds.push(p.id))
  }

  // Insert in-app notifications for each resolved user
  if (userIds.length > 0) {
    const notificationRows = userIds.map((userId) => ({
      user_id: userId,
      type: 'day_sheet_distributed',
      title: `Day Sheet: ${eventTitle}`,
      content: `The day sheet for ${eventTitle} has been shared with you.`,
      metadata: { event_id: eventId, url: daySheetUrl },
    }))

    // Use service role to bypass RLS (writing for other users)
    await serviceClient.from('notifications').insert(notificationRows)
  }

  return NextResponse.json({
    success: true,
    message: `Day sheet distributed to ${recipients.length} recipient(s)`,
    notified: userIds.length,
    recipients,
  })
})
