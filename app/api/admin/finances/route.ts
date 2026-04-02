import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createTransactionSchema = z.object({
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  amount: z.number().min(0),
  description: z.string().optional(),
  vendor_name: z.string().optional(),
  receipt_url: z.string().url().optional(),
  payment_status: z.enum(['pending', 'paid', 'overdue', 'cancelled', 'refunded']).default('pending'),
  payment_method: z.string().optional(),
  payment_reference: z.string().optional(),
  due_date: z.string().optional(),
})

const createBudgetSchema = z.object({
  event_id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
  category: z.string().min(1),
  allocated_amount: z.number().min(0),
  notes: z.string().optional(),
})

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const eventId = searchParams.get('event_id')
    const tourId = searchParams.get('tour_id')

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_entity_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const orgId = profile?.current_entity_id

    if (type === 'overview') {
      const [txResult, budgetResult] = await Promise.allSettled([
        (() => {
          let q = supabase.from('financial_transactions').select('*')
          if (orgId) q = q.eq('org_id', orgId)
          if (eventId) q = q.eq('event_id', eventId)
          if (tourId) q = q.eq('tour_id', tourId)
          return q.order('created_at', { ascending: false }).limit(100)
        })(),
        (() => {
          let q = supabase.from('budgets').select('*')
          if (orgId) q = q.eq('org_id', orgId)
          if (eventId) q = q.eq('event_id', eventId)
          if (tourId) q = q.eq('tour_id', tourId)
          return q
        })(),
      ])

      const transactions = txResult.status === 'fulfilled' ? (txResult.value.data || []) : []
      const budgets = budgetResult.status === 'fulfilled' ? (budgetResult.value.data || []) : []

      const totalIncome = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const totalExpenses = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const totalAllocated = budgets.reduce((sum: number, b: any) => sum + (Number(b.allocated_amount) || 0), 0)
      const totalSpent = budgets.reduce((sum: number, b: any) => sum + (Number(b.spent_amount) || 0), 0)

      const pendingPayments = transactions.filter((t: any) => t.payment_status === 'pending').length
      const overduePayments = transactions.filter((t: any) => t.payment_status === 'overdue').length

      return NextResponse.json({
        success: true,
        overview: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          totalAllocated,
          totalSpent,
          budgetRemaining: totalAllocated - totalSpent,
          pendingPayments,
          overduePayments,
          transactionCount: transactions.length,
        },
        recentTransactions: transactions.slice(0, 10),
        budgets,
      })
    }

    if (type === 'transactions') {
      const limit = parseInt(searchParams.get('limit') || '50')
      const offset = parseInt(searchParams.get('offset') || '0')
      const txType = searchParams.get('tx_type')
      const status = searchParams.get('status')

      let q = supabase.from('financial_transactions').select('*', { count: 'exact' })
      if (orgId) q = q.eq('org_id', orgId)
      if (eventId) q = q.eq('event_id', eventId)
      if (tourId) q = q.eq('tour_id', tourId)
      if (txType) q = q.eq('type', txType)
      if (status) q = q.eq('payment_status', status)

      const { data, error, count } = await q
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
      }

      return NextResponse.json({ success: true, transactions: data || [], total: count || 0 })
    }

    if (type === 'budgets') {
      let q = supabase.from('budgets').select('*')
      if (orgId) q = q.eq('org_id', orgId)
      if (eventId) q = q.eq('event_id', eventId)
      if (tourId) q = q.eq('tour_id', tourId)

      const { data, error } = await q.order('created_at', { ascending: false })

      if (error) {
        return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
      }

      return NextResponse.json({ success: true, budgets: data || [] })
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error) {
    console.error('[Admin Finances API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const { action, ...data } = body

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_entity_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const orgId = profile?.current_entity_id
    if (!orgId) {
      return NextResponse.json({ error: 'No organization context found' }, { status: 400 })
    }

    if (action === 'create_transaction') {
      const validated = createTransactionSchema.parse(data)

      const { data: tx, error } = await supabase
        .from('financial_transactions')
        .insert({
          ...validated,
          org_id: orgId,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[Admin Finances API] Create transaction error:', error)
        return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
      }

      return NextResponse.json({ success: true, transaction: tx })
    }

    if (action === 'create_budget') {
      const validated = createBudgetSchema.parse(data)

      if (!validated.event_id && !validated.tour_id) {
        return NextResponse.json({ error: 'Budget must be tied to an event or tour' }, { status: 400 })
      }

      const { data: budget, error } = await supabase
        .from('budgets')
        .insert({
          ...validated,
          org_id: orgId,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('[Admin Finances API] Create budget error:', error)
        return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
      }

      return NextResponse.json({ success: true, budget })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Admin Finances API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  try {
    const body = await request.json()
    const { id, table, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const tableName = table === 'budget' ? 'budgets' : 'financial_transactions'
    const { data, error } = await supabase
      .from(tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Admin Finances API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[Admin Finances API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
