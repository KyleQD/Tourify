import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"

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

  const { data: existing } = await supabase
    .from('day_sheets')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    const { data: receipts } = await supabase
      .from('day_sheet_receipts')
      .select('*')
      .eq('event_id', eventId)
      .order('sent_at', { ascending: false })

    return NextResponse.json({ day_sheet: existing, receipts: receipts || [] })
  }

  // Auto-generate from event data
  const [{ data: event }, { data: adv }] = await Promise.all([
    supabase.from('events_v2').select('id, title, start_at, settings, org_id').eq('id', eventId).maybeSingle(),
    supabase.from('advancing_documents').select('catering_notes, venue_contact_phone').eq('event_id', eventId).maybeSingle(),
  ])

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const settings = event.settings || {}
  const startAt = event.start_at ? new Date(event.start_at) : new Date()
  const startDate = startAt.toISOString().slice(0, 10)

  const toTime = (hhmm: string | null | undefined) => {
    if (!hhmm) return null
    return hhmm.length === 5 ? hhmm : null
  }

  const stub = {
    event_id: eventId,
    org_id: event.org_id,
    venue_name: settings.venue_label || '',
    load_in_time: toTime(settings.load_in_time),
    sound_check_time: toTime(settings.sound_check_time),
    doors_open_time: toTime(settings.doors_open),
    headliner_set_time: startAt.toTimeString().slice(0, 5),
    catering_notes: adv?.catering_notes || null,
  }

  return NextResponse.json({ day_sheet: stub, auto_generated: true })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const orgId = await resolveOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('day_sheets')
    .upsert({ ...body, event_id: eventId, org_id: orgId, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ day_sheet: data })
})
