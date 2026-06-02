import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()

    const { data: shareToken, error: shareTokenError } = await supabase
      .from('site_map_share_tokens')
      .select('site_map_id, is_active, expires_at')
      .eq('token', token)
      .single()

    if (shareTokenError || !shareToken) return NextResponse.json({ error: 'Invalid share link' }, { status: 404 })
    if (!shareToken.is_active) return NextResponse.json({ error: 'Share link disabled' }, { status: 403 })
    if (shareToken.expires_at && new Date(shareToken.expires_at).getTime() < Date.now())
      return NextResponse.json({ error: 'Share link expired' }, { status: 403 })

    const { data: siteMap, error: siteMapError } = await supabase
      .from('site_maps')
      .select(`
        *,
        elements:site_map_elements(*),
        zones:site_map_zones(*),
        tents:glamping_tents(*)
      `)
      .eq('id', shareToken.site_map_id)
      .single()

    if (siteMapError || !siteMap) return NextResponse.json({ error: 'Site map not found' }, { status: 404 })

    return NextResponse.json({
      success: true,
      data: {
        ...siteMap,
        readOnly: true,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch public site map' }, { status: 500 })
  }
}
