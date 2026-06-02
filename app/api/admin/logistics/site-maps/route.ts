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

    if (eventId) query = query.eq('event_id', eventId)
    if (tourId) query = query.eq('tour_id', tourId)
    if (status) query = query.eq('status', status)

    // Include maps the user owns OR is a collaborator on
    const { data: collaboratorMapIds } = await supabase
      .from('site_map_collaborators')
      .select('site_map_id')
      .eq('user_id', user.id)
      .eq('is_active', true)

    const collabIds = (collaboratorMapIds || []).map(c => c.site_map_id)
    if (collabIds.length > 0) {
      query = query.or(`created_by.eq.${user.id},id.in.(${collabIds.join(',')})`)
    } else {
      query = query.eq('created_by', user.id)
    }

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
    
    let uploadedBackgroundImageUrl: string | undefined

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      const backgroundImage = formData.get('backgroundImage')
      console.log('[Site Maps API] FormData received:', {
        name: formData.get('name'),
        description: formData.get('description'),
        environment: formData.get('environment'),
        width: formData.get('width'),
        height: formData.get('height'),
        eventId: formData.get('eventId'),
        tourId: formData.get('tourId'),
        hasBackgroundImage: backgroundImage instanceof File
      })

      if (backgroundImage instanceof File && backgroundImage.size > 0) {
        const fileExtension = backgroundImage.name.split('.').pop() || 'png'
        const storagePath = `site-maps/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`
        const imageBuffer = Buffer.from(await backgroundImage.arrayBuffer())

        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(storagePath, imageBuffer, {
            upsert: false,
            contentType: backgroundImage.type || 'image/png',
            cacheControl: '3600',
          })

        if (uploadError) {
          console.error('[Site Maps API] Background upload failed:', uploadError)
          return NextResponse.json({ error: 'Failed to upload background image' }, { status: 500 })
        }

        const { data: publicUrlData } = supabase.storage
          .from('event-media')
          .getPublicUrl(storagePath)

        uploadedBackgroundImageUrl = publicUrlData.publicUrl
      }

      body = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || formData.get('environment') as string || '',
        width: parseInt(formData.get('width') as string) || 1000,
        height: parseInt(formData.get('height') as string) || 1000,
        scale: parseFloat(formData.get('scale') as string) || 1.0,
        scaleUnit: formData.get('scaleUnit') as string || 'meters',
        templateId: formData.get('templateId') as string || undefined,
        backgroundColor: formData.get('backgroundColor') as string || '#f8f9fa',
        gridEnabled: formData.get('gridEnabled') === 'true',
        gridSize: parseInt(formData.get('gridSize') as string) || 20,
        isPublic: formData.get('isPublic') === 'true',
        backgroundImageUrl: uploadedBackgroundImageUrl,
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

    if (body.eventId) {
      try {
        const hasPermission = await hasEntityPermission({
          userId: user.id,
          entityType: 'Event',
          entityId: body.eventId,
          permission: 'EDIT_EVENT_LOGISTICS'
        })
        if (!hasPermission) {
          return NextResponse.json({ error: 'Insufficient permissions for event' }, { status: 403 })
        }
      } catch (error) {
        console.error('[Site Maps API] Permission check error:', error)
        return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
      }
    }

    if (body.tourId) {
      try {
        const hasPermission = await hasEntityPermission({
          userId: user.id,
          entityType: 'Tour',
          entityId: body.tourId,
          permission: 'EDIT_TOUR_LOGISTICS'
        })
        if (!hasPermission) {
          return NextResponse.json({ error: 'Insufficient permissions for tour' }, { status: 403 })
        }
      } catch (error) {
        console.error('[Site Maps API] Permission check error:', error)
        return NextResponse.json({ error: 'Permission check failed' }, { status: 500 })
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
      scale_unit: (body as any).scaleUnit || 'meters',
      background_color: body.backgroundColor || '#f8f9fa',
      background_image_url: body.backgroundImageUrl || null,
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

    // Seed elements from selected template (if provided)
    if ((body as any).templateId && (body as any).templateId !== 'blank') {
      try {
        const { data: template } = await supabase
          .from('map_templates')
          .select('template_data')
          .eq('id', (body as any).templateId)
          .maybeSingle()

        const templateElements = template?.template_data?.elements
        if (Array.isArray(templateElements) && templateElements.length > 0) {
          const elementRows = templateElements.map((element: any) => ({
            site_map_id: data.id,
            name: element.name || 'Template Element',
            element_type: element.element_type || 'custom',
            x: element.x || 0,
            y: element.y || 0,
            width: element.width || 120,
            height: element.height || 80,
            rotation: element.rotation || 0,
            color: element.color || '#9333ea',
            stroke_color: element.stroke_color || '#7e22ce',
            stroke_width: element.stroke_width || 2,
            opacity: element.opacity || 1,
            properties: element.properties || {},
          }))

          await supabase.from('site_map_elements').insert(elementRows)
        }
      } catch (templateError) {
        console.warn('[Site Maps API] Failed to seed template elements:', templateError)
      }
    }

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
