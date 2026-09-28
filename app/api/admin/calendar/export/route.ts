import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import {
  aggregateAdminCalendarItems,
} from '@/lib/admin/calendar/aggregate'
import {
  adminItemsToIcsEvents,
  buildIcsCalendar,
  icsResponse,
} from '@/lib/admin/calendar/ics'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasCalendarEntryAccess } from '@/lib/admin/calendar/source-access'
import { projectCalendarItems } from '@/lib/admin/calendar/field-projection'

export const GET = withAuth(async (request: NextRequest, { supabase, user }) => {
  const admin = await resolveActingAdminContext(request, { supabase, user })
  if (admin instanceof NextResponse) return admin

  if (!hasCalendarEntryAccess(admin.capabilities)) {
    return NextResponse.json(
      { error: 'This action requires a calendar source capability.', code: 'capability_denied' },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
    || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = searchParams.get('endDate')
    || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { items } = await aggregateAdminCalendarItems({
    supabase,
    userId: admin.userId,
    orgId: admin.orgId,
    capabilities: admin.capabilities,
    filters: { startDate, endDate },
  })

  const projected = projectCalendarItems({
    items,
    capabilities: admin.capabilities,
    mode: 'admin',
  })

  const body = buildIcsCalendar({
    prodId: '-//Tourify//Admin Operations Calendar//EN',
    name: 'Tourify Operations',
    events: adminItemsToIcsEvents(projected),
  })

  return icsResponse(body, 'tourify-operations-calendar.ics')
})
