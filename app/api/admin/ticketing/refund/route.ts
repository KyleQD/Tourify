import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { assertOrgEntityReferences, OrgEntityAccessError } from '@/lib/admin/org-entity-access'
import { executeServiceRoleJob, ServiceRoleJobError } from '@/lib/supabase/service-role-job'
import { getStripeOrNull } from '@/lib/stripe'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'
import { refundOrderTickets } from '@/lib/ticketing/finalize'
import { writeRefundLedger } from '@/lib/ticketing/ledger'
import { logAuditEvent } from '@/lib/audit'

/** Align with TIX-103 refund_sale — reason is mandatory. */
const refundSchema = z.object({
  sale_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(1_000),
  partial_amount: z.coerce.number().finite().positive().optional(),
  ticket_ids: z.array(z.string().uuid()).min(1).max(500).optional(),
}).strict()

function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: 'Validation error', code: 'validation_error', details: error.errors },
    { status: 400 },
  )
}

function stripeIdempotencyKey(
  saleId: string,
  amount: number,
  ticketIds: string[] | undefined,
) {
  const digest = createHash('sha256')
    .update(JSON.stringify({ amount, ticketIds: [...(ticketIds || [])].sort() }))
    .digest('hex')
    .slice(0, 32)
  return `tourify-refund:${saleId}:${digest}`
}

export const POST = withAdminCapability('ticketing.refund', async (request, { supabase, user, admin }) => {
  try {
    const input = refundSchema.parse(await request.json())
    const { data: scopedSale, error: scopedSaleError } = await supabase
      .from('ticket_sales')
      .select('id,event_id')
      .eq('id', input.sale_id)
      .maybeSingle()

    if (scopedSaleError) {
      return NextResponse.json({ error: 'Unable to load sale' }, { status: 503 })
    }
    if (!scopedSale) {
      return NextResponse.json(
        { error: 'Sale not found', code: 'entity_not_found' },
        { status: 404 },
      )
    }
    await assertOrgEntityReferences(supabase, admin.orgId, { eventId: scopedSale.event_id })

    // SEC-109: service role only via named job with verified org + reason + target revalidation.
    return await executeServiceRoleJob(
      {
        orgId: admin.orgId,
        reason: input.reason?.trim() || 'admin ticketing refund',
        moduleId: 'admin.ticketing.refund',
        target: { eventId: scopedSale.event_id, saleId: input.sale_id },
      },
      async (service) => {
        const { data: sale, error: saleError } = await service
          .from('ticket_sales')
          .select(`
            id,
            event_id,
            ticket_type_id,
            payment_reference,
            total_amount,
            quantity,
            payment_status,
            buyer_name,
            buyer_email,
            metadata
          `)
          .eq('id', input.sale_id)
          .eq('event_id', scopedSale.event_id)
          .maybeSingle()

        if (saleError || !sale) {
          return NextResponse.json(
            { error: 'Sale not found', code: 'entity_not_found' },
            { status: 404 },
          )
        }
        if (sale.payment_status === 'refunded' || sale.metadata?.refund) {
          return NextResponse.json(
            { error: 'This sale has already been refunded', code: 'already_refunded' },
            { status: 409 },
          )
        }
        if (!['completed', 'paid'].includes(sale.payment_status)) {
          return NextResponse.json(
            { error: 'Only completed sales can be refunded', code: 'sale_not_refundable' },
            { status: 422 },
          )
        }

        const totalAmount = Number(sale.total_amount)
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
          return NextResponse.json(
            { error: 'Sale has no refundable balance', code: 'sale_not_refundable' },
            { status: 422 },
          )
        }
        const uniqueTicketIds = input.ticket_ids
          ? Array.from(new Set(input.ticket_ids))
          : undefined
        if (input.ticket_ids && uniqueTicketIds?.length !== input.ticket_ids.length) {
          return NextResponse.json(
            { error: 'Duplicate ticket IDs are not allowed', code: 'duplicate_ticket_ids' },
            { status: 422 },
          )
        }

        const v2Enabled = isTicketingV2Enabled()
        if (uniqueTicketIds?.length && !v2Enabled) {
          return NextResponse.json(
            { error: 'Partial ticket refunds require ticketing v2', code: 'partial_refund_unavailable' },
            { status: 422 },
          )
        }

        if (uniqueTicketIds?.length) {
          const { count, error } = await service
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('order_id', sale.id)
            .in('id', uniqueTicketIds)
          if (error) return NextResponse.json({ error: 'Unable to verify tickets' }, { status: 503 })
          if (count !== uniqueTicketIds.length) {
            return NextResponse.json(
              { error: 'Every ticket must belong to the selected sale', code: 'ticket_sale_mismatch' },
              { status: 422 },
            )
          }
        }

        const proratedAmount = uniqueTicketIds?.length
          ? totalAmount * (uniqueTicketIds.length / Math.max(Number(sale.quantity), 1))
          : totalAmount
        const refundAmount = Math.round((input.partial_amount ?? proratedAmount) * 100) / 100
        if (refundAmount > totalAmount) {
          return NextResponse.json(
            { error: 'Refund amount cannot exceed the sale total', code: 'refund_amount_exceeded' },
            { status: 422 },
          )
        }
        if (refundAmount < totalAmount && !uniqueTicketIds?.length) {
          return NextResponse.json(
            { error: 'A partial refund must identify the refunded tickets', code: 'ticket_ids_required' },
            { status: 422 },
          )
        }

        const refundAmountCents = Math.round(refundAmount * 100)
        const stripe = getStripeOrNull()
        if (stripe && sale.payment_reference) {
          try {
            await stripe.refunds.create(
              {
                payment_intent: sale.payment_reference,
                amount: refundAmountCents,
                reason: 'requested_by_customer',
                metadata: {
                  sale_id: sale.id,
                  actor_user_id: user.id,
                  reason: (input.reason || '').slice(0, 500),
                },
              },
              {
                idempotencyKey: stripeIdempotencyKey(sale.id, refundAmount, uniqueTicketIds),
              },
            )
          } catch (error: any) {
            console.error('[Admin Ticketing Refund] Stripe error:', error)
            return NextResponse.json(
              { error: 'Payment processor refund failed', code: error?.code || 'stripe_refund_failed' },
              { status: 422 },
            )
          }
        }

        if (v2Enabled) {
          await refundOrderTickets({
            supabase: service as any,
            orderId: sale.id,
            actorUserId: user.id,
            refundAmount,
            ticketIds: uniqueTicketIds,
          })
        } else {
          const { data: updatedSale, error: updateError } = await service
            .from('ticket_sales')
            .update({
              payment_status: 'refunded',
              metadata: {
                ...(sale.metadata || {}),
                refund: {
                  amount: refundAmount,
                  reason: input.reason || null,
                  actor_user_id: user.id,
                  at: new Date().toISOString(),
                },
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', sale.id)
            .eq('event_id', sale.event_id)
            .in('payment_status', ['completed', 'paid'])
            .select('id')
            .maybeSingle()

          if (updateError || !updatedSale) {
            throw new Error('Sale changed while the refund was being processed')
          }

          const { error: inventoryError } = await service.rpc('decrement_ticket_quantity_sold', {
            p_ticket_type_id: sale.ticket_type_id,
            p_quantity: Number(sale.quantity) || 0,
          })
          if (inventoryError) throw new Error('Failed to restore ticket inventory')

          await writeRefundLedger({
            supabase: service as any,
            orgId: admin.orgId,
            eventId: sale.event_id,
            orderId: sale.id,
            createdBy: user.id,
            refundAmount,
            paymentReference: sale.payment_reference,
            description: input.reason || undefined,
          })
        }

        await logAuditEvent({
          actorId: user.id,
          orgId: admin.orgId,
          action: 'refund',
          entityType: 'ticket',
          entityId: sale.id,
          oldValues: { payment_status: sale.payment_status, total_amount: totalAmount },
          newValues: {
            refund_amount: refundAmount,
            ticket_ids: uniqueTicketIds || [],
            reason: input.reason || null,
          },
        })

        return NextResponse.json({
          success: true,
          message: `Refund of $${refundAmount.toFixed(2)} processed successfully`,
          sale_id: sale.id,
          refund_amount: refundAmount,
        })
      },
    )
  } catch (error) {
    if (error instanceof z.ZodError) return validationError(error)
    if (error instanceof OrgEntityAccessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      )
    }
    if (error instanceof ServiceRoleJobError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === 'org_not_found' || error.code === 'target_org_mismatch' ? 404 : 403 },
      )
    }
    console.error('[Admin Ticketing Refund] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Refund could not be completed', code: 'refund_failed' },
      { status: 500 },
    )
  }
})
