import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  assertOrgEntityReferences,
  OrgEntityAccessError,
} from '@/lib/admin/org-entity-access'
import {
  executeFinanceCommand,
  FinanceCommandError,
  getFinanceCommandErrorStatus,
} from '@/lib/admin/finance-command.service'
import { FinanceStatusTransitionError } from '@/lib/admin/finance-command-schemas'
import {
  executeFinanceCommandChain,
  resolveFinanceCommands,
} from '@/lib/admin/finance-command-compat'

const statusSchema = z.enum(['draft', 'finalized', 'paid'])

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

function mutationError(error: unknown) {
  if (error instanceof z.ZodError) return validationError(error)
  if (error instanceof OrgEntityAccessError) return entityError(error)
  const status = getFinanceCommandErrorStatus(error, 500)
  const code =
    error instanceof FinanceCommandError
      ? error.code
      : error instanceof FinanceStatusTransitionError
        ? error.code
        : 'command_failed'
  const message = error instanceof Error ? error.message : 'Settlement mutation failed'
  return NextResponse.json({ error: message, code }, { status })
}

async function runSettlementMutation(args: {
  supabase: any
  userId: string
  orgId: string
  capabilities: readonly import('@/lib/auth/admin-capabilities').AdminCapability[]
  body: unknown
  method: 'POST' | 'PATCH'
  idempotencyKey?: string | null
}) {
  const commands = await resolveFinanceCommands({
    supabase: args.supabase,
    orgId: args.orgId,
    body: args.body,
    method: args.method,
  })

  const result = await executeFinanceCommandChain({
    supabase: args.supabase,
    userId: args.userId,
    orgId: args.orgId,
    capabilities: args.capabilities,
    commands,
    idempotencyKey: args.idempotencyKey,
    execute: executeFinanceCommand,
  })

  const payload = result.data && typeof result.data === 'object'
    ? { success: true, ...(result.data as Record<string, unknown>) }
    : { success: true, data: result.data }

  return NextResponse.json(payload, { status: result.status || 200 })
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

/** Compat → FIN-103 command service (prefer POST /api/admin/finances/commands). */
export const POST = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    return await runSettlementMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: await request.json(),
      method: 'POST',
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    console.error('[Admin Settlements API] POST failed:', error)
    return mutationError(error)
  }
})

export const PATCH = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    return await runSettlementMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: await request.json(),
      method: 'PATCH',
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    console.error('[Admin Settlements API] PATCH failed:', error)
    return mutationError(error)
  }
})
