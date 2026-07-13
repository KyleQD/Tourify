import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('events')
  return idx >= 0 ? segments[idx + 1] : null
}

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const { recipients } = await request.json()
  if (!Array.isArray(recipients) || recipients.length === 0)
    return NextResponse.json({ error: 'recipients array is required' }, { status: 400 })

  const now = new Date().toISOString()
  const { data: currentDaySheet } = await supabase
    .from('day_sheets')
    .select('version')
    .eq('event_id', eventId)
    .maybeSingle()
  const version = Number(currentDaySheet?.version || 0) + 1

  // Mark day sheet as distributed and increment version for receipt tracking.
  const { data: daySheet } = await supabase
    .from('day_sheets')
    .update({ distributed_at: now, recipients, version, updated_at: now })
    .eq('event_id', eventId)
    .select('id, version')
    .maybeSingle()

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

  const receiptRows = [
    ...emails.map((email) => ({
      event_id: eventId,
      recipient_email: email,
      version,
      status: 'sent',
      sent_at: now,
      metadata: { source: 'email' },
    })),
    ...userIds.map((userId) => ({
      event_id: eventId,
      recipient_user_id: userId,
      version,
      status: 'sent',
      sent_at: now,
      metadata: { source: 'user' },
    })),
  ]

  if (receiptRows.length > 0) {
    const { error: receiptsError } = await supabase
      .from('day_sheet_receipts')
      .insert(receiptRows)

    if (receiptsError && receiptsError.code !== '42P01' && receiptsError.code !== '23505') {
      console.error('[Day Sheet Distribute] receipt upsert failed:', receiptsError)
    }
  }

  await supabase.from('work_mode_publications').insert({
    event_id: eventId,
    publication_type: 'day_sheet',
    title: `Day Sheet: ${eventTitle}`,
    payload: { url: daySheetUrl, recipients, version },
    visible_to: ['assigned_workers'],
    published_at: now,
  })

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
