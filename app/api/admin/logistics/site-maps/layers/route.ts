import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'
import type { CreateMapLayerRequest } from '@/types/site-map'

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

    const { data: layers, error } = await supabase
      .from('map_layers')
      .select('*')
      .eq('site_map_id', siteMapId)
      .order('z_index', { ascending: true })

    if (error) {
      console.error('Error fetching layers:', error)
      return siteMapError('Failed to fetch layers')
    }

    return siteMapSuccess(layers || [])
  } catch (error) {
    console.error('Error in layers GET:', error)
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

    const body = await request.json() as CreateMapLayerRequest & Record<string, any>
    const siteMapId = body.siteMapId || body.site_map_id
    const name = body.name
    const description = body.description
    const layerType = body.layerType || body.layer_type || 'custom'
    const color = body.color
    const opacity = body.opacity
    const zIndex = body.zIndex ?? body.z_index ?? body.order ?? 0
    const isVisible = body.isVisible ?? body.is_visible ?? true
    const isLocked = body.isLocked ?? body.is_locked ?? false

    if (!siteMapId || !name) {
      return siteMapError('Site map ID and name are required', 400)
    }

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'edit')
    if (!accessCheck.ok) {
      return siteMapError(accessCheck.error, accessCheck.status)
    }

    const { data: layer, error } = await supabase
      .from('map_layers')
      .insert({
        site_map_id: siteMapId,
        name,
        description,
        layer_type: layerType,
        color: color || '#3b82f6',
        opacity: opacity || 1.0,
        z_index: zIndex,
        is_visible: isVisible,
        is_locked: isLocked
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating layer:', error)
      return siteMapError('Failed to create layer')
    }

    return siteMapSuccess(layer, { status: 201 })
  } catch (error) {
    console.error('Error in layers POST:', error)
    return siteMapError('Internal server error')
  }
}
