import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'

type RouteContext = { params: Promise<{ id: string }> }

function buildMeasurementUpdates(body: Record<string, any>) {
  const updates: Record<string, any> = {}

  if (body.measurementType !== undefined || body.measurement_type !== undefined) {
    updates.measurement_type = body.measurementType ?? body.measurement_type
  }
  if (body.startX !== undefined || body.start_x !== undefined) updates.start_x = body.startX ?? body.start_x
  if (body.startY !== undefined || body.start_y !== undefined) updates.start_y = body.startY ?? body.start_y
  if (body.endX !== undefined || body.end_x !== undefined) updates.end_x = body.endX ?? body.end_x
  if (body.endY !== undefined || body.end_y !== undefined) updates.end_y = body.endY ?? body.end_y
  if (body.width !== undefined) updates.width = body.width
  if (body.height !== undefined) updates.height = body.height
  if (body.value !== undefined) updates.value = body.value
  if (body.unit !== undefined) updates.unit = body.unit
  if (body.label !== undefined) updates.label = body.label
  if (body.color !== undefined) updates.color = body.color
  if (body.isCompliant !== undefined || body.is_compliant !== undefined) {
    updates.is_compliant = body.isCompliant ?? body.is_compliant
  }
  if (body.complianceNotes !== undefined || body.compliance_notes !== undefined) {
    updates.compliance_notes = body.complianceNotes ?? body.compliance_notes
  }

  return updates
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const { data, error } = await supabase
      .from('map_measurements')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return siteMapError('Measurement not found', 404)

    const access = await getSiteMapAccess(supabase, data.site_map_id, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    return siteMapSuccess(data)
  } catch {
    return siteMapError('Failed to fetch measurement')
  }
}

async function updateMeasurement(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const { data: existingMeasurement, error: fetchError } = await supabase
      .from('map_measurements')
      .select('id, site_map_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingMeasurement) return siteMapError('Measurement not found', 404)

    const access = await getSiteMapAccess(supabase, existingMeasurement.site_map_id, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const body = await request.json()
    const updates = buildMeasurementUpdates(body)

    const { data, error } = await supabase
      .from('map_measurements')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return siteMapError(error.message)
    return siteMapSuccess(data)
  } catch {
    return siteMapError('Failed to update measurement')
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return updateMeasurement(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return updateMeasurement(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const { data: existingMeasurement, error: fetchError } = await supabase
      .from('map_measurements')
      .select('id, site_map_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingMeasurement) return siteMapError('Measurement not found', 404)

    const access = await getSiteMapAccess(supabase, existingMeasurement.site_map_id, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const { error } = await supabase
      .from('map_measurements')
      .delete()
      .eq('id', id)

    if (error) return siteMapError(error.message)
    return siteMapSuccess({ deleted: true })
  } catch {
    return siteMapError('Failed to delete measurement')
  }
}
