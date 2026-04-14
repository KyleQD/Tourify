import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error } = await supabase
      .from('site_map_activity_log')
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('site_map_id', siteMapId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Activity API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { action, entityType, entityId, oldValues, newValues } = body

    const { data, error } = await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        old_values: oldValues || null,
        new_values: newValues || null
      })
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('[Activity API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to log activity' }, { status: 500 })
  }
}
