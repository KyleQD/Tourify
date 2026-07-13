import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getSiteMapAccess, requireSiteMapAccess, siteMapError, siteMapSuccess } from '@/lib/site-map/access'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: siteMapId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return siteMapError('Unauthorized', 401)

    const access = await getSiteMapAccess(supabase, siteMapId, user.id)
    const accessCheck = requireSiteMapAccess(access, 'share')
    if (!accessCheck.ok) return siteMapError(accessCheck.error, accessCheck.status)

    const body = await request.json().catch(() => ({}))
    const serviceSupabase = createServiceRoleClient()

    const token = crypto.randomUUID().replaceAll('-', '')
    const { data, error } = await serviceSupabase
      .from('site_map_share_tokens')
      .insert({
        site_map_id: siteMapId,
        token,
        created_by: user.id,
        expires_at: body.expiresAt || body.expires_at || null,
      })
      .select('token')
      .single()

    if (error) return siteMapError(error.message)

    return siteMapSuccess({ token: data.token })
  } catch (error) {
    console.error('Error creating public site map link:', error)
    return siteMapError('Failed to create public link')
  }
}
