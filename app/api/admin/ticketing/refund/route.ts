import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getStripeOrNull } from '@/lib/stripe'

export const POST = withAdminAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()
    const { sale_id, reason, partial_amount } = body

    if (!sale_id) return NextResponse.json({ error: 'sale_id is required' }, { status: 400 })

    const supabase = createServiceRoleClient()

    // Fetch the sale
    const { data: sale, error: fetchError } = await supabase
      .from('ticket_sales')
      .select('id, payment_reference, total_amount, quantity, ticket_type_id, payment_status, buyer_name, buyer_email')
      .eq('id', sale_id)
      .maybeSingle()

    if (fetchError || !sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    if (sale.payment_status === 'refunded') {
      return NextResponse.json({ error: 'This sale has already been refunded' }, { status: 400 })
    }

    if (sale.payment_status !== 'completed') {
      return NextResponse.json({ error: 'Only completed sales can be refunded' }, { status: 400 })
    }

    const refundAmount = partial_amount ? Math.round(Number(partial_amount) * 100) : undefined

    // Attempt Stripe refund
    const stripe = getStripeOrNull()
    if (stripe && sale.payment_reference) {
      try {
        const refundParams: any = { payment_intent: sale.payment_reference }
        if (refundAmount) refundParams.amount = refundAmount
        if (reason) refundParams.reason = 'requested_by_customer'

        await stripe.refunds.create(refundParams)
      } catch (stripeErr: any) {
        console.error('[Admin Ticketing Refund] Stripe error:', stripeErr)
        return NextResponse.json({
          error: `Stripe refund failed: ${stripeErr.message}`,
          stripe_error: stripeErr.code,
        }, { status: 422 })
      }
    }

    // Update sale status
    const { error: updateError } = await supabase
      .from('ticket_sales')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sale_id)

    if (updateError) {
      console.error('[Admin Ticketing Refund] Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update sale status' }, { status: 500 })
    }

    // Decrement quantity_sold on ticket_type
    if (sale.ticket_type_id && sale.quantity) {
      const { data: tt } = await supabase
        .from('ticket_types')
        .select('quantity_sold')
        .eq('id', sale.ticket_type_id)
        .single()

      if (tt) {
        await supabase
          .from('ticket_types')
          .update({
            quantity_sold: Math.max(0, (tt.quantity_sold ?? 0) - sale.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sale.ticket_type_id)
      }
    }

    // Write financial transaction record for refund
    const refundAmt = partial_amount ? Number(partial_amount) : Number(sale.total_amount)
    await supabase.from('financial_transactions').insert({
      type: 'expense',
      category: 'refund',
      amount: refundAmt,
      description: `Ticket refund — ${sale.buyer_name || sale.buyer_email || 'customer'}`,
      payment_status: 'paid',
      created_by: user.id,
    })

    return NextResponse.json({
      success: true,
      message: `Refund of $${refundAmt} processed successfully`,
      sale_id,
    })
  } catch (err: any) {
    console.error('[Admin Ticketing Refund] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
