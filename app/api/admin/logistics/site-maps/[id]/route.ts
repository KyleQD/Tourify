import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'
import type { UpdateSiteMapRequest } from '@/types/site-map'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const access = requireSiteMapAccess(await getSiteMapAccess(supabase as any, id, user.id), 'read')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await supabase
      .from('site_maps')
      .select(`
        *,
        zones:site_map_zones(*),
        tents:glamping_tents(*),
        elements:site_map_elements(*),
        collaborators:site_map_collaborators(
          *,
          user:profiles(id, username, full_name, avatar_url, email)
        ),
        activity_log:site_map_activity_log(
          *,
          user:profiles(id, username, full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      data
    })
  } catch (error) {
    console.error('[Site Map API] GET Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch site map' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const body: UpdateSiteMapRequest = await request.json()
    const access = requireSiteMapAccess(await getSiteMapAccess(supabase as any, id, user.id), 'edit')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Check if user can edit this site map
    const { data: existingMap } = await supabase
      .from('site_maps')
      .select('created_by')
      .eq('id', id)
      .single()

    if (!existingMap) {
      return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
    }

    // Check permissions
    const isOwner = existingMap.created_by === user.id
    const canEdit = await supabase.rpc('can_edit_site_map', { 
      site_map_uuid: id, 
      user_uuid: user.id 
    })

    if (!isOwner && !canEdit.data) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Build update payload
    const updatePayload: any = {}
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.width !== undefined) updatePayload.width = body.width
    if (body.height !== undefined) updatePayload.height = body.height
    if (body.scale !== undefined) updatePayload.scale = body.scale
    if (body.backgroundImageUrl !== undefined) updatePayload.background_image_url = body.backgroundImageUrl
    if (body.backgroundColor !== undefined) updatePayload.background_color = body.backgroundColor
    if (body.gridEnabled !== undefined) updatePayload.grid_enabled = body.gridEnabled
    if (body.gridSize !== undefined) updatePayload.grid_size = body.gridSize
    if (body.isPublic !== undefined) updatePayload.is_public = body.isPublic
    if (body.status !== undefined) updatePayload.status = body.status

    // Get current version and increment it
    const { data: currentSiteMap } = await supabase
      .from('site_maps')
      .select('version')
      .eq('id', id)
      .single()

    if (currentSiteMap) {
      updatePayload.version = currentSiteMap.version + 1
    }

    const { data, error } = await supabase
      .from('site_maps')
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        zones:site_map_zones(*),
        tents:glamping_tents(*),
        elements:site_map_elements(*),
        collaborators:site_map_collaborators(
          *,
          user:profiles(id, username, full_name, avatar_url, email)
        )
      `)
      .single()

    if (error) throw error

    // Log activity
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: id,
        user_id: user.id,
        action: 'UPDATE',
        entity_type: 'site_map',
        entity_id: id,
        old_values: existingMap,
        new_values: data
      })

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Site map updated successfully'
    })
  } catch (error) {
    console.error('[Site Map API] PUT Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update site map' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id } = await params
    const access = requireSiteMapAccess(await getSiteMapAccess(supabase as any, id, user.id), 'manage')
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    // Check if user owns this site map
    const { data: existingMap } = await supabase
      .from('site_maps')
      .select('created_by, name')
      .eq('id', id)
      .single()

    if (!existingMap) {
      return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
    }

    if (existingMap.created_by !== user.id) {
      return NextResponse.json({ error: 'Only the owner can delete this site map' }, { status: 403 })
    }

    // Log activity before deletion
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: id,
        user_id: user.id,
        action: 'DELETE',
        entity_type: 'site_map',
        entity_id: id,
        old_values: existingMap
      })

    // Delete the site map (cascade will handle related records)
    const { error } = await supabase
      .from('site_maps')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Site map deleted successfully'
    })
  } catch (error) {
    console.error('[Site Map API] DELETE Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete site map' 
    }, { status: 500 })
  }
}
