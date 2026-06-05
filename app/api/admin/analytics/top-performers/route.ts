import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // Top artists by event_participants count
  let artistQuery = supabase
    .from('event_participants')
    .select('user_id')

  if (from || to) {
    // We join via events to filter by date — use a simpler approach
    if (from) artistQuery = artistQuery.gte('created_at', `${from}T00:00:00Z`)
    if (to) artistQuery = artistQuery.lte('created_at', `${to}T23:59:59Z`)
  }

  const { data: participantRows } = await artistQuery.limit(5000)

  // Count per user
  const userCounts: Record<string, number> = {}
  ;(participantRows || []).forEach((r: any) => {
    if (r.user_id) userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1
  })

  const topUserIds = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  let artistNames: Record<string, string> = {}
  if (topUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from('artist_profiles')
      .select('user_id, artist_name')
      .in('user_id', topUserIds)
    ;(profiles || []).forEach((p: any) => { artistNames[p.user_id] = p.artist_name })

    // Fallback to profiles table
    const missingIds = topUserIds.filter(id => !artistNames[id])
    if (missingIds.length > 0) {
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', missingIds)
      ;(fallbackProfiles || []).forEach((p: any) => {
        artistNames[p.id] = p.full_name || p.username || p.id.slice(0, 8)
      })
    }
  }

  const topArtists = topUserIds.map(id => ({
    name: artistNames[id] || id.slice(0, 8),
    count: userCounts[id],
  }))

  // Top events by ticket count from events_v2
  let eventsQuery = supabase
    .from('events_v2')
    .select('id, title, capacity')
    .order('capacity', { ascending: false })
    .limit(10)

  if (from) eventsQuery = eventsQuery.gte('start_at', `${from}T00:00:00Z`)
  if (to) eventsQuery = eventsQuery.lte('start_at', `${to}T23:59:59Z`)

  const { data: eventRows } = await eventsQuery

  const topEvents = (eventRows || []).map((e: any) => ({
    name: e.title || 'Untitled Event',
    tickets: e.capacity || 0,
    revenue: 0,
  }))

  return NextResponse.json({ artists: topArtists, events: topEvents })
})
