import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'

function buildWorkerSiteMapUrl(siteMapId: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  const vercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
  const base = (configured || vercel || '').replace(/\/$/, '')
  const path = `/work/site-maps/${siteMapId}`
  return base ? `${base}${path}` : path
}

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const segments = new URL(request.url).pathname.split('/')
  const siteMapId = segments[segments.indexOf('site-maps') + 1]
  if (!siteMapId) return NextResponse.json({ error: 'Missing site map id' }, { status: 400 })

  const access = await getSiteMapAccess(supabase, siteMapId, user.id)
  const accessCheck = requireSiteMapAccess(access, 'edit')
  if (!accessCheck.ok) {
    return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
  }

  const { data: siteMap, error: siteMapError } = await supabase
    .from('site_maps')
    .select('id, name, event_id, tour_id, created_by, is_public, status')
    .eq('id', siteMapId)
    .maybeSingle()

  if (siteMapError) return NextResponse.json({ error: siteMapError.message }, { status: 500 })
  if (!siteMap) return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
  if (!siteMap.event_id && !siteMap.tour_id) {
    return NextResponse.json({ error: 'Site map must be linked to an event or tour before publishing' }, { status: 400 })
  }

  const url = buildWorkerSiteMapUrl(siteMap.id)

  const { error: statusError } = await supabase
    .from('site_maps')
    .update({ status: 'published', updated_at: new Date().toISOString() })
    .eq('id', siteMap.id)

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 })
  }

  const payload = {
    site_map_id: siteMap.id,
    name: siteMap.name,
    status: 'published',
    url,
    worker_url: url,
  }

  const { data: existing } = await supabase
    .from('work_mode_publications')
    .select('id')
    .eq('site_map_id', siteMap.id)
    .eq('publication_type', 'site_map')
    .eq('status', 'published')
    .maybeSingle()

  let publication
  if (existing?.id) {
    const { data, error } = await supabase
      .from('work_mode_publications')
      .update({
        title: `Site Map: ${siteMap.name}`,
        payload,
        published_by: user.id,
        published_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'Work Mode publication table is not migrated yet' }, { status: 501 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    publication = data
  } else {
    const { data, error } = await supabase
      .from('work_mode_publications')
      .insert({
        event_id: siteMap.event_id || null,
        tour_id: siteMap.tour_id || null,
        site_map_id: siteMap.id,
        publication_type: 'site_map',
        title: `Site Map: ${siteMap.name}`,
        payload,
        visible_to: ['assigned_workers'],
        status: 'published',
        published_by: user.id,
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ error: 'Work Mode publication table is not migrated yet' }, { status: 501 })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    publication = data
  }

  return NextResponse.json({ publication, siteMap: { ...siteMap, status: 'published' }, url }, { status: 201 })
})
