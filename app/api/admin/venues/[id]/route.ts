import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'

const patchSchema = z.object({
  venue_name: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  capacity: z.number().optional(),
  website: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
})

function extractVenueId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('venues')
  return idx >= 0 ? segments[idx + 1] || null : null
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const id = extractVenueId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing venue id' }, { status: 400 })

  const { data: venue, error } = await supabase
    .from('venue_profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 })

  // Fetch events at this venue
  const { data: eventRows } = await supabase
    .from('events_v2')
    .select('id, title, start_at, status, capacity')
    .ilike('venue_name', `%${venue.venue_name}%`)
    .order('start_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    venue: {
      id: venue.id,
      name: venue.venue_name,
      address: venue.address || null,
      city: venue.city || null,
      state: venue.state || null,
      zip: venue.zip || null,
      country: venue.country || null,
      capacity: venue.capacity || null,
      website: venue.website || null,
      contact_name: venue.contact_name || null,
      contact_email: venue.contact_email || null,
      contact_phone: venue.contact_phone || null,
      notes: venue.notes || null,
      created_at: venue.created_at,
    },
    events: (eventRows || []).map((e: any) => ({
      id: e.id,
      name: e.title,
      start_date: e.start_at,
      status: e.status,
      capacity: e.capacity,
    })),
  })
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const id = extractVenueId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing venue id' }, { status: 400 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('venue_profiles')
    .update(parsed.data)
    .eq('id', id)
    .select('id, venue_name, city, state, capacity')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ venue: data })
})
