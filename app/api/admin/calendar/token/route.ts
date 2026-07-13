import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { resolveCalendarOrgId } from '@/lib/admin/calendar/aggregate'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const GET = withAdminAuth(async (_request: NextRequest, { supabase, user }) => {
  const orgId = await resolveCalendarOrgId(supabase, user.id)
  if (!orgId)
    return NextResponse.json({ error: 'No organization found for this admin' }, { status: 404 })

  const service = createServiceRoleClient()
  const { data: org, error } = await service
    .from('organizations')
    .select('id, name, calendar_token, calendar_feed_enabled')
    .eq('id', orgId)
    .maybeSingle()

  if (error || !org)
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Ensure token exists for older orgs
  if (!org.calendar_token) {
    const token = crypto.randomUUID()
    const { data: updated } = await service
      .from('organizations')
      .update({ calendar_token: token })
      .eq('id', orgId)
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

export const POST = withAdminAuth(async (_request: NextRequest, { supabase, user }) => {
  const orgId = await resolveCalendarOrgId(supabase, user.id)
  if (!orgId)
    return NextResponse.json({ error: 'No organization found for this admin' }, { status: 404 })

  const service = createServiceRoleClient()
  const newToken = crypto.randomUUID()

  const { data: org, error } = await service
    .from('organizations')
    .update({ calendar_token: newToken })
    .eq('id', orgId)
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
