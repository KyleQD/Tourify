import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAuthorizedCronRequest, unauthorizedResponse } from '@/lib/auth/route-guards'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function runRefresh(request: NextRequest) {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ success: false, error: 'Server misconfigured' }, { status: 503 })

  const search = new URL(request.url).searchParams
  const limit = Math.min(Math.max(Number(search.get('limit') || 200), 1), 1000)
  const venueId = search.get('venue_id')
  const staleOnly = search.get('stale_only') === '1'

  if (venueId) {
    const { error } = await admin.rpc('refresh_staffing_overview_cache', { p_venue_id: venueId })
    return NextResponse.json({
      success: !error,
      scanned: 1,
      refreshed: error ? 0 : 1,
      failures: error ? [`${venueId}: ${error.message}`] : [],
      mode: 'single',
    }, { status: error ? 500 : 200 })
  }

  let venueRows: Array<{ id: string }> = []
  if (staleOnly) {
    const staleCutoff = new Date(Date.now() - 120 * 1000).toISOString()
    const { data: staleRows, error: staleError } = await admin
      .from('staffing_overview_cache')
      .select('venue_id')
      .lt('refreshed_at', staleCutoff)
      .order('refreshed_at', { ascending: true })
      .limit(limit)
    if (staleError)
      return NextResponse.json({ success: false, error: staleError.message }, { status: 500 })
    venueRows = (staleRows || []).map((row: any) => ({ id: row.venue_id }))
  } else {
    const { data: venues, error: venuesError } = await admin
      .from('venues')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (venuesError)
      return NextResponse.json({ success: false, error: venuesError.message }, { status: 500 })
    venueRows = venues || []
  }

  let refreshed = 0
  const failures: string[] = []
  for (const venue of venueRows) {
    const { error } = await admin.rpc('refresh_staffing_overview_cache', { p_venue_id: venue.id })
    if (error) failures.push(`${venue.id}: ${error.message}`)
    else refreshed++
  }

  return NextResponse.json({
    success: true,
    scanned: venueRows.length,
    refreshed,
    failures: failures.slice(0, 50),
    mode: staleOnly ? 'stale-only' : 'all',
  })
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runRefresh(request)
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()
  return runRefresh(request)
}
