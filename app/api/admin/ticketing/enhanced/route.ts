import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { logAuditEvent } from '@/lib/audit'
import {
  assertOrgEntityReferences,
  listOrgEventIds,
  OrgEntityAccessError,
} from '@/lib/admin/org-entity-access'
import {
  assertDateOrder,
  assertPercentageDiscount,
  ticketingCreateSchema,
  ticketingQuerySchema,
  TicketingValidationError,
  updateTicketTypeSchema,
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

  console.error(`[Enhanced Admin Ticketing API] ${scope} failed:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

async function assertTicketTypesForEvent(
  supabase: any,
  eventId: string,
  ids: string[] | undefined,
) {
  const uniqueIds = Array.from(new Set(ids || []))
  if (uniqueIds.length === 0) return

  const { data, error } = await supabase
    .from('ticket_types')
    .select('id')
    .eq('event_id', eventId)
    .in('id', uniqueIds)

  if (error) throw new TicketingQueryError('Unable to verify applicable ticket types.')
  if ((data || []).length !== uniqueIds.length) {
    throw new TicketingValidationError(
      'Every applicable ticket type must belong to the selected event.',
    )
  }
}

async function assertCampaignForEvent(
  supabase: any,
  eventId: string,
  campaignId: string | null | undefined,
) {
  if (!campaignId) return
  const { data, error } = await supabase
    .from('ticket_campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) throw new TicketingQueryError('Unable to verify the campaign.')
  if (!data) {
    throw new TicketingValidationError('Campaign does not belong to the selected event.')
  }
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

export const POST = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    const input = ticketingCreateSchema.parse(await request.json())
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId: input.event_id })

    if (input.action === 'create_ticket_type') {
      assertDateOrder(input.sale_start, input.sale_end, 'Sale')
      if (input.max_per_customer && input.max_per_customer > input.quantity_available) {
        throw new TicketingValidationError(
          'Maximum tickets per customer cannot exceed available inventory.',
        )
      }

      const { action: _action, ...values } = input
      const { data, error } = await supabase
        .from('ticket_types')
        .insert({
          ...values,
          ticket_code: `TKT-${randomUUID()}`,
          quantity_sold: 0,
        })
        .select('*')
        .single()

      if (error || !data) throw new TicketingQueryError('Failed to create ticket type.')
      await logAuditEvent({
        actorId: user.id,
        orgId: admin.orgId,
        action: 'create',
        entityType: 'ticket',
        entityId: data.id,
        newValues: { event_id: input.event_id, kind: 'ticket_type' },
      })
      return NextResponse.json({ ticket_type: data }, { status: 201 })
    }

    if (input.action === 'create_campaign') {
      assertDateOrder(input.start_date, input.end_date, 'Campaign')
      assertPercentageDiscount(input.discount_type, input.discount_value)
      await assertTicketTypesForEvent(
        supabase,
        input.event_id,
        input.applicable_ticket_types,
      )

      const { action: _action, ...values } = input
      const { data, error } = await supabase
        .from('ticket_campaigns')
        .insert({ ...values, current_uses: 0, is_active: true, created_by: user.id })
        .select('*')
        .single()

      if (error || !data) throw new TicketingQueryError('Failed to create campaign.')
      await logAuditEvent({
        actorId: user.id,
        orgId: admin.orgId,
        action: 'create',
        entityType: 'ticket',
        entityId: data.id,
        newValues: { event_id: input.event_id, kind: 'campaign' },
      })
      return NextResponse.json({ campaign: data }, { status: 201 })
    }

    if (input.action === 'create_promo_code') {
      const startDate = input.start_date || new Date().toISOString()
      const endDate = input.end_date || input.expires_at
      assertDateOrder(startDate, endDate, 'Promo code')
      assertPercentageDiscount(input.discount_type, input.discount_value)
      await Promise.all([
        assertCampaignForEvent(supabase, input.event_id, input.campaign_id),
        assertTicketTypesForEvent(supabase, input.event_id, input.applicable_ticket_types),
      ])

      const code = input.code.toUpperCase()
      const { data: existing, error: existingError } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('event_id', input.event_id)
        .eq('code', code)
        .maybeSingle()
      if (existingError) throw new TicketingQueryError('Unable to verify promo code uniqueness.')
      if (existing) throw new TicketingValidationError('Promo code already exists for this event.')

      const {
        action: _action,
        expires_at: _expiresAt,
        start_date: _startDate,
        end_date: _endDate,
        ...values
      } = input
      const { data, error } = await supabase
        .from('promo_codes')
        .insert({
          ...values,
          code,
          start_date: startDate,
          end_date: endDate,
          current_uses: 0,
          is_active: true,
          created_by: user.id,
        })
        .select('*')
        .single()

      if (error || !data) throw new TicketingQueryError('Failed to create promo code.')
      await logAuditEvent({
        actorId: user.id,
        orgId: admin.orgId,
        action: 'create',
        entityType: 'ticket',
        entityId: data.id,
        newValues: { event_id: input.event_id, kind: 'promo_code', code },
      })
      return NextResponse.json({ promo_code: data }, { status: 201 })
    }

    const rows = Array.from({ length: input.count }, () => ({
      referrer_id: user.id,
      referred_email: '',
      event_id: input.event_id,
      referral_code: `REF-${randomUUID()}`,
      discount_amount: input.discount_amount,
    }))
    const { data, error } = await supabase
      .from('ticket_referrals')
      .insert(rows)
      .select('*')

    if (error || !data || data.length !== rows.length) {
      throw new TicketingQueryError('Failed to generate referral codes.')
    }
    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'create',
      entityType: 'ticket',
      newValues: { event_id: input.event_id, kind: 'referral_codes', count: data.length },
    })
    return NextResponse.json({ referral_codes: data }, { status: 201 })
  } catch (error) {
    return routeError('POST', error)
  }
})

export const PATCH = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    const input = updateTicketTypeSchema.parse(await request.json())
    const { data: current, error: currentError } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', input.id)
      .maybeSingle()

    if (currentError) throw new TicketingQueryError('Unable to load ticket type.')
    if (!current) {
      return NextResponse.json(
        { error: 'Ticket type not found', code: 'entity_not_found' },
        { status: 404 },
      )
    }
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId: current.event_id })

    const saleStart = Object.prototype.hasOwnProperty.call(input, 'sale_start')
      ? input.sale_start
      : current.sale_start
    const saleEnd = Object.prototype.hasOwnProperty.call(input, 'sale_end')
      ? input.sale_end
      : current.sale_end
    assertDateOrder(saleStart, saleEnd, 'Sale')

    const available = input.quantity_available ?? current.quantity_available
    const maxPerCustomer = Object.prototype.hasOwnProperty.call(input, 'max_per_customer')
      ? input.max_per_customer
      : current.max_per_customer
    if (available < (current.quantity_sold || 0)) {
      throw new TicketingValidationError('Available quantity cannot be lower than tickets sold.')
    }
    if (maxPerCustomer && maxPerCustomer > available) {
      throw new TicketingValidationError(
        'Maximum tickets per customer cannot exceed available inventory.',
      )
    }

    const { action: _action, id, ...updates } = input
    const { data, error } = await supabase
      .from('ticket_types')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('event_id', current.event_id)
      .eq('updated_at', current.updated_at)
      .select('*')
      .maybeSingle()

    if (error) throw new TicketingQueryError('Failed to update ticket type.')
    if (!data) {
      return NextResponse.json(
        { error: 'Ticket type changed while it was being updated.', code: 'ticketing_conflict' },
        { status: 409 },
      )
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'update',
      entityType: 'ticket',
      entityId: id,
      oldValues: current,
      newValues: updates,
    })
    return NextResponse.json({ ticket_type: data })
  } catch (error) {
    return routeError('PATCH', error)
  }
})

export const DELETE = withAdminCapability('ticketing.manage', async (request, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const id = z.string().uuid().parse(body.id || new URL(request.url).searchParams.get('id'))
    const { data: current, error: currentError } = await supabase
      .from('ticket_types')
      .select('id,event_id,quantity_sold,updated_at')
      .eq('id', id)
      .maybeSingle()

    if (currentError) throw new TicketingQueryError('Unable to load ticket type.')
    if (!current) {
      return NextResponse.json(
        { error: 'Ticket type not found', code: 'entity_not_found' },
        { status: 404 },
      )
    }
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId: current.event_id })

    let softDeleted = Number(current.quantity_sold) > 0
    if (!softDeleted) {
      const { error } = await supabase
        .from('ticket_types')
        .delete()
        .eq('id', id)
        .eq('event_id', current.event_id)
        .eq('updated_at', current.updated_at)

      if (error?.code === '23503') softDeleted = true
      else if (error) throw new TicketingQueryError('Failed to delete ticket type.')
    }

    if (softDeleted) {
      const { data, error } = await supabase
        .from('ticket_types')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('event_id', current.event_id)
        .eq('updated_at', current.updated_at)
        .select('id')
        .maybeSingle()
      if (error || !data) throw new TicketingQueryError('Failed to deactivate ticket type.')
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'delete',
      entityType: 'ticket',
      entityId: id,
      oldValues: { event_id: current.event_id, quantity_sold: current.quantity_sold },
      newValues: softDeleted ? { is_active: false } : undefined,
    })
    return NextResponse.json({ success: true, soft_deleted: softDeleted })
  } catch (error) {
    return routeError('DELETE', error)
  }
})
