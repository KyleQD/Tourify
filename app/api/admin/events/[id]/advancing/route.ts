import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

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

  const orgId = await resolveOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 400 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('advancing_documents')
    .upsert({ ...body, event_id: eventId, org_id: orgId, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advancing: data })
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

  const body = await request.json()
  const { id, ...updates } = body

  const { data, error } = await supabase
    .from('advancing_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advancing: data })
})
