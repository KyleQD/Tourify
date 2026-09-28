import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  assertOrgEntityReferences,
  OrgEntityAccessError,
} from '@/lib/admin/org-entity-access'
import { projectFinanceTransactionRows } from '@/lib/admin/finance-field-projection'
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

const dateString = z.string().max(64).refine(
  value => !Number.isNaN(Date.parse(value)),
  'Invalid date',
)
const optionalDate = z.preprocess(
  value => value === '' ? undefined : value,
  dateString.optional(),
)

const paymentStatus = z.enum(['pending', 'paid', 'overdue', 'cancelled', 'refunded'])

const querySchema = z.object({
  type: z.enum(['overview', 'transactions', 'budgets']).default('overview'),
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  from: optionalDate,
  to: optionalDate,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  tx_type: z.enum(['income', 'expense']).optional(),
  status: paymentStatus.optional(),
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
  const message = error instanceof Error ? error.message : 'Finance mutation failed'
  return NextResponse.json({ error: message, code }, { status })
}

function normalizeRangeBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(value)
  return parsed.toISOString()
}

async function runFinanceMutation(args: {
  supabase: any
  userId: string
  orgId: string
  capabilities: readonly import('@/lib/auth/admin-capabilities').AdminCapability[]
  body: unknown
  method: 'POST' | 'PATCH' | 'DELETE'
  deleteId?: string | null
  idempotencyKey?: string | null
}) {
  const commands = await resolveFinanceCommands({
    supabase: args.supabase,
    orgId: args.orgId,
    body: args.body,
    method: args.method,
    deleteId: args.deleteId,
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
    const raw = Object.fromEntries(new URL(request.url).searchParams.entries())
    const input = querySchema.parse(raw)
    await assertOrgEntityReferences(supabase, admin.orgId, {
      eventId: input.event_id,
      tourId: input.tour_id,
    })

    if (input.type === 'overview') {
      const from = normalizeRangeBoundary(input.from)
      const to = normalizeRangeBoundary(input.to, true)
      let recentTransactionsQuery = supabase
        .from('financial_transactions')
        .select('*')
        .eq('org_id', admin.orgId)
      if (input.event_id) recentTransactionsQuery = recentTransactionsQuery.eq('event_id', input.event_id)
      if (input.tour_id) recentTransactionsQuery = recentTransactionsQuery.eq('tour_id', input.tour_id)
      if (from) recentTransactionsQuery = recentTransactionsQuery.gte('created_at', from)
      if (to) recentTransactionsQuery = recentTransactionsQuery.lte('created_at', to)

      let budgetsQuery = supabase.from('budgets').select('*').eq('org_id', admin.orgId)
      if (input.event_id) budgetsQuery = budgetsQuery.eq('event_id', input.event_id)
      if (input.tour_id) budgetsQuery = budgetsQuery.eq('tour_id', input.tour_id)

      const [overviewResult, transactionsResult, budgetsResult] = await Promise.all([
        supabase.rpc('get_finance_overview', {
          p_org_id: admin.orgId,
          p_event_id: input.event_id || null,
          p_tour_id: input.tour_id || null,
          p_from: from,
          p_to: to,
        }),
        recentTransactionsQuery.order('created_at', { ascending: false }).limit(10),
        budgetsQuery.order('created_at', { ascending: false }).limit(200),
      ])

      if (overviewResult.error || transactionsResult.error || budgetsResult.error) {
        return NextResponse.json(
          { error: 'Financial overview is temporarily unavailable.', code: 'finance_unavailable' },
          { status: 503 },
        )
      }

      const transactions = projectFinanceTransactionRows({
        rows: (transactionsResult.data || []) as Record<string, unknown>[],
        capabilities: admin.capabilities,
      })
      const budgets = budgetsResult.data || []
      const totals = Array.isArray(overviewResult.data)
        ? overviewResult.data[0]
        : overviewResult.data
      if (!totals) {
        return NextResponse.json(
          { error: 'Financial overview is temporarily unavailable.', code: 'finance_unavailable' },
          { status: 503 },
        )
      }
      const totalIncome = Number(totals.total_income) || 0
      const totalExpenses = Number(totals.total_expenses) || 0
      const totalAllocated = Number(totals.total_allocated) || 0
      const totalSpent = Number(totals.total_spent) || 0

      return NextResponse.json({
        success: true,
        overview: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          totalAllocated,
          totalSpent,
          budgetRemaining: totalAllocated - totalSpent,
          pendingPayments: Number(totals.pending_payments) || 0,
          overduePayments: Number(totals.overdue_payments) || 0,
          transactionCount: Number(totals.transaction_count) || 0,
        },
        recentTransactions: transactions,
        budgets,
      })
    }

    if (input.type === 'transactions') {
      let query = supabase
        .from('financial_transactions')
        .select('*', { count: 'exact' })
        .eq('org_id', admin.orgId)
      if (input.event_id) query = query.eq('event_id', input.event_id)
      if (input.tour_id) query = query.eq('tour_id', input.tour_id)
      if (input.tx_type) query = query.eq('type', input.tx_type)
      if (input.status) query = query.eq('payment_status', input.status)

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(input.offset, input.offset + input.limit - 1)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to fetch transactions.', code: 'finance_unavailable' },
          { status: 503 },
        )
      }
      return NextResponse.json({
        success: true,
        transactions: projectFinanceTransactionRows({
          rows: (data || []) as Record<string, unknown>[],
          capabilities: admin.capabilities,
        }),
        total: count || 0,
      })
    }

    let query = supabase.from('budgets').select('*').eq('org_id', admin.orgId)
    if (input.event_id) query = query.eq('event_id', input.event_id)
    if (input.tour_id) query = query.eq('tour_id', input.tour_id)
    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch budgets.', code: 'finance_unavailable' },
        { status: 503 },
      )
    }
    return NextResponse.json({ success: true, budgets: data || [] })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) return entityError(error)
    console.error('[Admin Finances API] GET failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

/** Compat → FIN-103 command service (prefer POST /api/admin/finances/commands). */
export const POST = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    return await runFinanceMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: await request.json(),
      method: 'POST',
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    console.error('[Admin Finances API] POST failed:', error)
    return mutationError(error)
  }
})

export const PATCH = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    return await runFinanceMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body: await request.json(),
      method: 'PATCH',
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    console.error('[Admin Finances API] PATCH failed:', error)
    return mutationError(error)
  }
})

export const DELETE = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    return await runFinanceMutation({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
      body,
      method: 'DELETE',
      deleteId: url.searchParams.get('id'),
      idempotencyKey: request.headers.get('idempotency-key') || request.headers.get('x-idempotency-key'),
    })
  } catch (error) {
    console.error('[Admin Finances API] DELETE failed:', error)
    return mutationError(error)
  }
})
