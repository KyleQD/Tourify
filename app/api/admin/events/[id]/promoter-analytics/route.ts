import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { assertOrgEntityReferences } from '@/lib/admin/org-entity-access'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { resolveEventPromoterFlags } from '@/lib/promoter-network/feature-flags'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'

function eventIdFromRequest(request: NextRequest) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  return z.string().uuid().parse(segments[segments.lastIndexOf('events') + 1])
}

function csvCell(value: unknown) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export const GET = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    const eventId = eventIdFromRequest(request)
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId })
    const allowed = await hasTicketingPermission({
      supabase,
      userId: user.id,
      eventId,
      permission: 'manage_ticket_types',
    })
    if (!allowed) return NextResponse.json({ error: 'You do not have permission to view this event promoter analytics.' }, { status: 403 })

    const flags = await resolveEventPromoterFlags(supabase)
    if (!flags.event_promoter_program_enabled)
      return NextResponse.json({ error: 'Promoter programs are not enabled.' }, { status: 404 })

    const { data, error } = await supabase.rpc('get_event_promoter_organizer_analytics', { p_event_id: eventId })
    if (error || !data) {
      console.error('[event promoter analytics] unavailable', error)
      return NextResponse.json({ error: 'Promoter analytics are temporarily unavailable.' }, { status: 503 })
    }

    if (new URL(request.url).searchParams.get('format') !== 'csv')
      return NextResponse.json({ data })

    const analytics = data as Record<string, any>
    const rows = (analytics.promoter_rankings || []).map((promoter: any) => [
      promoter.promoter_user_id,
      promoter.membership_status,
      promoter.currency,
      promoter.clicks,
      promoter.attributed_sales,
      promoter.tickets_sold,
      promoter.eligible_revenue_minor,
      promoter.earned_minor,
      promoter.reversed_minor,
      promoter.net_commission_minor,
      promoter.conversion_rate,
    ])
    const csv = [
      ['promoter_user_id', 'membership_status', 'currency', 'clicks', 'attributed_sales', 'tickets_sold', 'eligible_revenue_minor', 'earned_minor', 'reversed_minor', 'net_commission_minor', 'conversion_rate'],
      ...rows,
    ].map((row) => row.map(csvCell).join(',')).join('\n')

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="event-${eventId}-promoter-analytics.csv"`,
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'A valid event id is required.' }, { status: 400 })
    console.error('[event promoter analytics] request failed', error)
    return NextResponse.json({ error: 'Promoter analytics are temporarily unavailable.' }, { status: 503 })
  }
})
