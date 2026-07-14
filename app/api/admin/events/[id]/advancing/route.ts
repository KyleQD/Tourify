import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"
import { mapAdvancingStatusToTourAdvanceStatus } from '@/lib/admin/admin-ops-context'

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('events')
  return idx >= 0 ? segments[idx + 1] : null
}

async function resolveOrgId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from('org_members').select('org_id').eq('user_id', userId).limit(1).maybeSingle()
  return data?.org_id ?? null
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  // Try to fetch existing advancing document
  const { data: existing } = await supabase
    .from('advancing_documents')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return NextResponse.json({ advancing: existing })

  // Auto-generate from event data
  const orgId = await resolveOrgId(supabase, user.id)
  const { data: event } = await supabase
    .from('events_v2')
    .select('id, title, venue_id, settings, start_at, org_id')
    .eq('id', eventId)
    .maybeSingle()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const settings = event.settings || {}
  const stub = {
    event_id: eventId,
    org_id: orgId || event.org_id,
    venue_contact_name: settings.venue_contact_name || null,
    venue_contact_phone: settings.venue_contact_phone || null,
    venue_contact_email: settings.venue_contact_email || null,
    status: 'pending',
  }

  return NextResponse.json({ advancing: stub, auto_generated: true })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const orgId = await resolveOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('advancing_documents')
    .upsert({ ...body, event_id: eventId, org_id: orgId, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.status !== undefined) {
    await supabase
      .from('tour_events')
      .update({ advance_status: mapAdvancingStatusToTourAdvanceStatus(body.status) })
      .eq('event_id', eventId)
  }

  // Notify venue contact + participants when marked sent
  if (body.status === 'sent') {
    try {
      const { createServiceRoleClient } = await import('@/lib/supabase/service-role')
      const serviceClient = createServiceRoleClient()
      const { data: event } = await supabase
        .from('events_v2')
        .select('title, settings')
        .eq('id', eventId)
        .maybeSingle()
      const eventTitle = event?.title || 'your event'
      const settings = event?.settings && typeof event.settings === 'object' ? event.settings as Record<string, unknown> : {}
      const notifyUserIds = new Set<string>()

      // Prefer venue account profile email over free-text when both exist
      let venueEmail = data?.venue_contact_email || body.venue_contact_email || null
      const venueAccountId = typeof settings.venue_account_id === 'string' ? settings.venue_account_id : null
      if (venueAccountId) {
        const { data: venueProfile } = await serviceClient
          .from('venue_profiles')
          .select('id, contact_info, user_id')
          .eq('id', venueAccountId)
          .maybeSingle()
        const contactInfo = venueProfile?.contact_info && typeof venueProfile.contact_info === 'object'
          ? venueProfile.contact_info as Record<string, unknown>
          : {}
        if (typeof contactInfo.email === 'string' && contactInfo.email.trim()) {
          venueEmail = contactInfo.email.trim()
        }
        if (venueProfile?.user_id) notifyUserIds.add(venueProfile.user_id)
      }

      if (venueEmail) {
        const { data: profiles } = await serviceClient
          .from('profiles')
          .select('id')
          .eq('email', venueEmail)
        for (const profile of profiles || []) notifyUserIds.add(profile.id)
      }

      const { data: participants } = await supabase
        .from('event_participants')
        .select('participant_id')
        .eq('event_id', eventId)
        .in('participant_type', ['Individual', 'Artist'])
        .limit(100)

      for (const participant of participants || []) {
        if (participant.participant_id) notifyUserIds.add(participant.participant_id)
      }

      if (notifyUserIds.size > 0) {
        await serviceClient.from('notifications').insert(
          Array.from(notifyUserIds).map((userId) => ({
            user_id: userId,
            type: 'advance_sent',
            title: `Advance sent: ${eventTitle}`,
            content: `The advancing package for ${eventTitle} has been marked as sent.`,
            metadata: {
              event_id: eventId,
              url: data?.share_token ? `/advance/${data.share_token}` : `/admin/dashboard/events/${eventId}/advancing`,
            },
          }))
        )
      }
    } catch (notifyError) {
      console.warn('[Advancing] mark-sent notification skipped:', notifyError)
    }
  }

  return NextResponse.json({ advancing: data })
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from('advancing_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (updates.status !== undefined) {
    await supabase
      .from('tour_events')
      .update({ advance_status: mapAdvancingStatusToTourAdvanceStatus(updates.status) })
      .eq('event_id', eventId)
  }

  return NextResponse.json({ advancing: data })
})
