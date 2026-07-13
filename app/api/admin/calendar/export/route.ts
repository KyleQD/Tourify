import { NextRequest } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  aggregateAdminCalendarItems,
  resolveCalendarOrgId,
} from '@/lib/admin/calendar/aggregate'
import {
  adminItemsToIcsEvents,
  buildIcsCalendar,
  icsResponse,
} from '@/lib/admin/calendar/ics'

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  const orgId = await resolveCalendarOrgId(supabase, user.id)
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
    || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = searchParams.get('endDate')
    || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { items } = await aggregateAdminCalendarItems({
    supabase,
    userId: user.id,
    orgId,
    filters: { startDate, endDate },
  })

  const body = buildIcsCalendar({
    prodId: '-//Tourify//Admin Operations Calendar//EN',
    name: 'Tourify Operations',
    events: adminItemsToIcsEvents(items),
  })

  return icsResponse(body, 'tourify-operations-calendar.ics')
})
