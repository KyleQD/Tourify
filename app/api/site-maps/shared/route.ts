import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * VEN-223 — returns ALL site maps the caller can see for their venue context:
 *   1. Venue-owned (site_maps.venue_profile_id → an owned venue profile)
 *   2. Shared via accepted/active/non-expired collaborator rows
 *   3. Event-scoped when ?eventId is supplied
 * VEN-226: can_edit / can_manage_zones / can_manage_tents / can_invite_users /
 * can_export flags are preserved per row (owner implies all).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const venueId = searchParams.get('venue_id')

    // Resolve the caller's owned venue profile ids (VEN-227 entity bridge).
    let ownedVenueIds: string[] = []
    const { data: ownedProfiles } = await supabase
      .from('venue_profiles')
      .select('id')
      .or(`user_id.eq.${user.id},main_profile_id.eq.${user.id}`)
    ownedVenueIds = (ownedProfiles ?? []).map(v => v.id)

    // 1) Venue-owned maps
    let ownedMaps: any[] = []
    if (ownedVenueIds.length > 0) {
      // venue_profile_id ships with migration 20260823220000 — loose call.
      const db = supabase as unknown as {
        from: (
          table: 'site_maps',
        ) => {
          select: (columns: string) => any
        }
      }
      let q: any = db
        .from('site_maps')
        .select(
          'id, name, description, width, height, status, event_id, tour_id, created_at, updated_at, venue_profile_id',
        )
        .in('venue_profile_id', ownedVenueIds)
      if (eventId) q = q.eq('event_id', eventId)
      const { data } = await q.order('updated_at', { ascending: false })
      ownedMaps = (data ?? []).map((m: any) => ({
        ...m,
        permissions: {
          can_edit: true,
          can_manage_zones: true,
          can_manage_tents: true,
          can_invite_users: true,
          can_export: true,
          is_owner: true,
        },
      }))
    }

    // 2) Shared-with-me maps (accepted/active/non-expired only)
    const { data: collabRecords } = await supabase
      .from('site_map_collaborators')
      .select('site_map_id, can_edit, can_export, can_manage_zones, can_manage_tents, can_invite_users')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .not('accepted_at', 'is', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)

    const sharedIds = (collabRecords ?? []).map(c => c.site_map_id).filter(
      (id: string) => !ownedMaps.some(m => m.id === id),
    )

    let sharedMaps: any[] = []
    if (sharedIds.length > 0) {
      const permMap = Object.fromEntries((collabRecords ?? []).map(c => [c.site_map_id, c]))
      let q = supabase
        .from('site_maps')
        .select('id, name, description, width, height, status, event_id, tour_id, created_at, updated_at')
        .in('id', sharedIds)
      if (eventId) q = q.eq('event_id', eventId)
      const { data: maps } = await q.order('updated_at', { ascending: false })
      sharedMaps = (maps ?? []).map(m => ({ ...m, permissions: permMap[m.id] || {} }))
    }

    // Merge + dedupe by id.
    const merged = new Map<string, any>()
    for (const row of [...ownedMaps, ...sharedMaps]) merged.set(row.id, row)

    // Optional venue filter post-merge (shared rows may carry a different venue).
    const rows = Array.from(merged.values()).filter(row => {
      if (!venueId && !eventId) return true
      return !row.venue_profile_id || row.venue_profile_id === venueId || row.event_id === eventId
    })

    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error('[Shared Site Maps] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch shared site maps' }, { status: 500 })
  }
}
