import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns site maps shared with the current user (via site_map_collaborators).
 * Used by venue and artist dashboards.
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

    // Find collaborator records for this user
    const { data: collabRecords, error: collabError } = await supabase
      .from('site_map_collaborators')
      .select('site_map_id, can_edit, can_export')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (collabError || !collabRecords?.length) {
      return NextResponse.json({ success: true, data: [] })
    }

    const mapIds = collabRecords.map(c => c.site_map_id)
    const permMap = Object.fromEntries(collabRecords.map(c => [c.site_map_id, c]))

    let query = supabase
      .from('site_maps')
      .select('id, name, description, width, height, status, event_id, tour_id, created_at, updated_at')
      .in('id', mapIds)
      .order('updated_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)

    const { data: maps, error: mapError } = await query

    if (mapError) {
      return NextResponse.json({ error: 'Failed to fetch site maps', details: mapError.message }, { status: 500 })
    }

    const enriched = (maps || []).map(m => ({
      ...m,
      permissions: permMap[m.id] || {}
    }))

    return NextResponse.json({ success: true, data: enriched })
  } catch (error) {
    console.error('[Shared Site Maps] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch shared site maps' }, { status: 500 })
  }
}
