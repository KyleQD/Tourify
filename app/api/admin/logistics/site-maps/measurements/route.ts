import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'
import type { CreateMeasurementRequest } from '@/types/site-map'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return siteMapError('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const siteMapId = searchParams.get('siteMapId') || searchParams.get('site_map_id')

    if (!siteMapId) {
      return siteMapError('Site map ID is required', 400)
    }

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'read')
    if (!accessCheck.ok) {
      return siteMapError(accessCheck.error, accessCheck.status)
    }

    const { data: measurements, error } = await supabase
      .from('map_measurements')
      .select('*')
      .eq('site_map_id', siteMapId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching measurements:', error)
      return siteMapError('Failed to fetch measurements')
    }

    return siteMapSuccess(measurements || [])
  } catch (error) {
    console.error('Error in measurements GET:', error)
    return siteMapError('Internal server error')
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return siteMapError('Unauthorized', 401)
    }

    const body = await request.json() as CreateMeasurementRequest & Record<string, any>
    const siteMapId = body.siteMapId || body.site_map_id
    const measurementType = body.measurementType || body.measurement_type
    const startX = body.startX ?? body.start_x
    const startY = body.startY ?? body.start_y
    const endX = body.endX ?? body.end_x
    const endY = body.endY ?? body.end_y
    const width = body.width
    const height = body.height
    const value = body.value
    const unit = body.unit
    const label = body.label
    const color = body.color
    const complianceNotes = body.complianceNotes ?? body.compliance_notes

    if (!siteMapId || !measurementType || startX === undefined || startY === undefined) {
      return siteMapError('Site map ID, measurement type, and start coordinates are required', 400)
    }

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return siteMapError(accessCheck.error, accessCheck.status)
    }

    const { data: measurement, error } = await supabase
      .from('map_measurements')
      .insert({
        site_map_id: siteMapId,
        measurement_type: measurementType,
        start_x: startX,
        start_y: startY,
        end_x: endX,
        end_y: endY,
        width,
        height,
        value,
        unit: unit || 'meters',
        label,
        color: color || '#ff6b6b',
        compliance_notes: complianceNotes,
        is_compliant: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating measurement:', error)
      return siteMapError('Failed to create measurement')
    }

    return siteMapSuccess(measurement, { status: 201 })
  } catch (error) {
    console.error('Error in measurements POST:', error)
    return siteMapError('Internal server error')
  }
}
