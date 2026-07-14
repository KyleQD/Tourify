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

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const { data, error } = await supabase
    .from('work_mode_publications')
    .select('*')
    .eq('event_id', eventId)
    .order('published_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ publications: [] })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ publications: data || [] })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })
  await assertAdminEventAccess({ supabase, userId: user.id, eventId })

  const body = await request.json()
  const publicationType = body.publication_type || body.type
  if (!publicationType) return NextResponse.json({ error: 'publication_type is required' }, { status: 400 })

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim()
    : `Event ${publicationType}`

  const { data, error } = await supabase
    .from('work_mode_publications')
    .insert({
      event_id: eventId,
      site_map_id: body.site_map_id || null,
      publication_type: publicationType,
      title,
      payload: body.payload || {},
      visible_to: Array.isArray(body.visible_to) ? body.visible_to : ['assigned_workers'],
      status: 'published',
      published_by: user.id,
      published_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '42P01') {
      return NextResponse.json({ error: 'Work Mode publication table is not migrated yet' }, { status: 501 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ publication: data }, { status: 201 })
})
