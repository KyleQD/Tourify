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

    // Use activity_log as notes store (entity_type = 'note')
    const { data, error } = await supabase
      .from('site_map_activity_log')
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        old_values, new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .eq('site_map_id', siteMapId)
      .in('entity_type', ['note', 'issue', 'status_change'])
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[Notes API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 })
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
    const { content, x, y, elementId, noteType = 'general' } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'NOTE',
        entity_type: 'note',
        entity_id: elementId || null,
        new_values: {
          content,
          x: x ?? 0,
          y: y ?? 0,
          note_type: noteType,
          is_resolved: false
        }
      })
      .select(`
        id, site_map_id, user_id, action, entity_type, entity_id,
        new_values, created_at,
        user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('[Notes API] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 })
  }
}
