import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { requireAdminCapability } from '@/lib/auth/admin-context'
import { logAuditEvent } from '@/lib/audit'
import {
  assertOrgEntityReferences,
  OrgEntityAccessError,
} from '@/lib/admin/org-entity-access'

const dateString = z.string().max(64).refine(
  value => !Number.isNaN(Date.parse(value)),
  'Invalid date',
)
const optionalDate = z.preprocess(
  value => value === '' ? undefined : value,
  dateString.optional(),
)
const nullableDate = z.preprocess(
  value => value === '' ? null : value,
  dateString.optional().nullable(),
)

const paymentStatus = z.enum(['pending', 'paid', 'overdue', 'cancelled', 'refunded'])
const transactionCategory = z.enum([
  'ticket_revenue',
  'merchandise',
  'sponsorship',
  'appearance_fee',
  'other_income',
  'venue_rental',
  'equipment',
  'catering',
  'staff_pay',
  'marketing',
  'travel',
  'insurance',
  'permits',
  'production',
  'other_expense',
])
const incomeCategories = new Set([
  'ticket_revenue',
  'merchandise',
  'sponsorship',
  'appearance_fee',
  'other_income',
])

function categoryMatchesType(type: 'income' | 'expense', category: string) {
  return type === 'income' ? incomeCategories.has(category) : !incomeCategories.has(category)
}

const transactionFields = {
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  type: z.enum(['income', 'expense']),
  category: transactionCategory,
  amount: z.number().finite().nonnegative().max(1_000_000_000),
  description: z.string().trim().max(2_000).optional().nullable(),
  vendor_name: z.string().trim().max(240).optional().nullable(),
  receipt_url: z.string().url().max(2_048).optional().nullable(),
  payment_status: paymentStatus.default('pending'),
  payment_method: z.string().trim().max(120).optional().nullable(),
  payment_reference: z.string().trim().max(240).optional().nullable(),
  due_date: nullableDate,
}

const createTransactionSchema = z.object({
  action: z.literal('create_transaction'),
  ...transactionFields,
}).strict()

const createBudgetSchema = z.object({
  action: z.literal('create_budget'),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  category: z.string().trim().min(1).max(120),
  allocated_amount: z.number().finite().nonnegative().max(1_000_000_000),
  notes: z.string().trim().max(2_000).optional().nullable(),
}).strict().refine(value => Boolean(value.event_id || value.tour_id), {
  message: 'Budget must be tied to an event or tour',
  path: ['event_id'],
})

const createSchema = z.union([
  createTransactionSchema,
  createBudgetSchema,
])

const updateTransactionSchema = z.object({
  id: z.string().uuid(),
  table: z.literal('transaction'),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  type: transactionFields.type.optional(),
  category: transactionFields.category.optional(),
  amount: transactionFields.amount.optional(),
  description: transactionFields.description,
  vendor_name: transactionFields.vendor_name,
  receipt_url: transactionFields.receipt_url,
  payment_status: paymentStatus.optional(),
  payment_method: transactionFields.payment_method,
  payment_reference: transactionFields.payment_reference,
  due_date: nullableDate,
}).strict().refine(value => Object.keys(value).some(key => !['id', 'table'].includes(key)), {
  message: 'At least one update field is required',
})

const updateBudgetSchema = z.object({
  id: z.string().uuid(),
  table: z.literal('budget'),
  event_id: z.string().uuid().optional().nullable(),
  tour_id: z.string().uuid().optional().nullable(),
  category: z.string().trim().min(1).max(120).optional(),
  allocated_amount: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  spent_amount: z.number().finite().nonnegative().max(1_000_000_000).optional(),
  notes: z.string().trim().max(2_000).optional().nullable(),
}).strict().refine(value => Object.keys(value).some(key => !['id', 'table'].includes(key)), {
  message: 'At least one update field is required',
})

const updateSchema = z.union([
  updateTransactionSchema,
  updateBudgetSchema,
])

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

function normalizeRangeBoundary(value: string | undefined, endOfDay = false) {
  if (!value) return null
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
    : new Date(value)
  return parsed.toISOString()
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

      const transactions = transactionsResult.data || []
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
      return NextResponse.json({ success: true, transactions: data || [], total: count || 0 })
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

export const POST = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const input = createSchema.parse(await request.json())
    await assertOrgEntityReferences(supabase, admin.orgId, {
      eventId: input.event_id,
      tourId: input.tour_id,
    })

    if (input.action === 'create_transaction') {
      if (!categoryMatchesType(input.type, input.category)) {
        return NextResponse.json(
          { error: 'Transaction category does not match its type.', code: 'category_type_mismatch' },
          { status: 422 },
        )
      }
      if (['paid', 'refunded'].includes(input.payment_status)) {
        const denied = requireAdminCapability(admin, 'finance.pay')
        if (denied) return denied
      }
      const { action: _action, ...values } = input
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({ ...values, org_id: admin.orgId, created_by: user.id })
        .select()
        .single()
      if (error || !data) {
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
      }
      await logAuditEvent({
        actorId: user.id,
        orgId: admin.orgId,
        action: 'create',
        entityType: 'transaction',
        entityId: data.id,
        newValues: { type: input.type, amount: input.amount, category: input.category },
      })
      return NextResponse.json({ success: true, transaction: data }, { status: 201 })
    }

    const { action: _action, ...values } = input
    const { data, error } = await supabase
      .from('budgets')
      .insert({ ...values, org_id: admin.orgId, created_by: user.id })
      .select()
      .single()
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
    }
    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'create',
      entityType: 'budget',
      entityId: data.id,
      newValues: { category: input.category, allocated_amount: input.allocated_amount },
    })
    return NextResponse.json({ success: true, budget: data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) return entityError(error)
    console.error('[Admin Finances API] POST failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const input = updateSchema.parse(await request.json())
    if (
      input.table === 'transaction'
      && input.payment_status
      && ['paid', 'refunded'].includes(input.payment_status)
    ) {
      const denied = requireAdminCapability(admin, 'finance.pay')
      if (denied) return denied
    }
    const { id, table, ...updates } = input
    const tableName = table === 'budget' ? 'budgets' : 'financial_transactions'
    const currentColumns = table === 'budget'
      ? 'id,event_id,tour_id,updated_at'
      : 'id,event_id,tour_id,type,category,payment_status,updated_at'
    const { data: current, error: currentError } = await supabase
      .from(tableName)
      .select(currentColumns)
      .eq('id', id)
      .eq('org_id', admin.orgId)
      .maybeSingle()

    if (currentError) {
      return NextResponse.json({ error: 'Failed to load record' }, { status: 500 })
    }
    if (!current) {
      return NextResponse.json({ error: 'Record not found', code: 'entity_not_found' }, { status: 404 })
    }
    if (table === 'transaction' && current.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Paid transactions are immutable.', code: 'transaction_already_paid' },
        { status: 409 },
      )
    }
    if (table === 'transaction') {
      const effectiveType = input.table === 'transaction' && input.type
        ? input.type
        : current.type
      const effectiveCategory = input.table === 'transaction' && input.category
        ? input.category
        : current.category
      if (!categoryMatchesType(effectiveType, effectiveCategory)) {
        return NextResponse.json(
          { error: 'Transaction category does not match its type.', code: 'category_type_mismatch' },
          { status: 422 },
        )
      }
    }

    const eventId = Object.prototype.hasOwnProperty.call(updates, 'event_id')
      ? updates.event_id
      : current.event_id
    const tourId = Object.prototype.hasOwnProperty.call(updates, 'tour_id')
      ? updates.tour_id
      : current.tour_id
    if (table === 'budget' && !eventId && !tourId) {
      return NextResponse.json(
        { error: 'Budget must remain linked to an event or tour', code: 'budget_scope_required' },
        { status: 422 },
      )
    }
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId, tourId })

    const { data, error } = await supabase
      .from(tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', admin.orgId)
      .eq('updated_at', current.updated_at)
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json(
        { error: 'Record changed while it was being updated.', code: 'finance_conflict' },
        { status: 409 },
      )
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'update',
      entityType: table,
      entityId: id,
      oldValues: current,
      newValues: updates,
    })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) return entityError(error)
    console.error('[Admin Finances API] PATCH failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withAdminCapability('finance.manage', async (request, { supabase, user, admin }) => {
  try {
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get('id'))
    const { data, error } = await supabase
      .from('financial_transactions')
      .delete()
      .eq('id', id)
      .eq('org_id', admin.orgId)
      .select('id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
    if (!data) {
      return NextResponse.json({ error: 'Transaction not found', code: 'entity_not_found' }, { status: 404 })
    }

    await logAuditEvent({
      actorId: user.id,
      orgId: admin.orgId,
      action: 'delete',
      entityType: 'transaction',
      entityId: id,
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    console.error('[Admin Finances API] DELETE failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
