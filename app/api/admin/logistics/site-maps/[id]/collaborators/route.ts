import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    const { data, error } = await supabase
      .from('site_map_collaborators')
      .select(`
        *,
        user:profiles!site_map_collaborators_user_id_fkey(id, username, full_name, avatar_url, email)
      `)
      .eq('site_map_id', siteMapId)
      .eq('is_active', true)
      .order('invited_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch collaborators', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    console.error('[Collaborators API] GET Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch collaborators' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const collaboratorUserId = searchParams.get('userId')

    if (!collaboratorUserId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: siteMap } = await supabase
      .from('site_maps')
      .select('created_by')
      .eq('id', siteMapId)
      .single()

    if (!siteMap || siteMap.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the map owner can remove collaborators' }, { status: 403 })
    }

    const { error } = await supabase
      .from('site_map_collaborators')
      .update({ is_active: false })
      .eq('site_map_id', siteMapId)
      .eq('user_id', collaboratorUserId)

    if (error) {
      return NextResponse.json({ error: 'Failed to remove collaborator', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Collaborators API] DELETE Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to remove collaborator' }, { status: 500 })
  }
}
