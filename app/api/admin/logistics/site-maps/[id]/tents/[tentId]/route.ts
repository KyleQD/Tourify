import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'
import type { UpdateTentRequest } from '@/types/site-map'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; tentId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId, tentId } = await params
    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    const { data, error } = await supabase
      .from('glamping_tents')
      .select('*')
      .eq('id', tentId)
      .eq('site_map_id', siteMapId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tent not found' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      data
    })
  } catch (error) {
    console.error('[Site Map Tent API] GET Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch tent' 
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; tentId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId, tentId } = await params
    const body: UpdateTentRequest = await request.json()

    // Check if user can edit this site map
    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    // Get existing tent for logging
    const { data: existingTent } = await supabase
      .from('glamping_tents')
      .select('*')
      .eq('id', tentId)
      .single()

    if (!existingTent) {
      return NextResponse.json({ error: 'Tent not found' }, { status: 404 })
    }

    // Check if tent number already exists (if changing)
    if (body.tentNumber && body.tentNumber !== existingTent.tent_number) {
      const { data: conflictingTent } = await supabase
        .from('glamping_tents')
        .select('id')
        .eq('site_map_id', siteMapId)
        .eq('tent_number', body.tentNumber)
        .neq('id', tentId)
        .single()

      if (conflictingTent) {
        return NextResponse.json({ error: 'Tent number already exists in this site map' }, { status: 400 })
      }
    }

    // Validate zone exists if changing
    if (body.zoneId !== undefined && body.zoneId !== existingTent.zone_id) {
      if (body.zoneId) {
        const { data: zone } = await supabase
          .from('site_map_zones')
          .select('id')
          .eq('id', body.zoneId)
          .eq('site_map_id', siteMapId)
          .single()

        if (!zone) {
          return NextResponse.json({ error: 'Invalid zone ID' }, { status: 400 })
        }
      }
    }

    // Build update payload
    const updatePayload: any = {}
    if (body.tentNumber !== undefined) updatePayload.tent_number = body.tentNumber
    if (body.tentType !== undefined) updatePayload.tent_type = body.tentType
    if (body.capacity !== undefined) updatePayload.capacity = body.capacity
    if (body.sizeCategory !== undefined) updatePayload.size_category = body.sizeCategory
    if (body.x !== undefined) updatePayload.x = body.x
    if (body.y !== undefined) updatePayload.y = body.y
    if (body.width !== undefined) updatePayload.width = body.width
    if (body.height !== undefined) updatePayload.height = body.height
    if (body.rotation !== undefined) updatePayload.rotation = body.rotation
    if (body.status !== undefined) updatePayload.status = body.status
    if (body.guestName !== undefined) updatePayload.guest_name = body.guestName
    if (body.guestPhone !== undefined) updatePayload.guest_phone = body.guestPhone
    if (body.guestEmail !== undefined) updatePayload.guest_email = body.guestEmail
    if (body.checkInDate !== undefined) updatePayload.check_in_date = body.checkInDate
    if (body.checkOutDate !== undefined) updatePayload.check_out_date = body.checkOutDate
    if (body.hasPower !== undefined) updatePayload.has_power = body.hasPower
    if (body.hasHeating !== undefined) updatePayload.has_heating = body.hasHeating
    if (body.hasCooling !== undefined) updatePayload.has_cooling = body.hasCooling
    if (body.hasPrivateBathroom !== undefined) updatePayload.has_private_bathroom = body.hasPrivateBathroom
    if (body.hasWifi !== undefined) updatePayload.has_wifi = body.hasWifi
    if (body.basePrice !== undefined) updatePayload.base_price = body.basePrice
    if (body.currentPrice !== undefined) updatePayload.current_price = body.currentPrice
    if (body.maintenanceNotes !== undefined) updatePayload.maintenance_notes = body.maintenanceNotes
    if (body.specialRequirements !== undefined) updatePayload.special_requirements = body.specialRequirements

    // Handle zone assignment
    if (body.zoneId !== undefined) {
      updatePayload.zone_id = body.zoneId
    }

    const { data, error } = await supabase
      .from('glamping_tents')
      .update(updatePayload)
      .eq('id', tentId)
      .eq('site_map_id', siteMapId)
      .select('*')
      .single()

    if (error) throw error

    // Log activity
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'UPDATE',
        entity_type: 'tent',
        entity_id: tentId,
        old_values: existingTent,
        new_values: data
      })

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Tent updated successfully'
    })
  } catch (error) {
    console.error('[Site Map Tent API] PUT Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update tent' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; tentId: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId, tentId } = await params

    // Check if user can edit this site map
    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    // Get existing tent for logging
    const { data: existingTent } = await supabase
      .from('glamping_tents')
      .select('*')
      .eq('id', tentId)
      .single()

    if (!existingTent) {
      return NextResponse.json({ error: 'Tent not found' }, { status: 404 })
    }

    // Log activity before deletion
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'DELETE',
        entity_type: 'tent',
        entity_id: tentId,
        old_values: existingTent
      })

    // Delete the tent
    const { error } = await supabase
      .from('glamping_tents')
      .delete()
      .eq('id', tentId)
      .eq('site_map_id', siteMapId)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Tent deleted successfully'
    })
  } catch (error) {
    console.error('[Site Map Tent API] DELETE Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete tent' 
    }, { status: 500 })
  }
}
