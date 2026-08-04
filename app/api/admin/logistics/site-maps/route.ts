import { NextRequest, NextResponse } from 'next/server'
import { assertGroundSizeWithinLimit } from '@/lib/site-map/ground-size'
import {
  authorizedOrgScopeErrorResponse,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import { withAdminCapability } from '@/lib/auth/api-auth'
import type { CreateSiteMapRequest } from '@/types/site-map'

export const GET = withAdminCapability('logistics.view', async (request: NextRequest, { user, admin, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const tourId = searchParams.get('tourId')
    const status = searchParams.get('status')
    const requestedOrgId = admin.orgId
    const includeData = searchParams.get('includeData') === 'true'

    // MAP-101: resolve acting org scope (capability inheritance via RLS + optional org filter)
    // RLS on site_maps already scopes results to created_by / collaborators — scopeOrgId is
    // only used for the response metadata, so a resolution failure is non-fatal.
    let scopeOrgId: string | null = requestedOrgId ?? null
    try {
      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId,
        eventId,
        tourId,
      })
      scopeOrgId = scope.orgId
    } catch (scopeError) {
      const scopeResponse = authorizedOrgScopeErrorResponse(scopeError)
      if (scopeResponse) return scopeResponse
      const message = scopeError instanceof Error ? scopeError.message : 'Organization scope denied'
      if (/not available/i.test(message))
        return NextResponse.json({ error: message }, { status: 403 })
      // Non-fatal: log the scope error but continue — RLS on site_maps handles access control.
      console.warn('[Site Maps API] Scope resolution failed (non-fatal, RLS still applies):', message)
    }

    const listSelect = '*'
    const detailSelect = `
      *,
      zones:site_map_zones(*),
      tents:glamping_tents(*),
      elements:site_map_elements(*),
      collaborators:site_map_collaborators(
        *,
        user:profiles!site_map_collaborators_user_id_fkey(id, username, full_name, avatar_url, email)
      )
    `

    // Discovery relies on MAP-101 RLS (owner | collaborator | can_logistics).
    // Do not restrict to created_by — that blocked tour/event capability users.
    let query = supabase
      .from('site_maps')
      .select(includeData ? detailSelect : listSelect)
      .order('updated_at', { ascending: false })

    if (eventId) query = query.eq('event_id', eventId)
    if (tourId) query = query.eq('tour_id', tourId)
    if (status) query = query.eq('status', status)
    // org_id column does not exist on site_maps — RLS (created_by / collaborator) handles scoping

    const { data, error } = await query

    if (error) {
      console.error('[Site Maps API] Database query error:', error)
      return NextResponse.json({
        error: 'Failed to fetch site maps',
        details: error.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      orgId: scopeOrgId,
      discovery: 'org_capability_owner_collaborator',
    })
  } catch (error) {
    console.error('[Site Maps API] GET Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch site maps',
    }, { status: 500 })
  }
})

export const POST = withAdminCapability('logistics.manage', async (request: NextRequest, { user, supabase }) => {
  try {
    // Handle both FormData and JSON requests
    let body: CreateSiteMapRequest
    const contentType = request.headers.get('content-type')
    
    let uploadedBackgroundImageUrl: string | undefined

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      const backgroundImage = formData.get('backgroundImage')

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
        scaleUnit: (formData.get('scaleUnit') as 'feet' | 'meters' | null) || 'meters',
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

    const groundCheck = assertGroundSizeWithinLimit({
      width: body.width || 1000,
      height: body.height || 1000,
      scale: body.scale || 1,
      scaleUnit: (body as { scaleUnit?: string }).scaleUnit || 'meters',
    })
    if (!groundCheck.ok) {
      return NextResponse.json({ error: groundCheck.error }, { status: 400 })
    }

    // withAdminCapability('logistics.manage') already verified org membership + capability.
    // Fine-grained entity RBAC (rbac_user_entity_roles) is not populated for org-level owners
    // and would incorrectly deny them. Org capability is sufficient authorization here.

    const basePayload = {
      event_id: body.eventId || null,
      tour_id: body.tourId || null,
      name: body.name,
      description: body.description || null,
      width: body.width || 1000,
      height: body.height || 1000,
      scale: body.scale || 1.0,
      background_color: body.backgroundColor || '#f8f9fa',
      background_image_url: body.backgroundImageUrl || null,
      grid_enabled: body.gridEnabled ?? true,
      grid_size: body.gridSize || 20,
      is_public: body.isPublic ?? false,
      created_by: user.id,
    }

    const payloadWithScaleUnit = {
      ...basePayload,
      scale_unit: (body as any).scaleUnit || 'meters',
    }

    // Minimal select on create — avoid nested joins that can trip child-table RLS
    const selectCreated = '*'

    // Prefer scale_unit when the column exists; retry without it if schema is behind
    let { data, error } = await supabase
      .from('site_maps')
      .insert(payloadWithScaleUnit)
      .select(selectCreated)
      .single()

    if (error && /scale_unit/i.test(error.message || '')) {
      console.warn('[Site Maps API] scale_unit missing — retrying insert without it')
      const retry = await supabase
        .from('site_maps')
        .insert(basePayload)
        .select(selectCreated)
        .single()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[Site Maps API] Database insertion error:', error)
      console.error('[Site Maps API] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create site map',
        details: error.message 
      }, { status: 500 })
    }

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
      error: 'Failed to create site map',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
})
