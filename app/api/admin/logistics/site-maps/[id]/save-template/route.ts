import { NextRequest, NextResponse } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: siteMapId } = await params
  return withAdminCapability('logistics.manage', async (_req, { supabase, user, admin }) => {
    try {
      const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
        requiredOrgId: admin.orgId,
      })
      const accessCheck = requireSiteMapAccess(access, 'manage')
      if (!accessCheck.ok) return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })

      const body = await request.json()
      const name = (body.name || '').trim()
      if (!name) return NextResponse.json({ error: 'Template name is required' }, { status: 400 })

      const category = body.category || 'custom'
      const description = body.description || null
      const isPublic = Boolean(body.isPublic)

      const { data: siteMap } = await supabase
        .from('site_maps')
        .select('id, name, created_by')
        .eq('id', siteMapId)
        .single()

      if (!siteMap) return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
      if (siteMap.created_by !== user.id) return NextResponse.json({ error: 'Only owner can save templates' }, { status: 403 })

      const { data: elements } = await supabase
        .from('site_map_elements')
        .select('name, element_type, x, y, width, height, rotation, color, stroke_color, stroke_width, opacity, properties')
        .eq('site_map_id', siteMapId)

      const { data: template, error } = await supabase
        .from('map_templates')
        .insert({
          name,
          description,
          category,
          is_public: isPublic,
          created_by: user.id,
          template_data: { elements: elements || [] },
        })
        .select('id, name, category, created_at')
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ success: true, data: template })
    } catch {
      return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
    }
  })(request)
}