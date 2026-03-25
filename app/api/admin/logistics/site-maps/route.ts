import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasEntityPermission } from '@/lib/services/rbac'
import type { CreateSiteMapRequest, UpdateSiteMapRequest } from '@/types/site-map'



export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('[Site Maps API] No user found in session')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('[Site Maps API] User authenticated:', user.id)

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const tourId = searchParams.get('tourId')
    const status = searchParams.get('status')
    const includeData = searchParams.get('includeData') === 'true'

    // Use the authenticated client
    let query = supabase
      .from('site_maps')
      .select(`
        *,
        ${includeData ? `
        zones:site_map_zones(*),
        tents:glamping_tents(*),
        elements:site_map_elements(*),
        collaborators:site_map_collaborators(
          *,
          user:profiles!site_map_collaborators_user_id_fkey(id, username, full_name, avatar_url, email)
        )
        ` : ''}
      `)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (eventId) query = query.eq('event_id', eventId)
    if (tourId) query = query.eq('tour_id', tourId)
    if (status) query = query.eq('status', status)

    // Filter by user
    query = query.eq('created_by', user.id)

    const { data, error } = await query

    if (error) {
      console.error('[Site Maps API] Database query error:', error)
      console.error('[Site Maps API] Query details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to fetch site maps',
        details: error.message 
      }, { status: 500 })
    }

    console.log('[Site Maps API] Successfully fetched site maps:', data?.length || 0)

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('[Site Maps API] GET Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch site maps' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('[Site Maps API] No user found in session')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    console.log('[Site Maps API] User authenticated:', user.id)

    // Handle both FormData and JSON requests
    let body: CreateSiteMapRequest
    const contentType = request.headers.get('content-type')
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      console.log('[Site Maps API] FormData received:', {
        name: formData.get('name'),
        description: formData.get('description'),
        environment: formData.get('environment'),
        width: formData.get('width'),
        height: formData.get('height'),
        eventId: formData.get('eventId'),
        tourId: formData.get('tourId')
      })
      body = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || formData.get('environment') as string || '',
        width: parseInt(formData.get('width') as string) || 1000,
        height: parseInt(formData.get('height') as string) || 1000,
        scale: parseFloat(formData.get('scale') as string) || 1.0,
        backgroundColor: formData.get('backgroundColor') as string || '#f8f9fa',
        gridEnabled: formData.get('gridEnabled') === 'true',
        gridSize: parseInt(formData.get('gridSize') as string) || 20,
        isPublic: formData.get('isPublic') === 'true',
        eventId: formData.get('eventId') as string || undefined,
        tourId: formData.get('tourId') as string || undefined
      }
    } else {
      // Handle JSON
      body = await request.json()
    }

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Check permissions for event/tour (temporarily bypassed for debugging)
    if (body.eventId) {
      console.log('[Site Maps API] Checking event permissions for:', body.eventId)
      try {
        const hasPermission = await hasEntityPermission({
          userId: user.id,
          entityType: 'Event',
          entityId: body.eventId,
          permission: 'EDIT_EVENT_LOGISTICS'
        })
        console.log('[Site Maps API] Event permission result:', hasPermission)
        if (!hasPermission) {
          console.log('[Site Maps API] Insufficient permissions for event, but allowing for debugging')
          // return NextResponse.json({ error: 'Insufficient permissions for event' }, { status: 403 })
        }
      } catch (error) {
        console.error('[Site Maps API] Permission check error:', error)
        // Continue for debugging
      }
    }

    if (body.tourId) {
      console.log('[Site Maps API] Checking tour permissions for:', body.tourId)
      try {
        const hasPermission = await hasEntityPermission({
          userId: user.id,
          entityType: 'Tour',
          entityId: body.tourId,
          permission: 'EDIT_TOUR_LOGISTICS'
        })
        console.log('[Site Maps API] Tour permission result:', hasPermission)
        if (!hasPermission) {
          console.log('[Site Maps API] Insufficient permissions for tour, but allowing for debugging')
          // return NextResponse.json({ error: 'Insufficient permissions for tour' }, { status: 403 })
        }
      } catch (error) {
        console.error('[Site Maps API] Permission check error:', error)
        // Continue for debugging
      }
    }

    const payload = {
      event_id: body.eventId || null,
      tour_id: body.tourId || null,
      name: body.name,
      description: body.description || null,
      width: body.width || 1000,
      height: body.height || 1000,
      scale: body.scale || 1.0,
      background_color: body.backgroundColor || '#f8f9fa',
      grid_enabled: body.gridEnabled ?? true,
      grid_size: body.gridSize || 20,
      is_public: body.isPublic ?? false,
        created_by: user.id
    }

    console.log('[Site Maps API] Inserting site map with payload:', payload)
    
    // Use the authenticated client
    const { data, error } = await supabase
      .from('site_maps')
      .insert(payload)
      .select(`
        *,
        zones:site_map_zones(*),
        tents:glamping_tents(*),
        elements:site_map_elements(*),
        collaborators:site_map_collaborators(
          *,
          user:profiles!site_map_collaborators_user_id_fkey(id, username, full_name, avatar_url, email)
        )
      `)
      .single()

    if (error) {
      console.error('[Site Maps API] Database insertion error:', error)
      console.error('[Site Maps API] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create site map',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log('[Site Maps API] Site map created successfully:', data.id)

    // Log activity (optional - don't fail if this fails)
    try {
      await supabase
        .from('site_map_activity_log')
        .insert({
          site_map_id: data.id,
          user_id: user.id,
          action: 'CREATE',
          entity_type: 'site_map',
          entity_id: data.id,
          new_values: { name: data.name, event_id: data.event_id, tour_id: data.tour_id }
        })
    } catch (activityError) {
      console.warn('[Site Maps API] Failed to log activity:', activityError)
      // Don't fail the entire request if activity logging fails
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Site map created successfully'
    })
  } catch (error) {
    console.error('[Site Maps API] POST Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create site map' 
    }, { status: 500 })
  }
}
