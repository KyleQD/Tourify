import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'
import type { CreateZoneRequest, UpdateZoneRequest } from '@/types/site-map'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId } = await params
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
      .eq('site_map_id', siteMapId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Site Map Zones API] GET Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch zones' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId } = await params
    const body: CreateZoneRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.zoneType) {
      return NextResponse.json({ error: 'Name and zone type are required' }, { status: 400 })
    }

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    const payload = {
      site_map_id: siteMapId,
      name: body.name,
      zone_type: body.zoneType,
      x: body.x,
      y: body.y,
      width: body.width,
      height: body.height,
      rotation: body.rotation || 0,
      color: body.color || '#3b82f6',
      border_color: body.borderColor || '#1e40af',
      border_width: body.borderWidth || 2,
      opacity: body.opacity || 1.0,
      capacity: body.capacity || null,
      power_available: body.powerAvailable || false,
      water_available: body.waterAvailable || false,
      internet_available: body.internetAvailable || false,
      description: body.description || null,
      notes: body.notes || null,
      tags: body.tags || [],
      lead_user_id: (body as any).leadUserId || (body as any).lead_user_id || null,
      assigned_department: (body as any).assignedDepartment || (body as any).assigned_department || null,
    }

    const { data, error } = await supabase
      .from('site_map_zones')
      .insert(payload)
      .select(`
        *,
        tents:glamping_tents(*)
      `)
      .single()

    if (error) throw error

    // Bridge to canonical event_zones when map is event-scoped
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
        await linkLegacyZone(supabase, 'site_map_zones', data.id, eventZone.id)
        data.event_zone_id = eventZone.id
      }
    } catch (bridgeError) {
      console.warn('[Site Map Zones API] event_zones bridge failed:', bridgeError)
    }

    // Log activity
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'zone',
        entity_id: data.id,
        new_values: { name: data.name, zone_type: data.zone_type }
      })

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Zone created successfully'
    })
  } catch (error) {
    console.error('[Site Map Zones API] POST Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create zone' 
    }, { status: 500 })
  }
}
