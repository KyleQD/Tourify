import { NextRequest } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'
import type { UpdateMapLayerRequest } from '@/types/site-map'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminCapability('logistics.view', async (_request, { supabase, user, admin }) => {
    try {
      const { data: layer, error } = await supabase
        .from('map_layers')
        .select(`
          *,
          site_maps!inner(id, created_by)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching layer:', error)
        return siteMapError('Layer not found', 404)
      }

      const access = await getSiteMapAccess(supabase, layer.site_maps.id, user.id, { requiredOrgId: admin.orgId })
      const accessCheck = requireSiteMapAccess(access, 'read')
      if (!accessCheck.ok) {
        return siteMapError(accessCheck.error, accessCheck.status)
      }

      return siteMapSuccess(layer)
    } catch (error) {
      console.error('Error in layer GET:', error)
      return siteMapError('Internal server error')
    }
  })(request)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminCapability('logistics.manage', async (_request, { supabase, user, admin }) => {
    try {
      const body = await request.json() as Partial<UpdateMapLayerRequest> & Record<string, any>
      const name = body.name
      const description = body.description
      const layerType = body.layerType || body.layer_type
      const color = body.color
      const opacity = body.opacity
      const isVisible = body.isVisible ?? body.is_visible
      const isLocked = body.isLocked ?? body.is_locked
      const zIndex = body.zIndex ?? body.z_index ?? body.order

      // First get the layer to check permissions
      const { data: existingLayer, error: fetchError } = await supabase
        .from('map_layers')
        .select(`
          *,
          site_maps!inner(id, created_by)
        `)
        .eq('id', id)
        .single()

      if (fetchError || !existingLayer) {
        return siteMapError('Layer not found', 404)
      }

      const access = await getSiteMapAccess(supabase, existingLayer.site_maps.id, user.id, { requiredOrgId: admin.orgId })
      const accessCheck = requireSiteMapAccess(access, 'edit')
      if (!accessCheck.ok) {
        return siteMapError(accessCheck.error, accessCheck.status)
      }

      // Build update object
      const updates: any = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (layerType !== undefined) updates.layer_type = layerType
      if (color !== undefined) updates.color = color
      if (opacity !== undefined) updates.opacity = opacity
      if (isVisible !== undefined) updates.is_visible = isVisible
      if (isLocked !== undefined) updates.is_locked = isLocked
      if (zIndex !== undefined) updates.z_index = zIndex

      const { data: layer, error } = await supabase
        .from('map_layers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating layer:', error)
        return siteMapError('Failed to update layer')
      }

      return siteMapSuccess(layer)
    } catch (error) {
      console.error('Error in layer PUT:', error)
      return siteMapError('Internal server error')
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminCapability('logistics.manage', async (_request, { supabase, user, admin }) => {
    try {
      // First get the layer to check permissions
      const { data: existingLayer, error: fetchError } = await supabase
        .from('map_layers')
        .select(`
          *,
          site_maps!inner(id, created_by)
        `)
        .eq('id', id)
        .single()

      if (fetchError || !existingLayer) {
        return siteMapError('Layer not found', 404)
      }

      const access = await getSiteMapAccess(supabase, existingLayer.site_maps.id, user.id, { requiredOrgId: admin.orgId })
      const accessCheck = requireSiteMapAccess(access, 'edit')
      if (!accessCheck.ok) {
        return siteMapError(accessCheck.error, accessCheck.status)
      }

      const { error } = await supabase
        .from('map_layers')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting layer:', error)
        return siteMapError('Failed to delete layer')
      }

      return siteMapSuccess({ deleted: true })
    } catch (error) {
      console.error('Error in layer DELETE:', error)
      return siteMapError('Internal server error')
    }
  })(request)
}