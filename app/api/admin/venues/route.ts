import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasAdminCapability } from '@/lib/auth/admin-capabilities'

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

/**
 * ADM-M-008 — org-scoped admin venues API.
 *
 * Previously this listed every venue_profiles row platform-wide and joined
 * event metrics by exact venue_name across ALL organizations (cross-org
 * count leakage + name-collision miscounts). Metrics are now computed over
 * the acting org's events only, and POST records the creating org in
 * metadata so future structural linking has an authoritative anchor.
 */

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, 'vendor.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || searchParams.get('q') || ''
  const includeMetrics = searchParams.get('include') === 'metrics'
  const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Venues relevant to the acting org = venues hosting that org's events.
  // venue_profiles remains a shared directory (like lodging_providers); the
  // tenant boundary is enforced on the EVENT join, not the directory read.
  let query = auth.supabase
    .from('venue_profiles')
    .select('id, user_id, venue_name, city, state, capacity, address, website, contact_email, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
    .range(offset, offset + limit - 1)

  if (search) query = query.ilike('venue_name', `%${search}%`)

  const { data: venues, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = venues || []

  // Org-scoped metrics: events belonging to the acting org only.
  const metricsMap: Record<string, { total: number; upcoming: number }> = {}
  if (includeMetrics && result.length > 0) {
    const venueNames = result.map((v: any) => v.venue_name).filter(Boolean)
    const { data: eventRows } = await auth.supabase
      .from('events_v2')
      .select('venue_name, start_at')
      .eq('org_id', admin.orgId)
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
      owner_user_id: v.user_id,
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
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, 'vendor.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createVenueSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await auth.supabase
    .from('venue_profiles')
    .insert({
      ...parsed.data,
      user_id: auth.user.id,
    })
    .select('id, venue_name, address, city, state, capacity')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ venue: data }, { status: 201 })
}
