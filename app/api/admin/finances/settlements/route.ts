import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { requireAdminCapability } from '@/lib/auth/admin-context'
import { logAuditEvent } from '@/lib/audit'
import {
  assertOrgEntityReferences,
  OrgEntityAccessError,
} from '@/lib/admin/org-entity-access'

const statusSchema = z.enum(['draft', 'finalized', 'paid'])
const moneySchema = z.number().finite().nonnegative().max(1_000_000_000)

const settlementFields = {
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  total_gross_revenue: moneySchema,
  total_expenses: moneySchema,
  artist_payout: moneySchema,
  venue_payout: moneySchema,
  promoter_payout: moneySchema,
  deal_type: z.enum(['guarantee', 'vs_door', 'percentage']).optional().nullable(),
  guarantee_amount: moneySchema.optional().nullable(),
  door_percentage: z.number().finite().min(0).max(100).optional().nullable(),
  notes: z.string().trim().max(4_000).optional().nullable(),
}

const createSchema = z.object({
  ...settlementFields,
  total_gross_revenue: settlementFields.total_gross_revenue.default(0),
  total_expenses: settlementFields.total_expenses.default(0),
  artist_payout: settlementFields.artist_payout.default(0),
  venue_payout: settlementFields.venue_payout.default(0),
  promoter_payout: settlementFields.promoter_payout.default(0),
  status: z.literal('draft').default('draft'),
}).strict().refine(value => Boolean(value.event_id || value.tour_id), {
  message: 'Settlement must be linked to an event or tour',
  path: ['event_id'],
})

const updateSchema = z.object({
  id: z.string().uuid(),
  event_id: settlementFields.event_id,
  tour_id: settlementFields.tour_id,
  total_gross_revenue: settlementFields.total_gross_revenue.optional(),
  total_expenses: settlementFields.total_expenses.optional(),
  artist_payout: settlementFields.artist_payout.optional(),
  venue_payout: settlementFields.venue_payout.optional(),
  promoter_payout: settlementFields.promoter_payout.optional(),
  deal_type: settlementFields.deal_type,
  guarantee_amount: settlementFields.guarantee_amount,
  door_percentage: settlementFields.door_percentage,
  notes: settlementFields.notes,
  status: statusSchema.optional(),
}).strict().refine(value => Object.keys(value).some(key => key !== 'id'), {
  message: 'At least one update field is required',
})

const querySchema = z.object({
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  status: statusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
})

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Validation error', code: 'validation_error', details: error.errors },
    { status: 400 },
  )
}

function entityError(error: OrgEntityAccessError) {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status },
  )
}

export const GET = withAdminCapability('finance.view', async (request, { supabase, admin }) => {
  try {
    const input = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()))
    await assertOrgEntityReferences(supabase, admin.orgId, {
      eventId: input.event_id,
      tourId: input.tour_id,
    })

    let query = supabase
      .from('settlements')
      .select('*', { count: 'exact' })
      .eq('org_id', admin.orgId)

    if (input.event_id) query = query.eq('event_id', input.event_id)
    if (input.tour_id) query = query.eq('tour_id', input.tour_id)
    if (input.status) query = query.eq('status', input.status)

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch settlements.', code: 'finance_unavailable' },
        { status: 503 },
      )
    }

    return NextResponse.json({ success: true, settlements: data || [], total: count || 0 })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) return entityError(error)
    console.error('[Admin Settlements API] GET failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const input = createSchema.parse(await request.json())
    await assertOrgEntityReferences(supabase, admin.orgId, {
      eventId: input.event_id,
      tourId: input.tour_id,
    })

    const { data, error } = await supabase
      .from('settlements')
      .insert({ ...input, org_id: admin.orgId })
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 })
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'create',
      entityType: 'settlement',
      entityId: data.id,
      newValues: { status: data.status },
    })
    return NextResponse.json({ success: true, settlement: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) return entityError(error)
    console.error('[Admin Settlements API] POST failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const input = updateSchema.parse(await request.json())
    const { id, ...updates } = input

    const { data: current, error: currentError } = await supabase
      .from('settlements')
      .select('id,event_id,tour_id,status')
      .eq('id', id)
      .eq('org_id', admin.orgId)
      .maybeSingle()

    if (currentError) {
      return NextResponse.json({ error: 'Failed to load settlement' }, { status: 500 })
    }
    if (!current) {
      return NextResponse.json(
        { error: 'Settlement not found', code: 'entity_not_found' },
        { status: 404 },
      )
    }
    if (current.status === 'paid') {
      return NextResponse.json(
        { error: 'Paid settlements are immutable.', code: 'settlement_already_paid' },
        { status: 409 },
      )
    }
    if (current.status === 'finalized' && updates.status !== 'paid') {
      return NextResponse.json(
        { error: 'Finalized settlements can only transition to paid.', code: 'settlement_finalized' },
        { status: 409 },
      )
    }

    const eventId = Object.prototype.hasOwnProperty.call(updates, 'event_id')
      ? updates.event_id
      : current.event_id
    const tourId = Object.prototype.hasOwnProperty.call(updates, 'tour_id')
      ? updates.tour_id
      : current.tour_id
    if (!eventId && !tourId) {
      return NextResponse.json(
        { error: 'Settlement must remain linked to an event or tour', code: 'settlement_scope_required' },
        { status: 422 },
      )
    }
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId, tourId })

    if (updates.status === 'paid' && current.status !== 'finalized') {
      return NextResponse.json(
        { error: 'A settlement must be finalized before payment.', code: 'invalid_status_transition' },
        { status: 409 },
      )
    }
    if (updates.status === 'draft' && current.status === 'finalized') {
      return NextResponse.json(
        { error: 'A finalized settlement cannot be returned to draft.', code: 'invalid_status_transition' },
        { status: 409 },
      )
    }
    if (updates.status === 'finalized' && current.status === 'draft') {
      const denied = requireAdminCapability(admin, 'finance.approve')
      if (denied) return denied
    }
    if (updates.status === 'paid') {
      const denied = requireAdminCapability(admin, 'finance.pay')
      if (denied) return denied
    }

    const patchData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    if (updates.status === 'paid') {
      patchData.settled_at = new Date().toISOString()
      patchData.settled_by = user.id
    }

    const { data, error } = await supabase
      .from('settlements')
      .update(patchData)
      .eq('id', id)
      .eq('org_id', admin.orgId)
      .eq('status', current.status)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Settlement changed while it was being updated.', code: 'settlement_conflict' },
        { status: 409 },
      )
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: updates.status === 'paid' ? 'settle' : 'update',
      entityType: 'settlement',
      entityId: id,
      oldValues: { status: current.status },
      newValues: updates,
    })
    return NextResponse.json({ success: true, settlement: data })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) return entityError(error)
    console.error('[Admin Settlements API] PATCH failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
