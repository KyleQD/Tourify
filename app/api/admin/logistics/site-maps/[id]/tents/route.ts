import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'
import type { CreateTentRequest, UpdateTentRequest } from '@/types/site-map'

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

    const { searchParams } = new URL(request.url)
    const zoneId = searchParams.get('zoneId')
    const status = searchParams.get('status')
    const tentType = searchParams.get('tentType')

    let query = supabase
      .from('glamping_tents')
      .select('*')
      .eq('site_map_id', siteMapId)
      .order('tent_number', { ascending: true })

    // Apply filters
    if (zoneId) query = query.eq('zone_id', zoneId)
    if (status) query = query.eq('status', status)
    if (tentType) query = query.eq('tent_type', tentType)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Site Map Tents API] GET Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch tents' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId } = await params
    const body: CreateTentRequest = await request.json()

    // Validate required fields
    if (!body.tentNumber || !body.tentType || !body.capacity) {
      return NextResponse.json({ error: 'Tent number, type, and capacity are required' }, { status: 400 })
    }

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    // Check if tent number already exists in this site map
    const { data: existingTent } = await supabase
      .from('glamping_tents')
      .select('id')
      .eq('site_map_id', siteMapId)
      .eq('tent_number', body.tentNumber)
      .single()

    if (existingTent) {
      return NextResponse.json({ error: 'Tent number already exists in this site map' }, { status: 400 })
    }

    // Validate zone exists if provided
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

    const payload = {
      site_map_id: siteMapId,
      zone_id: body.zoneId || null,
      tent_number: body.tentNumber,
      tent_type: body.tentType,
      capacity: body.capacity,
      size_category: body.sizeCategory || null,
      x: body.x || 0,
      y: body.y || 0,
      width: body.width || 100,
      height: body.height || 100,
      rotation: body.rotation || 0,
      has_power: body.hasPower || false,
      has_heating: body.hasHeating || false,
      has_cooling: body.hasCooling || false,
      has_private_bathroom: body.hasPrivateBathroom || false,
      has_wifi: body.hasWifi || false,
      base_price: body.basePrice || null,
      current_price: body.currentPrice || null,
      special_requirements: body.specialRequirements || null
    }

    const { data, error } = await supabase
      .from('glamping_tents')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error

    // Log activity
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'CREATE',
        entity_type: 'tent',
        entity_id: data.id,
        new_values: { tent_number: data.tent_number, tent_type: data.tent_type }
      })

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Tent created successfully'
    })
  } catch (error) {
    console.error('[Site Map Tents API] POST Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create tent' 
    }, { status: 500 })
  }
}
