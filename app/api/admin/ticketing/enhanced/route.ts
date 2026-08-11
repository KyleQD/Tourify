import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import type { ActingAdminContext } from '@/lib/auth/admin-context'
import {
  assertOrgEntityReferences,
  listOrgEventIds,
  OrgEntityAccessError,
} from '@/lib/admin/org-entity-access'
import {
  executeTicketingCommand,
  getTicketingCommandErrorStatus,
  TicketingCommandError,
} from '@/lib/admin/ticketing-command.service'
import { parseTicketingCommand } from '@/lib/admin/ticketing-command-schemas'
import {
  ticketingQuerySchema,
  TicketingValidationError,
} from '@/lib/admin/ticketing-validation'

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000'

class TicketingQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TicketingQueryError'
  }
}

function scopedEventIds(eventIds: string[]) {
  return eventIds.length > 0 ? eventIds : [EMPTY_UUID]
}

function routeError(scope: string, error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation error', code: 'validation_error', details: error.errors },
      { status: 400 },
    )
  }
  if (error instanceof TicketingValidationError) {
    return NextResponse.json(
      { error: error.message, code: 'ticketing_validation_error' },
      { status: 422 },
    )
  }
  if (error instanceof TicketingCommandError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    )
  }
  if (error instanceof OrgEntityAccessError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    )
  }
  if (error instanceof TicketingQueryError) {
    return NextResponse.json(
      { error: error.message, code: 'ticketing_unavailable' },
      { status: 503 },
    )
  }

  const status = getTicketingCommandErrorStatus(error, 500)
  if (status < 500) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Command failed', code: 'command_failed' },
      { status },
    )
  }

  console.error(`[Enhanced Admin Ticketing API] ${scope} failed:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}

async function runTicketingMutation(args: {
  supabase: any
  userId: string
  orgId: string
  capabilities: ActingAdminContext['capabilities']
  body: unknown
  idempotencyKey?: string | null
}) {
  const parsed = parseTicketingCommand(args.body)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, code: 'validation_error', details: parsed.details },
      { status: 400 },
    )
  }

  const result = await executeTicketingCommand({
    supabase: args.supabase,
    userId: args.userId,
    orgId: args.orgId,
    capabilities: args.capabilities,
    command: parsed.data,
    idempotencyKey: args.idempotencyKey,
  })

  return NextResponse.json(result.data, { status: result.status || 200 })
}

async function resolveEventScope(
  supabase: any,
  orgId: string,
  eventId?: string,
): Promise<string[]> {
  if (eventId) {
    await assertOrgEntityReferences(supabase, orgId, { eventId })
    return [eventId]
  }
  return listOrgEventIds(supabase, orgId)
}

async function getOverview(supabase: any, orgId: string, eventId?: string) {
  const { data, error } = await supabase.rpc('get_admin_ticketing_overview', {
    p_org_id: orgId,
    p_event_id: eventId || null,
  })
  if (error) throw new TicketingQueryError('Ticketing overview is temporarily unavailable.')

  const totals = Array.isArray(data) ? data[0] : data
  if (!totals) throw new TicketingQueryError('Ticketing overview is temporarily unavailable.')

  const totalRevenue = Number(totals.total_revenue) || 0
  const totalTicketsSold = Number(totals.total_tickets_sold) || 0
  const socialClicks = Number(totals.social_clicks) || 0
  const socialConversions = Number(totals.social_conversions) || 0

  return {
    metrics: {
      total_revenue: totalRevenue,
      total_tickets_sold: totalTicketsSold,
      total_tickets_available: Number(totals.total_tickets_available) || 0,
      total_tickets_sold_overall: Number(totals.total_tickets_sold_overall) || 0,
      average_ticket_price: totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
      active_campaigns: Number(totals.active_campaigns) || 0,
      campaign_usage_percentage: Number(totals.campaign_usage_percentage) || 0,
      social_clicks: socialClicks,
      social_conversions: socialConversions,
      social_conversion_rate: socialClicks > 0 ? (socialConversions / socialClicks) * 100 : 0,
      weekly_trend: 0,
      revenue_trend: 0,
      conversion_rate: socialClicks > 0 ? (socialConversions / socialClicks) * 100 : 0,
      social_shares: socialClicks,
      referral_revenue: Number(totals.referral_revenue) || 0,
    },
  }
}

async function getTicketTypes(
  supabase: any,
  eventIds: string[],
  limit: number,
  offset: number,
) {
  const { data, error, count } = await supabase
    .from('ticket_types')
    .select(`
      *,
      events_v2:event_id (
        id,
        title,
        start_at,
        venue_id
      )
    `, { count: 'exact' })
    .in('event_id', scopedEventIds(eventIds))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new TicketingQueryError('Failed to fetch ticket types.')
  return { ticket_types: data || [], total: count || 0, limit, offset }
}

async function getCampaigns(
  supabase: any,
  eventIds: string[],
  limit: number,
  offset: number,
) {
  const { data, error, count } = await supabase
    .from('ticket_campaigns')
    .select('*', { count: 'exact' })
    .in('event_id', scopedEventIds(eventIds))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new TicketingQueryError('Failed to fetch campaigns.')
  return { campaigns: data || [], total: count || 0, limit, offset }
}

async function getPromoCodes(
  supabase: any,
  eventIds: string[],
  limit: number,
  offset: number,
) {
  const { data, error, count } = await supabase
    .from('promo_codes')
    .select('*', { count: 'exact' })
    .in('event_id', scopedEventIds(eventIds))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new TicketingQueryError('Failed to fetch promo codes.')
  return { promo_codes: data || [], total: count || 0, limit, offset }
}

async function getSales(
  supabase: any,
  eventIds: string[],
  limit: number,
  offset: number,
) {
  const { data, error, count } = await supabase
    .from('ticket_sales')
    .select(`
      *,
      ticket_types:ticket_type_id (id, name, price, category),
      events_v2:event_id (id, title, start_at),
      promo_codes:promo_code_id (id, code, discount_type, discount_value)
    `, { count: 'exact' })
    .in('event_id', scopedEventIds(eventIds))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new TicketingQueryError('Failed to fetch ticket sales.')
  return { sales: data || [], total: count || 0, limit, offset }
}

async function getAnalytics(supabase: any, eventIds: string[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const ids = scopedEventIds(eventIds)

  const [dailyResult, eventsResult, salesResult, socialResult] = await Promise.all([
    supabase
      .from('ticket_analytics')
      .select('*')
      .in('event_id', ids)
      .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .limit(1_000),
    supabase
      .from('ticket_analytics_events')
      .select('event_name,event_id,amounts,created_at,attribution')
      .in('event_id', ids)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('ticket_sales')
      .select(`
        ticket_type_id,
        total_amount,
        quantity,
        ticket_types:ticket_type_id (name, category)
      `)
      .in('event_id', ids)
      .eq('payment_status', 'completed')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(2_000),
    supabase
      .from('social_media_performance')
      .select('*')
      .in('event_id', ids)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(2_000),
  ])

  if (dailyResult.error || eventsResult.error || salesResult.error || socialResult.error) {
    throw new TicketingQueryError('Failed to fetch ticket analytics.')
  }

  return {
    analytics: {
      daily_sales: dailyResult.data || [],
      sales_by_type: salesResult.data || [],
      social_performance: socialResult.data || [],
      ticket_analytics_events: eventsResult.data || [],
    },
  }
}

async function getSocialPerformance(
  supabase: any,
  orgId: string,
  eventId?: string,
) {
  const { data, error } = await supabase.rpc('get_admin_ticketing_social_performance', {
    p_org_id: orgId,
    p_event_id: eventId || null,
  })

  if (error) throw new TicketingQueryError('Failed to fetch social performance.')
  return { social_performance: data || [] }
}

async function getReferrals(
  supabase: any,
  eventIds: string[],
  limit: number,
  offset: number,
) {
  const { data, error, count } = await supabase
    .from('ticket_referrals')
    .select(`
      *,
      events_v2:event_id (id, title, start_at)
    `, { count: 'exact' })
    .in('event_id', scopedEventIds(eventIds))
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw new TicketingQueryError('Failed to fetch referrals.')
  return { referrals: data || [], total: count || 0, limit, offset }
}

export const GET = withAdminCapability('ticketing.view', async (request, { supabase, admin }) => {
  try {
    const input = ticketingQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    )
    const eventIds = await resolveEventScope(supabase, admin.orgId, input.event_id)

    switch (input.type) {
      case 'overview':
        return NextResponse.json(await getOverview(supabase, admin.orgId, input.event_id))
      case 'ticket_types':
        return NextResponse.json(await getTicketTypes(supabase, eventIds, input.limit, input.offset))
      case 'campaigns':
        return NextResponse.json(await getCampaigns(supabase, eventIds, input.limit, input.offset))
      case 'promo_codes':
        return NextResponse.json(await getPromoCodes(supabase, eventIds, input.limit, input.offset))
      case 'sales':
        return NextResponse.json(await getSales(supabase, eventIds, input.limit, input.offset))
      case 'analytics':
        return NextResponse.json(await getAnalytics(supabase, eventIds))
      case 'social_performance':
        return NextResponse.json(
          await getSocialPerformance(supabase, admin.orgId, input.event_id),
        )
      case 'referrals':
        return NextResponse.json(await getReferrals(supabase, eventIds, input.limit, input.offset))
    }
  } catch (error) {
    return routeError('GET', error)
  }
})

/** Compat → TIX-103 command service (prefer POST /api/admin/ticketing/commands). */
export const POST = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    return await runTicketingMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: await request.json(),
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    return routeError('POST', error)
  }
})

export const PATCH = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    return await runTicketingMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: await request.json(),
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    return routeError('PATCH', error)
  }
})

export const DELETE = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const id = z.string().uuid().parse(body.id || new URL(request.url).searchParams.get('id'))
    const reason =
      typeof body.reason === 'string' && body.reason.trim().length >= 3
        ? body.reason.trim()
        : 'admin delete ticket type'
    return await runTicketingMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: { action: 'delete_ticket_type', id, reason },
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    return routeError('DELETE', error)
  }
})
