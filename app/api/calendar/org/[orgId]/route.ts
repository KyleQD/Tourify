import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { aggregateAdminCalendarItems } from '@/lib/admin/calendar/aggregate'
import {
  adminItemsToIcsEvents,
  buildIcsCalendar,
  icsFeedResponse,
} from '@/lib/admin/calendar/ics'
import { projectCalendarItems } from '@/lib/admin/calendar/field-projection'
import { isValidCalendarFeedToken } from '@/lib/calendar/feed-token'

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

  // CAL-102 — reject guessed orgId + wrong/missing token (timing-safe when possible)
  if (!isValidCalendarFeedToken({
    resourceType: 'organization',
    resourceId: org.id,
    token,
    storedToken: org.calendar_token,
  })) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Public feed uses service role; scope strictly to this org + feed projection
  const { items } = await aggregateAdminCalendarItems({
    supabase,
    userId: 'calendar-feed',
    orgId: org.id,
    filters: { startDate, endDate },
  })

  const projected = projectCalendarItems({ items, mode: 'feed' })

  const body = buildIcsCalendar({
    prodId: '-//Tourify//Organization Calendar//EN',
    name: `${org.name || 'Tourify'} Operations`,
    events: adminItemsToIcsEvents(projected),
  })

  return icsFeedResponse(body)
}
