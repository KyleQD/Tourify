import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { siteMapError, siteMapSuccess } from '@/lib/site-map/access'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServiceRoleClient()

    const { data: shareToken, error: shareTokenError } = await supabase
      .from('site_map_share_tokens')
      .select('site_map_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (shareTokenError || !shareToken) return siteMapError('Invalid share link', 404)
    if (!shareToken.is_active) return siteMapError('Share link disabled', 403)
    if (shareToken.expires_at && new Date(shareToken.expires_at).getTime() < Date.now())
      return siteMapError('Share link expired', 403)

    const { data: siteMap, error: siteMapFetchError } = await supabase
      .from('site_maps')
      .select('id, event_id, tour_id, name, description, width, height, scale, scale_unit, background_image_url, background_color, grid_enabled, grid_size, status, version, created_at, updated_at')
      .eq('id', shareToken.site_map_id)
      .single()

    if (siteMapFetchError || !siteMap) return siteMapError('Site map not found', 404)

    const [
      elementsResult,
      zonesResult,
      tentsResult,
      layersResult,
      measurementsResult,
    ] = await Promise.all([
      supabase
        .from('site_map_elements')
        .select('id, site_map_id, name, element_type, x, y, width, height, rotation, color, stroke_color, stroke_width, opacity, path_data, shape_data, properties, created_at, updated_at')
        .eq('site_map_id', shareToken.site_map_id),
      supabase
        .from('site_map_zones')
        .select('id, site_map_id, name, zone_type, x, y, width, height, rotation, color, border_color, border_width, opacity, capacity, current_occupancy, power_available, water_available, internet_available, description, tags, status, created_at, updated_at')
        .eq('site_map_id', shareToken.site_map_id),
      supabase
        .from('glamping_tents')
        .select('id, site_map_id, zone_id, tent_number, tent_type, capacity, size_category, x, y, width, height, rotation, status, has_power, has_heating, has_cooling, has_private_bathroom, has_wifi, created_at, updated_at')
        .eq('site_map_id', shareToken.site_map_id),
      supabase
        .from('map_layers')
        .select('id, site_map_id, name, description, layer_type, color, opacity, is_visible, is_locked, z_index, created_at, updated_at')
        .eq('site_map_id', shareToken.site_map_id)
        .eq('is_visible', true)
        .order('z_index', { ascending: true }),
      supabase
        .from('map_measurements')
        .select('id, site_map_id, measurement_type, start_x, start_y, end_x, end_y, width, height, value, unit, label, color, is_compliant, compliance_notes, created_at, updated_at')
        .eq('site_map_id', shareToken.site_map_id),
    ])

    const queryError = elementsResult.error || zonesResult.error || tentsResult.error || layersResult.error || measurementsResult.error
    if (queryError) {
      console.error('Error fetching public site map assets:', queryError)
      return siteMapError('Failed to fetch public site map')
    }

    return siteMapSuccess({
      ...siteMap,
      elements: elementsResult.data || [],
      zones: zonesResult.data || [],
      tents: tentsResult.data || [],
      layers: layersResult.data || [],
      measurements: measurementsResult.data || [],
      readOnly: true,
      publicShare: true,
    })
  } catch (error) {
    console.error('Error fetching public site map:', error)
    return siteMapError('Failed to fetch public site map')
  }
}
