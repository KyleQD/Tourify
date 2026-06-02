import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { data: map } = await supabase
      .from('site_maps')
      .select('id, created_by')
      .eq('id', siteMapId)
      .single()

    if (!map) return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
    if (map.created_by !== user.id) return NextResponse.json({ error: 'Only owner can create public link' }, { status: 403 })

    const token = crypto.randomUUID().replaceAll('-', '')
    const { data, error } = await supabase
      .from('site_map_share_tokens')
      .insert({
        site_map_id: siteMapId,
        token,
        created_by: user.id,
      })
      .select('token')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: { token: data.token } })
  } catch {
    return NextResponse.json({ error: 'Failed to create public link' }, { status: 500 })
  }
}
