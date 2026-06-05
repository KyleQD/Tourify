import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'

const createVenueSchema = z.object({
  venue_name: z.string().min(1),
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

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || searchParams.get('q') || ''
  const includeMetrics = searchParams.get('include') === 'metrics'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)

  let query = supabase
    .from('venue_profiles')
    .select('id, venue_name, city, state, capacity, address, website, contact_email, created_at')
    .limit(limit)

  if (search) query = query.ilike('venue_name', `%${search}%`)

  const { data: venues, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = venues || []

  // Fetch event metrics per venue if requested
  let metricsMap: Record<string, { total: number; upcoming: number }> = {}
  if (includeMetrics && result.length > 0) {
    const venueNames = result.map((v: any) => v.venue_name).filter(Boolean)
    const { data: eventRows } = await supabase
      .from('events_v2')
      .select('venue_name, start_at')
      .in('venue_name', venueNames)

    ;(eventRows || []).forEach((e: any) => {
      const vn = e.venue_name
      if (!vn) return
      if (!metricsMap[vn]) metricsMap[vn] = { total: 0, upcoming: 0 }
      metricsMap[vn].total += 1
      if (e.start_at && new Date(e.start_at) > new Date()) metricsMap[vn].upcoming += 1
    })
  }

  return NextResponse.json({
    venues: result.map((v: any) => ({
      id: v.id,
      name: v.venue_name,
      city: v.city,
      state: v.state,
      capacity: v.capacity,
      address: v.address,
      website: v.website,
      contact_email: v.contact_email,
      created_at: v.created_at,
      hosted_events_count: includeMetrics ? (metricsMap[v.venue_name]?.total ?? 0) : undefined,
      upcoming_events_count: includeMetrics ? (metricsMap[v.venue_name]?.upcoming ?? 0) : undefined,
    })),
  })
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const body = await request.json()
  const parsed = createVenueSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('venue_profiles')
    .insert(parsed.data)
    .select('id, venue_name, city, state, capacity')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ venue: data }, { status: 201 })
})
