import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSiteMapAccess, requireSiteMapAccess } from '@/lib/site-map/access'
import type { SiteMapExport } from '@/types/site-map'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const { id: siteMapId } = await params

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'export')
    if (!accessCheck.ok) {
      return NextResponse.json({ error: accessCheck.error }, { status: accessCheck.status })
    }

    // Get site map with all related data
    const { data: siteMapData, error } = await supabase.rpc('get_site_map_with_data', {
      site_map_uuid: siteMapId
    })

    if (error) {
      console.error('Error fetching site map data:', error)
      return NextResponse.json({ error: 'Failed to fetch site map data' }, { status: 500 })
    }

    if (!siteMapData) {
      return NextResponse.json({ error: 'Site map not found' }, { status: 404 })
    }

    // Create export data
    const exportData: SiteMapExport = {
      siteMap: siteMapData.site_map,
      zones: siteMapData.zones || [],
      tents: siteMapData.tents || [],
      elements: siteMapData.elements || [],
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: user.email || 'Unknown User',
        version: '1.0'
      }
    }

    // Log export activity
    await supabase
      .from('site_map_activity_log')
      .insert({
        site_map_id: siteMapId,
        user_id: user.id,
        action: 'EXPORT',
        entity_type: 'site_map',
        entity_id: siteMapId,
        new_values: { exportedAt: exportData.metadata.exportedAt }
      })

    // Return as downloadable JSON
    const filename = `${siteMapData.site_map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`
    
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('[Site Map Export API] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to export site map' 
    }, { status: 500 })
  }
}
