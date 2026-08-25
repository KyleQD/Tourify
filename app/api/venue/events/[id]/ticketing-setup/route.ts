import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
  hasTicketingPermission,
  type TicketingPermission,
} from '@/lib/ticketing/permissions'
import { projectTicketTypePricing } from '@/lib/ticketing/pricing-projection'
import { deriveSaleState } from '@/lib/ticketing/sale-state'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'

export const dynamic = 'force-dynamic'

/**
 * VEN-151 — Event-scoped ticketing setup surface for the Venue workspace.
 *
 * GET    → config (secret-free), projected ticket types, canonical sale state
 *          and caller capabilities.
 * POST   → configure | upsert_type | archive_type | publish_sales |
 *          pause_sales — all server-authorized via the single permission
 *          catalog (VEN-149). Payout/Stripe destinations are finance-only and
 *          rejected here; they belong to the settlement/payout surface.
 */

type TicketTypeRow = {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number | string | null
  quantity_available: number | null
  quantity_sold: number | null
  max_per_customer: number | null
  sale_start: string | null
  sale_end: string | null
  category: string | null
  is_active: boolean | null
  is_complimentary?: boolean | null
  visibility?: string | null
  metadata: Record<string, unknown> | null
}

function feeConfigFrom(config: Record<string, unknown> | null) {
  return {
    platformFeeType: (config?.platform_fee_type as any) ?? 'flat_per_ticket',
    platformFeeAmount: Number(config?.platform_fee_amount ?? 1),
    processingFeePassthrough: config?.processing_fee_passthrough !== false,
    taxEnabled: Boolean(config?.tax_enabled),
    taxRate: Number(config?.tax_rate ?? 0),
  }
}

async function authorize(
  request: NextRequest,
  eventId: string,
  permission: TicketingPermission,
): Promise<{ auth: NonNullable<Awaited<ReturnType<typeof authenticateApiRequest>>>; supabase: any } | NextResponse> {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await (await import('@/lib/supabase/server')).createClient()
  const allowed = await hasTicketingPermission({ supabase, userId: auth.user.id, eventId, permission })
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { auth, supabase }
}

const SECRET_FIELDS = new Set(['payout_destination_account_id', 'stripe_connect_account_id'])

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params
  if (!z.string().uuid().safeParse(eventId).success)
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })

  const result = await authorize(_request, eventId, 'view_overview')
  if (result instanceof NextResponse) return result
  const { supabase } = result

  const [{ data: event }, { data: config }, typesResult, checkpointsResult] = await Promise.all([
    supabase.from('events_v2').select('id, title, status, start_at, end_at, capacity').eq('id', eventId).maybeSingle(),
    supabase.from('event_ticketing_config').select('*').eq('event_id', eventId).maybeSingle(),
    supabase.from('ticket_types').select('*').eq('event_id', eventId).order('priority_order', { ascending: true }),
    supabase.from('ticket_checkpoints').select('name, is_active').eq('event_id', eventId).order('name'),
  ])
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const types: TicketTypeRow[] = (typesResult.data || []) as TicketTypeRow[]
  const activeTypes = types.filter((t) => t.is_active !== false && t.visibility !== 'hidden')
  const feeConfig = feeConfigFrom(config as Record<string, unknown> | null)

  const totalInventory =
    activeTypes.reduce((sum, t) => sum + Number(t.quantity_available || 0), 0) || Number(event.capacity || 0)
  const totalSold = activeTypes.reduce((sum, t) => sum + Number(t.quantity_sold || 0), 0)
  const meta = (config?.metadata && typeof config.metadata === 'object' ? config.metadata : {}) as Record<string, unknown>

  const saleState = deriveSaleState({
    eventStatus: event.status,
    eventStartAt: event.start_at,
    eventEndAt: event.end_at,
    saleStart: config?.sale_start ?? null,
    saleEnd: config?.sale_end ?? null,
    ticketingEnabled: Boolean(config?.ticketing_enabled),
    salesPaused: meta.sales_paused === true,
    totalInventory,
    totalSold,
    activeTypeCount: activeTypes.length,
  })

  // Capability probe for UI affordances (hidden ≠ authorized; server re-checks).
  const capabilityPermissions: TicketingPermission[] = [
    'manage_ticket_types',
    'publish_sales',
    'view_attendee_contact',
    'process_refunds',
    'issue_comps',
    'manage_guestlist',
    'operate_box_office',
    'manage_grants',
  ]
  const capabilities: Record<string, boolean> = {}
  for (const permission of capabilityPermissions) {
    capabilities[permission] = await hasTicketingPermission({ supabase, userId: result.auth.user.id, eventId, permission })
  }

  const safeConfig = config
    ? Object.fromEntries(Object.entries(config as Record<string, unknown>).filter(([key]) => !SECRET_FIELDS.has(key)))
    : null

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      start_at: event.start_at,
      end_at: event.end_at,
      capacity: Number(event.capacity || 0),
    },
    config: safeConfig,
    ticket_types: types.map((t) => ({
      ...projectTicketTypePricing(t, feeConfig),
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      quantity_available: Number(t.quantity_available || 0),
      quantity_sold: Number(t.quantity_sold || 0),
      max_per_customer: t.max_per_customer,
      sale_start: t.sale_start,
      sale_end: t.sale_end,
      is_active: t.is_active !== false,
      is_complimentary: Boolean(t.is_complimentary),
      visibility: t.visibility || 'public',
    })),
    inventory: { total_inventory: totalInventory, total_sold: totalSold, available: Math.max(0, totalInventory - totalSold) },
    sale_state: saleState.state,
    sale_state_label: saleState.label,
    sale_state_reason: saleState.reason,
    checkpoints: ((checkpointsResult.data || []) as Array<{ name: string; is_active: boolean | null }>)
      .filter((row) => row.is_active !== false)
      .map((row) => row.name),
    capabilities,
  })
}

const configureSchema = z
  .object({
    ticketing_enabled: z.boolean().optional(),
    sales_visibility: z.enum(['public', 'private', 'invite_only', 'unlisted']).optional(),
    sale_start: z.string().datetime({ offset: true }).nullable().optional(),
    sale_end: z.string().datetime({ offset: true }).nullable().optional(),
    capacity: z.number().int().min(0).nullable().optional(),
    max_per_order: z.number().int().min(1).max(50).nullable().optional(),
    max_per_user: z.number().int().min(1).max(50).nullable().optional(),
    currency: z.string().length(3).optional(),
    refund_policy: z.string().max(500).optional(),
    transfer_policy: z.string().max(500).optional(),
    box_office_enabled: z.boolean().optional(),
    terms_text: z.string().max(4000).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No configuration changes supplied' })

const upsertTypeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(1000).nullable().optional(),
  price: z.number().min(0).max(100000),
  quantity_available: z.number().int().min(0).max(200000),
  max_per_customer: z.number().int().min(1).max(50).nullable().optional(),
  category: z
    .enum(['general', 'vip', 'premium', 'early_bird', 'student', 'senior', 'group', 'backstage'])
    .optional(),
  sale_start: z.string().datetime({ offset: true }).nullable().optional(),
  sale_end: z.string().datetime({ offset: true }).nullable().optional(),
  is_complimentary: z.boolean().optional(),
})

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('configure'), patch: configureSchema }),
  z.object({ action: z.literal('upsert_type'), type: upsertTypeSchema }),
  z.object({ action: z.literal('archive_type'), type_id: z.string().uuid() }),
  z.object({ action: z.literal('publish_sales') }),
  z.object({ action: z.literal('pause_sales') }),
  // VEN-159 — replace-all checkpoint registry for this event.
  z.object({
    action: z.literal('set_checkpoints'),
    checkpoints: z
      .array(z.string().trim().min(1).max(60))
      .max(20)
      .refine((names) => new Set(names.map((n) => n.toLowerCase())).size === names.length, {
        message: 'Checkpoint names must be unique',
      }),
  }),
])

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await ctx.params
  if (!z.string().uuid().safeParse(eventId).success)
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid payload' }, { status: 400 })

  const requiredPermission: TicketingPermission =
    parsed.data.action === 'publish_sales' || parsed.data.action === 'pause_sales' ? 'publish_sales' : 'manage_ticket_types'

  const result = await authorize(request, eventId, requiredPermission)
  if (result instanceof NextResponse) return result
  const { supabase, auth } = result

  const service = createServiceRoleClient()
  const nowIso = new Date().toISOString()

  if (parsed.data.action === 'configure') {
    const patch = parsed.data.patch as Record<string, unknown>
    if (Object.keys(patch).some((key) => SECRET_FIELDS.has(key)))
      return NextResponse.json({ error: 'Payout/stripe fields are managed by the finance surface only' }, { status: 400 })

    const { data: existing } = await supabase
      .from('event_ticketing_config')
      .select('metadata')
      .eq('event_id', eventId)
      .maybeSingle()

    const { data, error } = await service
      .from('event_ticketing_config')
      .upsert(
        {
          event_id: eventId,
          ...patch,
          created_by: auth.user.id,
          updated_at: nowIso,
        },
        { onConflict: 'event_id' },
      )
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    void existing
    return NextResponse.json({ config: Object.fromEntries(Object.entries(data).filter(([k]) => !SECRET_FIELDS.has(k))) })
  }

  if (parsed.data.action === 'upsert_type') {
    const t = parsed.data.type
    const payload: Record<string, unknown> = {
      event_id: eventId,
      name: t.name,
      description: t.description ?? null,
      price: t.price,
      quantity_available: t.quantity_available,
      max_per_customer: t.max_per_customer ?? null,
      category: t.category ?? 'general',
      sale_start: t.sale_start ?? null,
      sale_end: t.sale_end ?? null,
      is_complimentary: t.is_complimentary ?? false,
      updated_at: nowIso,
    }
    if (t.id) payload.id = t.id

    const { data, error } = await service.from('ticket_types').upsert(payload).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ticket_type: projectTicketTypePricing(data, feeConfigFrom(data.metadata)) }, { status: 201 })
  }

  if (parsed.data.action === 'archive_type') {
    const { error } = await service
      .from('ticket_types')
      .update({ is_active: false, updated_at: nowIso })
      .eq('id', parsed.data.type_id)
      .eq('event_id', eventId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (parsed.data.action === 'set_checkpoints') {
    const names = parsed.data.checkpoints.map((name) => name.replace(/\s+/g, ' ').trim()).filter(Boolean)
    await service.from('ticket_checkpoints').delete().eq('event_id', eventId)
    if (names.length > 0) {
      const { error } = await service.from('ticket_checkpoints').insert(
        names.map((name) => ({ event_id: eventId, name, created_by: auth.user.id })),
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, checkpoints: names })
  }

  // publish_sales / pause_sales — validate before mutating public state.
  const { data: config } = await service
    .from('event_ticketing_config')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle()
  const { data: activeTypes } = await service
    .from('ticket_types')
    .select('id, quantity_available, is_active, visibility')
    .eq('event_id', eventId)
    .eq('is_active', true)

  const publishable = (activeTypes || []).filter((t: any) => t.visibility !== 'hidden')
  if (parsed.data.action === 'publish_sales' && publishable.length === 0)
    return NextResponse.json({ error: 'Add at least one active ticket type before publishing sales.' }, { status: 422 })

  const meta = (config?.metadata && typeof config.metadata === 'object' ? { ...(config.metadata as object) } : {}) as Record<string, unknown>
  if (parsed.data.action === 'publish_sales') {
    delete meta.sales_paused
  } else {
    meta.sales_paused = true
  }

  const { error } = await service
    .from('event_ticketing_config')
    .upsert(
      {
        event_id: eventId,
        ticketing_enabled: true,
        metadata: meta,
        created_by: auth.user.id,
        updated_at: nowIso,
      },
      { onConflict: 'event_id' },
    )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await emitTicketAnalyticsEvent({
    supabase: service as any,
    eventName: parsed.data.action === 'publish_sales' ? 'ticket_sales_published' : 'ticket_sales_paused',
    eventId,
    actorUserId: auth.user.id,
  })

  return NextResponse.json({ success: true, sales_paused: parsed.data.action === 'pause_sales' })
}
