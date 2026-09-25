import { NextRequest, NextResponse } from 'next/server'
import { assertGroundSizeWithinLimit } from '@/lib/site-map/ground-size'
import {
  authorizedOrgScopeErrorResponse,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  isMissingSiteMapEventV2Column,
  normalizeLegacySiteMapEventScope,
} from '@/lib/site-map/schema-compat'
import type { CreateSiteMapRequest } from '@/types/site-map'

const FORBIDDEN_SCOPE_FIELDS = [
  'event_id',
  'event_v2_id',
  'tour_id',
  'org_id',
  'created_by',
] as const

function formText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' ? value : undefined
}

function forbiddenScopeField(input: FormData | Record<string, unknown>): string | null {
  for (const field of FORBIDDEN_SCOPE_FIELDS) {
    if (input instanceof FormData ? input.has(field) : Object.prototype.hasOwnProperty.call(input, field)) {
      return field
    }
  }
  return null
}

function scopeDeniedResponse(error: unknown): NextResponse | null {
  const explicitContextResponse = authorizedOrgScopeErrorResponse(error)
  if (explicitContextResponse) return explicitContextResponse

  const message = error instanceof Error ? error.message : 'Organization scope denied'
  if (/^(Event|Tour) is not available/i.test(message)) {
    return NextResponse.json(
      { success: false, error: message, code: 'entity_scope_denied' },
      { status: 403 },
    )
  }
  return null
}

function isWithinAuthorizedScope(
  row: Record<string, unknown>,
  eventIds: ReadonlySet<string>,
  tourIds: ReadonlySet<string>,
): boolean {
  const eventId = typeof row.event_v2_id === 'string' ? row.event_v2_id : null
  const tourId = typeof row.tour_id === 'string' ? row.tour_id : null

  if (!eventId && !tourId) return false
  if (eventId && !eventIds.has(eventId)) return false
  if (tourId && !tourIds.has(tourId)) return false
  return true
}

async function resolveWritableSiteMapEventColumn(
  dataClient: any,
  eventId: string | null,
): Promise<'event_v2_id' | 'event_id'> {
  const canonicalProbe = await dataClient
    .from('site_maps')
    .select('event_v2_id')
    .limit(0)

  if (!canonicalProbe.error) return 'event_v2_id'
  if (!isMissingSiteMapEventV2Column(canonicalProbe.error)) throw canonicalProbe.error
  if (!eventId) return 'event_id'

  // A missing event_v2_id is compatible only when the deployed event_id FK
  // resolves to events_v2. Older legacy-event schemas must fail closed.
  const bridgeProbe = await dataClient
    .from('site_maps')
    .select('id, event_id, canonical_event:events_v2!site_maps_event_id_fkey(id)')
    .limit(0)
  if (bridgeProbe.error) {
    throw new Error('The deployed site-map event bridge is not canonical.')
  }
  return 'event_id'
}

export const GET = withAdminCapability('logistics.view', async (request: NextRequest, { user, admin }) => {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    const tourId = searchParams.get('tourId')
    const status = searchParams.get('status')
    const requestedOrgId = admin.orgId
    const includeData = searchParams.get('includeData') === 'true'

    let scope: Awaited<ReturnType<typeof resolveAuthorizedOrgLogisticsScope>>
    try {
      scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId,
        eventId,
        tourId,
      })
    } catch (scopeError) {
      const scopeResponse = scopeDeniedResponse(scopeError)
      if (scopeResponse) return scopeResponse
      throw scopeError
    }
    const dataClient = scope.service

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

    // RLS remains the database boundary. These filters additionally bind discovery
    // to the selected Admin organization so ownership/collaboration in another org
    // cannot leak a map into the current acting context.
    const runListQuery = async (eventColumn: 'event_v2_id' | 'event_id') => {
      const selectedFields = eventColumn === 'event_id'
        ? `${includeData ? detailSelect : listSelect}, canonical_event:events_v2!site_maps_event_id_fkey(id)`
        : includeData ? detailSelect : listSelect
      let query = dataClient
        .from('site_maps')
        .select(selectedFields)
        .order('updated_at', { ascending: false })

      if (eventId) query = query.eq(eventColumn, eventId)
      if (tourId) query = query.eq('tour_id', tourId)
      if (status) query = query.eq('status', status)

      if (!eventId && !tourId) {
        const scopeFilters: string[] = []
        if (scope.eventIds.length > 0)
          scopeFilters.push(`${eventColumn}.in.(${scope.eventIds.join(',')})`)
        if (scope.tourIds.length > 0)
          scopeFilters.push(`tour_id.in.(${scope.tourIds.join(',')})`)

        query = scopeFilters.length > 0
          ? query.or(scopeFilters.join(','))
          : query.eq('id', '00000000-0000-0000-0000-000000000000')
      }

      return query
    }

    let { data, error } = await runListQuery('event_v2_id')
    let usedLegacyEventColumn = false
    if (isMissingSiteMapEventV2Column(error)) {
      console.warn('[Site Maps API] event_v2_id missing — using canonical event_id compatibility')
      usedLegacyEventColumn = true
      const retry = await runListQuery('event_id')
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.error('[Site Maps API] Database query error:', error)
      return NextResponse.json({
        error: 'Failed to fetch site maps',
        details: error.message,
      }, { status: 500 })
    }

    const normalizedData = ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
      usedLegacyEventColumn ? normalizeLegacySiteMapEventScope(row) : row,
    )
    const authorizedEventIds = new Set(scope.eventIds)
    const authorizedTourIds = new Set(scope.tourIds)
    const scopedData = normalizedData.filter((row) =>
      isWithinAuthorizedScope(row, authorizedEventIds, authorizedTourIds),
    )

    const eventContextIds = Array.from(new Set(
      scopedData.map((row) => row.event_v2_id).filter((id): id is string => typeof id === 'string'),
    ))
    const tourContextIds = Array.from(new Set(
      scopedData.map((row) => row.tour_id).filter((id): id is string => typeof id === 'string'),
    ))
    const [eventContextResult, tourContextResult] = await Promise.all([
      eventContextIds.length > 0
        ? dataClient
            .from('events_v2')
            .select('id, title, start_at, venue_name, venue_city, venue_state')
            .eq('org_id', scope.orgId)
            .in('id', eventContextIds)
        : Promise.resolve({ data: [], error: null }),
      tourContextIds.length > 0
        ? dataClient
            .from('tours')
            .select('id, name, start_date, end_date')
            .eq('org_id', scope.orgId)
            .in('id', tourContextIds)
        : Promise.resolve({ data: [], error: null }),
    ])
    const eventContexts = new Map(
      (eventContextResult.data ?? []).map((row: Record<string, unknown>) => [String(row.id), row]),
    )
    const tourContexts = new Map(
      (tourContextResult.data ?? []).map((row: Record<string, unknown>) => [String(row.id), row]),
    )
    const enrichedData = scopedData.map((row) => ({
      ...row,
      event_context: typeof row.event_v2_id === 'string' ? eventContexts.get(row.event_v2_id) ?? null : null,
      tour_context: typeof row.tour_id === 'string' ? tourContexts.get(row.tour_id) ?? null : null,
    }))

    return NextResponse.json({
      success: true,
      data: enrichedData,
      count: enrichedData.length,
      orgId: scope.orgId,
      discovery: 'org_capability_owner_collaborator',
      contextWarnings: [
        eventContextResult.error ? `events: ${eventContextResult.error.message}` : null,
        tourContextResult.error ? `tours: ${tourContextResult.error.message}` : null,
      ].filter(Boolean),
    })
  } catch (error) {
    console.error('[Site Maps API] GET Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch site maps',
    }, { status: 500 })
  }
})

export const POST = withAdminCapability('logistics.manage', async (request: NextRequest, { user, admin }) => {
  try {
    // Handle both FormData and JSON requests
    let body: CreateSiteMapRequest
    const contentType = request.headers.get('content-type')
    let backgroundImage: File | null = null
    let uploadedBackgroundImageUrl: string | undefined

    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData
      const formData = await request.formData()
      const forbiddenField = forbiddenScopeField(formData)
      if (forbiddenField) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported scope field: ${forbiddenField}`,
            code: 'legacy_scope_field_rejected',
          },
          { status: 400 },
        )
      }

      if (formData.getAll('eventId').length > 1 || formData.getAll('tourId').length > 1) {
        return NextResponse.json(
          { success: false, error: 'Ambiguous site-map scope.', code: 'ambiguous_scope' },
          { status: 400 },
        )
      }

      const backgroundImageEntry = formData.get('backgroundImage')
      backgroundImage = backgroundImageEntry instanceof File ? backgroundImageEntry : null

      body = {
        name: formText(formData, 'name') || '',
        description: formText(formData, 'description') || formText(formData, 'environment') || '',
        width: parseInt(formText(formData, 'width') || '', 10) || 1000,
        height: parseInt(formText(formData, 'height') || '', 10) || 1000,
        scale: parseFloat(formText(formData, 'scale') || '') || 1.0,
        scaleUnit: (formText(formData, 'scaleUnit') as 'feet' | 'meters' | undefined) || 'meters',
        templateId: formText(formData, 'templateId'),
        backgroundColor: formText(formData, 'backgroundColor') || '#f8f9fa',
        gridEnabled: formData.get('gridEnabled') === 'true',
        gridSize: parseInt(formText(formData, 'gridSize') || '', 10) || 20,
        isPublic: formData.get('isPublic') === 'true',
        eventId: formText(formData, 'eventId'),
        tourId: formText(formData, 'tourId'),
      }
    } else {
      // Handle JSON
      const input: unknown = await request.json()
      if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
      }

      const forbiddenField = forbiddenScopeField(input as Record<string, unknown>)
      if (forbiddenField) {
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported scope field: ${forbiddenField}`,
            code: 'legacy_scope_field_rejected',
          },
          { status: 400 },
        )
      }
      body = input as CreateSiteMapRequest
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

    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : ''
    const tourId = typeof body.tourId === 'string' ? body.tourId.trim() : ''
    if ((body.eventId !== undefined && !eventId) || (body.tourId !== undefined && !tourId)) {
      return NextResponse.json(
        { success: false, error: 'Event and tour IDs must be non-empty strings.', code: 'invalid_scope' },
        { status: 400 },
      )
    }
    if (!eventId && !tourId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Select an event or tour before creating an Admin site map.',
          code: 'site_map_scope_required',
        },
        { status: 400 },
      )
    }

    let scope: Awaited<ReturnType<typeof resolveAuthorizedOrgLogisticsScope>>
    try {
      scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId: admin.orgId,
        eventId: eventId || null,
        tourId: tourId || null,
      })
    } catch (scopeError) {
      const scopeResponse = scopeDeniedResponse(scopeError)
      if (scopeResponse) return scopeResponse
      throw scopeError
    }
    // The acting context and requested event/tour have now both been verified.
    // Use the scoped service client for the write so organization owners do not
    // depend on a duplicate org_members/has_perm row merely to satisfy RLS.
    const dataClient = scope.service

    let writeEventColumn: 'event_v2_id' | 'event_id'
    try {
      writeEventColumn = await resolveWritableSiteMapEventColumn(dataClient, eventId || null)
    } catch (schemaError) {
      console.error('[Site Maps API] Site-map schema compatibility check failed:', schemaError)
      return NextResponse.json({
        success: false,
        error: 'Site-map storage is not ready for canonical event scope.',
        code: 'site_map_schema_incompatible',
      }, { status: 503 })
    }

    // Scope validation intentionally happens before the upload so a forged event,
    // tour, or acting organization cannot leave an orphaned storage object behind.
    if (backgroundImage && backgroundImage.size > 0) {
      const fileExtension = backgroundImage.name.split('.').pop() || 'png'
      const storagePath = `site-maps/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`
      const imageBuffer = Buffer.from(await backgroundImage.arrayBuffer())

      const { error: uploadError } = await dataClient.storage
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

      const { data: publicUrlData } = dataClient.storage
        .from('event-media')
        .getPublicUrl(storagePath)

      uploadedBackgroundImageUrl = publicUrlData.publicUrl
    }

    const basePayload = {
      event_v2_id: eventId || null,
      tour_id: tourId || null,
      name: body.name,
      description: body.description || null,
      width: body.width || 1000,
      height: body.height || 1000,
      scale: body.scale || 1.0,
      background_color: body.backgroundColor || '#f8f9fa',
      background_image_url: uploadedBackgroundImageUrl || body.backgroundImageUrl || null,
      grid_enabled: body.gridEnabled ?? true,
      grid_size: body.gridSize || 20,
      is_public: body.isPublic ?? false,
      created_by: user.id,
    }

    const payloadWithScaleUnit = {
      ...basePayload,
      scale_unit: (body as any).scaleUnit || 'meters',
    }
    const { event_v2_id: canonicalEventId, ...basePayloadWithoutCanonicalEvent } = basePayload
    const legacyBasePayload = {
      ...basePayloadWithoutCanonicalEvent,
      event_id: canonicalEventId,
    }
    const legacyPayloadWithScaleUnit = {
      ...legacyBasePayload,
      scale_unit: (body as any).scaleUnit || 'meters',
    }

    // Minimal select on create — avoid nested joins that can trip child-table RLS
    const selectCreated = '*'

    const insertWithOptionalScaleUnit = async (
      withScaleUnit: Record<string, unknown>,
      withoutScaleUnit: Record<string, unknown>,
    ) => {
      let result = await dataClient
        .from('site_maps')
        .insert(withScaleUnit)
        .select(selectCreated)
        .single()

      if (result.error && /scale_unit/i.test(result.error.message || '')) {
        console.warn('[Site Maps API] scale_unit missing — retrying insert without it')
        result = await dataClient
          .from('site_maps')
          .insert(withoutScaleUnit)
          .select(selectCreated)
          .single()
      }
      return result
    }

    const usedLegacyEventColumn = writeEventColumn === 'event_id'
    if (usedLegacyEventColumn) {
      console.warn('[Site Maps API] event_v2_id missing — creating through canonical event_id compatibility')
    }
    const { data: insertedData, error } = usedLegacyEventColumn
      ? await insertWithOptionalScaleUnit(legacyPayloadWithScaleUnit, legacyBasePayload)
      : await insertWithOptionalScaleUnit(payloadWithScaleUnit, basePayload)
    let data = insertedData

    if (error) {
      console.error('[Site Maps API] Database insertion error:', error)
      console.error('[Site Maps API] Error details:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Failed to create site map',
        details: error.message 
      }, { status: 500 })
    }

    if (usedLegacyEventColumn && data) {
      data = normalizeLegacySiteMapEventScope(data as Record<string, unknown>)
    }

    // Seed elements from selected template (if provided)
    if ((body as any).templateId && (body as any).templateId !== 'blank') {
      try {
        const { data: template } = await dataClient
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

          await dataClient.from('site_map_elements').insert(elementRows)
        }
      } catch (templateError) {
        console.warn('[Site Maps API] Failed to seed template elements:', templateError)
      }
    }

    // Log activity (optional - don't fail if this fails)
    try {
      await dataClient
        .from('site_map_activity_log')
        .insert({
          site_map_id: data.id,
          user_id: user.id,
          action: 'CREATE',
          entity_type: 'site_map',
          entity_id: data.id,
          new_values: {
            name: data.name,
            event_v2_id: data.event_v2_id,
            tour_id: data.tour_id,
            org_id: scope.orgId,
          }
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
