import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'
import type { UpdateZoneRequest } from '@/types/site-map'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; zoneId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId, zoneId } = await params
    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    const { data, error } = await supabase
      .from('site_map_zones')
      .select(`
        *,
        tents:glamping_tents(*)
      `)
      .eq('id', zoneId)
      .eq('site_map_id', siteMapId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      data
    })
  } catch (error) {
    console.error('[Site Map Zone API] GET Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch zone' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; zoneId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId, zoneId } = await params
    const body: UpdateZoneRequest = await request.json()

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    // Get existing zone for logging
    const { data: existingZone } = await supabase
      .from('site_map_zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    if (!existingZone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    // Build update payload
    const updatePayload: any = {}
    if (body.name !== undefined) updatePayload.name = body.name
    if (body.zoneType !== undefined) updatePayload.zone_type = body.zoneType
    if (body.x !== undefined) updatePayload.x = body.x
    if (body.y !== undefined) updatePayload.y = body.y
    if (body.width !== undefined) updatePayload.width = body.width
    if (body.height !== undefined) updatePayload.height = body.height
    if (body.rotation !== undefined) updatePayload.rotation = body.rotation
    if (body.color !== undefined) updatePayload.color = body.color
    if (body.borderColor !== undefined) updatePayload.border_color = body.borderColor
    if (body.borderWidth !== undefined) updatePayload.border_width = body.borderWidth
    if (body.opacity !== undefined) updatePayload.opacity = body.opacity
    if (body.capacity !== undefined) updatePayload.capacity = body.capacity
    if (body.currentOccupancy !== undefined) updatePayload.current_occupancy = body.currentOccupancy
    if (body.powerAvailable !== undefined) updatePayload.power_available = body.powerAvailable
    if (body.waterAvailable !== undefined) updatePayload.water_available = body.waterAvailable
    if (body.internetAvailable !== undefined) updatePayload.internet_available = body.internetAvailable
    if (body.description !== undefined) updatePayload.description = body.description
    if (body.notes !== undefined) updatePayload.notes = body.notes
    if (body.tags !== undefined) updatePayload.tags = body.tags
    if (body.status !== undefined) updatePayload.status = body.status
    if ((body as any).leadUserId !== undefined || (body as any).lead_user_id !== undefined)
      updatePayload.lead_user_id = (body as any).leadUserId ?? (body as any).lead_user_id
    if ((body as any).assignedDepartment !== undefined || (body as any).assigned_department !== undefined)
      updatePayload.assigned_department = (body as any).assignedDepartment ?? (body as any).assigned_department

    const { data, error } = await supabase
      .from('site_map_zones')
      .update(updatePayload)
      .eq('id', zoneId)
      .eq('site_map_id', siteMapId)
      .select(`
        *,
        tents:glamping_tents(*)
      `)
      .single()

    if (error) throw error

    // Keep event_zones bridge + supervisor in sync when ownership/name changes
    try {
      const { data: siteMap } = await supabase
        .from('site_maps')
        .select('event_id')
        .eq('id', siteMapId)
        .maybeSingle()

      if (siteMap?.event_id) {
        const { resolveOrCreateEventZone, linkLegacyZone } = await import('@/lib/zones/event-zones')
        const eventZone = await resolveOrCreateEventZone(supabase, {
          eventId: siteMap.event_id,
          name: data.name,
          zoneType: data.zone_type,
          capacity: data.capacity,
          supervisorId: data.lead_user_id || null,
          category: 'physical',
        })
        if (data.event_zone_id !== eventZone.id)
          await linkLegacyZone(supabase, 'site_map_zones', data.id, eventZone.id)

        if (data.lead_user_id || data.event_zone_id) {
          await supabase
            .from('event_zones')
            .update({ supervisor_id: data.lead_user_id || null })
            .eq('id', data.event_zone_id || eventZone.id)
        }
        data.event_zone_id = data.event_zone_id || eventZone.id
      }
    } catch (bridgeError) {
      console.warn('[Site Map Zone API] event_zones bridge failed:', bridgeError)
    }

    if (data.event_zone_id || data.lead_user_id) {
          try {
            const { syncZoneOwnershipToRoster } = await import('@/lib/site-map/zone-roster-sync')
            const { data: siteMapRow } = await supabase
              .from('site_maps')
              .select('event_id')
              .eq('id', siteMapId)
              .maybeSingle()
            if (siteMapRow?.event_id) {
              await syncZoneOwnershipToRoster({
                supabase,
                siteMapZoneId: data.id,
                eventId: siteMapRow.event_id,
                leadUserId: data.lead_user_id,
                assignedDepartment: data.assigned_department,
                actorUserId: user.id,
              })
            }
          } catch (syncError) {
            console.warn('[Site Map Zone API] roster sync failed:', syncError)
          }
        }

    // Log activity
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'UPDATE',
        entity_type: 'zone',
        entity_id: zoneId,
        old_values: existingZone,
        new_values: data
      })

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Zone updated successfully'
    })
  } catch (error) {
    console.error('[Site Map Zone API] PUT Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update zone' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; zoneId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId, zoneId } = await params

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    // Get existing zone for logging
    const { data: existingZone } = await supabase
      .from('site_map_zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    if (!existingZone) {
      return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
    }

    // Log activity before deletion
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'DELETE',
        entity_type: 'zone',
        entity_id: zoneId,
        old_values: existingZone
      })

    // Delete the zone (cascade will handle related tents)
    const { error } = await supabase
      .from('site_map_zones')
      .delete()
      .eq('id', zoneId)
      .eq('site_map_id', siteMapId)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Zone deleted successfully'
    })
  } catch (error) {
    console.error('[Site Map Zone API] DELETE Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete zone' 
    }, { status: 500 })
  }
}
