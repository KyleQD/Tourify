import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const segments = new URL(request.url).pathname.split('/')
  const siteMapId = segments[segments.indexOf('site-maps') + 1]
  if (!siteMapId) return NextResponse.json({ error: 'Missing site map id' }, { status: 400 })

  const access = await getSiteMapAccess(supabase, siteMapId, user.id)
  const accessCheck = requireSiteMapAccess(access, 'read')
  if (!accessCheck.ok) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
  }

  const { data, error } = await supabase
    .from('map_versions')
    .select('id, site_map_id, version_name, description, version_number, is_current, change_summary, published_by, published_at, status, created_at, created_by')
    .eq('site_map_id', siteMapId)
    .order('version_number', { ascending: false })

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ versions: [], needsMigration: true })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ versions: data || [] })
})
