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

  const body = await request.json().catch(() => ({}))
  const changeSummary =
    typeof body?.changeSummary === 'string' && body.changeSummary.trim()
      ? body.changeSummary.trim()
      : 'Published to Work Mode'

  const { data: siteMap, error: siteMapError } = await supabase
    .from('site_maps')
    .select('id, name, event_id, tour_id, created_by, is_public, status, version, width, height, scale, background_image_url')
    .eq('id', siteMapId)
    .maybeSingle()

  if (siteMapError) return NextResponse.json({ error: siteMapError.message }, { status: 500 })
  if (!siteMap) return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
  if (!siteMap.event_id && !siteMap.tour_id) {
    return NextResponse.json({ error: 'Site map must be linked to an event or tour before publishing' }, { status: 400 })
  }

  const url = buildWorkerSiteMapUrl(siteMap.id)

  // Capture immutable published snapshot in map_versions (builder untouched)
  const [zonesRes, elementsRes, tentsRes] = await Promise.all([
    supabase.from('site_map_zones').select('id, name, zone_type').eq('site_map_id', siteMap.id),
    supabase.from('site_map_elements').select('id, name, element_type').eq('site_map_id', siteMap.id),
    supabase.from('glamping_tents').select('id, name').eq('site_map_id', siteMap.id),
  ])
  const zones = zonesRes.data || []
  const elements = elementsRes.data || []
  const tents = tentsRes.data || []

  const { data: latestVersion } = await supabase
    .from('map_versions')
    .select('version_number')
    .eq('site_map_id', siteMap.id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersionNumber = (latestVersion?.version_number || siteMap.version || 0) + 1

  await supabase
    .from('map_versions')
    .update({ is_current: false })
    .eq('site_map_id', siteMap.id)
    .eq('is_current', true)

  const snapshotPayload = {
    site_map_id: siteMap.id,
    name: siteMap.name,
    width: siteMap.width,
    height: siteMap.height,
    scale: siteMap.scale,
    background_image_url: siteMap.background_image_url,
    zones,
    elements,
    tents,
    published_at: new Date().toISOString(),
  }

  const { data: mapVersion, error: versionError } = await supabase
    .from('map_versions')
    .insert({
      site_map_id: siteMap.id,
      version_name: `Published v${nextVersionNumber}`,
      description: changeSummary,
      version_number: nextVersionNumber,
      is_current: true,
      created_by: user.id,
      snapshot_payload: snapshotPayload,
      change_summary: changeSummary,
      published_by: user.id,
      published_at: new Date().toISOString(),
      status: 'published',
    })
    .select('id, version_number, version_name, published_at')
    .maybeSingle()

  if (versionError && versionError.code !== '42P01' && !versionError.message?.includes('snapshot_payload')) {
    // Soft-fail versioning if optional columns not migrated yet; still publish work mode
    console.warn('[publish-work-mode] map_versions insert:', versionError.message)
  }

  const { error: statusError } = await supabase
    .from('site_maps')
    .update({
      status: 'published',
      updated_at: new Date().toISOString(),
      version: nextVersionNumber,
      current_published_version_id: mapVersion?.id || null,
      publish_change_summary: changeSummary,
    })
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    publication = data
  }

  return NextResponse.json({
    publication,
    siteMap: { ...siteMap, status: 'published', version: nextVersionNumber },
    mapVersion: mapVersion || null,
    url,
  }, { status: 201 })
})
