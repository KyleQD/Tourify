import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { requireAdminCapability } from '@/lib/auth/admin-context'

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  const admin = await resolveActingAdminContext(request, { supabase, user })
  if (admin instanceof NextResponse) return admin

  const denied = requireAdminCapability(admin, 'org.settings.manage')
  if (denied) return denied

  const service = createServiceRoleClient()
  const { data: org, error } = await service
    .from('organizations')
    .select('id, name, calendar_token, calendar_feed_enabled')
    .eq('id', admin.orgId)
    .maybeSingle()

  if (error || !org)
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Ensure token exists for older orgs
  if (!org.calendar_token) {
    const token = crypto.randomUUID()
    const { data: updated } = await service
      .from('organizations')
      .update({ calendar_token: token })
      .eq('id', admin.orgId)
      .select('id, name, calendar_token, calendar_feed_enabled')
      .maybeSingle()

    if (updated) {
      return NextResponse.json({
        success: true,
        orgId: updated.id,
        orgName: updated.name,
        calendarToken: updated.calendar_token,
        feedEnabled: updated.calendar_feed_enabled !== false,
      })
    }
  }

  return NextResponse.json({
    success: true,
    orgId: org.id,
    orgName: org.name,
    calendarToken: org.calendar_token,
    feedEnabled: org.calendar_feed_enabled !== false,
  })
})

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  const admin = await resolveActingAdminContext(request, { supabase, user })
  if (admin instanceof NextResponse) return admin

  const denied = requireAdminCapability(admin, 'org.settings.manage')
  if (denied) return denied

  const service = createServiceRoleClient()
  const newToken = crypto.randomUUID()

  const { data: org, error } = await service
    .from('organizations')
    .update({ calendar_token: newToken })
    .eq('id', admin.orgId)
    .select('id, name, calendar_token, calendar_feed_enabled')
    .maybeSingle()

  if (error || !org)
    return NextResponse.json({ error: 'Failed to rotate calendar token' }, { status: 500 })

  return NextResponse.json({
    success: true,
    orgId: org.id,
    orgName: org.name,
    calendarToken: org.calendar_token,
    feedEnabled: org.calendar_feed_enabled !== false,
  })
})
