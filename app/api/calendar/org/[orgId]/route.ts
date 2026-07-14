import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { aggregateAdminCalendarItems } from '@/lib/admin/calendar/aggregate'
import {
  adminItemsToIcsEvents,
  buildIcsCalendar,
  icsFeedResponse,
} from '@/lib/admin/calendar/ics'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params
  const token = new URL(request.url).searchParams.get('token')

  if (!orgId)
    return new Response('Organization not found', { status: 404 })

  const supabase = createServiceRoleClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('id, name, calendar_token, calendar_feed_enabled')
    .eq('id', orgId)
    .maybeSingle()

  if (error || !org)
    return new Response('Organization not found', { status: 404 })

  if (org.calendar_feed_enabled === false)
    return new Response('Calendar feed disabled', { status: 403 })

  if (org.calendar_token && token !== String(org.calendar_token))
    return new Response('Invalid token', { status: 401 })

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Public feed uses service role; scope strictly to this org
  const { items } = await aggregateAdminCalendarItems({
    supabase,
    userId: 'calendar-feed',
    orgId: org.id,
    filters: { startDate, endDate },
  })

  const body = buildIcsCalendar({
    prodId: '-//Tourify//Organization Calendar//EN',
    name: `${org.name || 'Tourify'} Operations`,
    events: adminItemsToIcsEvents(items),
  })

  return icsFeedResponse(body)
}
