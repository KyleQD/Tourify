import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { hasEventPermission } from '../../_lib/event-permissions'
import { resolveEventReference } from '../../_lib/event-reference'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: eventParam } = await context.params
  return withAuth(async (_req, { supabase, user }) => {
    try {
      const reference = await resolveEventReference(supabase as any, eventParam)
      if (!reference) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      const canViewFinances = await hasEventPermission({
        supabase,
        eventId: reference.id,
        userId: user.id,
        ownerUserId: reference.ownerUserId,
        permissionName: 'EDIT_EVENT_LOGISTICS',
      })
      if (!canViewFinances) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

      const [txResult, budgetResult, ticketResult] = await Promise.allSettled([
        supabase
          .from('financial_transactions')
          .select('*')
          .eq('event_id', reference.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('budgets')
          .select('*')
          .eq('event_id', reference.id),
        supabase
          .from('ticket_sales')
          .select('quantity, total_amount, payment_status')
          .eq('event_id', reference.id)
          .eq('payment_status', 'completed'),
      ])

      const transactions = txResult.status === 'fulfilled' ? (txResult.value.data || []) : []
      const budgets = budgetResult.status === 'fulfilled' ? (budgetResult.value.data || []) : []
      const ticketSales = ticketResult.status === 'fulfilled' ? (ticketResult.value.data || []) : []

      const ticketRevenue = ticketSales.reduce((sum: number, t: any) => sum + (Number(t.total_amount) || 0), 0)
      const ticketsSold = ticketSales.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0)

      const income = transactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const expenses = transactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)

      const totalAllocated = budgets.reduce((sum: number, b: any) => sum + (Number(b.allocated_amount) || 0), 0)
      const totalSpent = budgets.reduce((sum: number, b: any) => sum + (Number(b.spent_amount) || 0), 0)

      return NextResponse.json({
        success: true,
        summary: {
          ticketRevenue,
          ticketsSold,
          otherIncome: income,
          totalExpenses: expenses,
          netProfit: ticketRevenue + income - expenses,
          totalAllocated,
          totalSpent,
          budgetRemaining: totalAllocated - totalSpent,
        },
        transactions,
        budgets,
      })
    } catch (err) {
      console.error('[event finances GET]', err)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}
