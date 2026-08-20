import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { hashClaimToken } from '@/lib/ticketing/claim-links'
import { revokeAndReissueCredential } from '@/lib/ticketing/issuance'

const claimSchema = z.object({
  token: z.string().trim().min(20),
}).strict()

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Sign in to claim tickets', code: 'AUTH_REQUIRED' }, { status: 401 })
  }

  try {
    const input = claimSchema.parse(await request.json())
    const service = createServiceRoleClient()
    const tokenHash = hashClaimToken(input.token)

    const { data: claim, error } = await service
      .from('ticket_claim_links')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (error || !claim) {
      return NextResponse.json({ error: 'Claim link not found', code: 'NOT_FOUND' }, { status: 404 })
    }
    if (claim.status !== 'active') {
      return NextResponse.json({ error: 'Claim link is no longer active', code: 'CLAIM_INACTIVE' }, { status: 409 })
    }
    if (claim.expires_at && new Date(claim.expires_at).getTime() < Date.now()) {
      await service
        .from('ticket_claim_links')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', claim.id)
      return NextResponse.json({ error: 'Claim link expired', code: 'CLAIM_EXPIRED' }, { status: 410 })
    }

    const expectedEmail = String(claim.recipient_email || '').toLowerCase()
    const userEmail = String(auth.user.email || '').toLowerCase()
    if (expectedEmail && userEmail && expectedEmail !== userEmail) {
      return NextResponse.json({ error: 'This claim link belongs to another email', code: 'EMAIL_MISMATCH' }, { status: 403 })
    }

    const transferId = typeof claim.metadata?.transfer_id === 'string'
      ? claim.metadata.transfer_id
      : null
    const isTransferClaim = claim.purpose === 'transfer_accept' && Boolean(transferId)

    let transfer: any = null
    if (isTransferClaim) {
      const { data: loadedTransfer } = await service
        .from('ticket_transfers')
        .select('*')
        .eq('id', transferId)
        .maybeSingle()
      transfer = loadedTransfer
      if (!transfer || transfer.status !== 'pending') {
        return NextResponse.json({ error: 'Transfer is no longer pending', code: 'TRANSFER_INACTIVE' }, { status: 409 })
      }
      if (transfer.expires_at && new Date(transfer.expires_at).getTime() < Date.now()) {
        await service
          .from('ticket_transfers')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', transfer.id)
        return NextResponse.json({ error: 'Transfer link expired', code: 'TRANSFER_EXPIRED' }, { status: 410 })
      }
    }

    let ticketQuery = service
      .from('tickets')
      .select('id, owner_user_id, event_id, order_id, ticket_type_id, org_id')
      .eq('event_id', claim.event_id)

    if (claim.ticket_id) ticketQuery = ticketQuery.eq('id', claim.ticket_id)
    else ticketQuery = ticketQuery.eq('order_id', claim.order_id)

    const { data: tickets, error: ticketError } = await ticketQuery
    if (ticketError || !tickets?.length) {
      return NextResponse.json({ error: 'No claimable tickets found', code: 'NO_TICKETS' }, { status: 404 })
    }

    const alreadyOwnedByOther = tickets.some((ticket: any) => {
      if (isTransferClaim) return ticket.owner_user_id !== transfer.from_user_id
      return ticket.owner_user_id && ticket.owner_user_id !== auth.user.id
    })
    if (alreadyOwnedByOther) {
      return NextResponse.json({ error: 'One or more tickets are already claimed', code: 'ALREADY_CLAIMED' }, { status: 409 })
    }

    const ticketIds = tickets.map((ticket: any) => ticket.id)
    const now = new Date().toISOString()
    await service
      .from('tickets')
      .update({
        owner_user_id: auth.user.id,
        owner_email: auth.user.email,
        status: 'valid',
        updated_at: now,
      })
      .in('id', ticketIds)

    if (isTransferClaim) {
      await service
        .from('ticket_transfers')
        .update({
          status: 'accepted',
          to_user_id: auth.user.id,
          accepted_at: now,
          updated_at: now,
        })
        .eq('id', transfer.id)

      await revokeAndReissueCredential({
        supabase: service as any,
        ticketId: transfer.ticket_id,
        reason: 'transfer_claimed',
      })

      const ticket = tickets[0] as any
      await service.from('ticketing_inventory_ledger').insert([
        {
          org_id: ticket.org_id ?? claim.org_id ?? null,
          event_id: ticket.event_id,
          ticket_type_id: ticket.ticket_type_id,
          movement_type: 'transfer_out',
          quantity: 1,
          source_entity_type: 'transfer',
          source_entity_id: transfer.id,
          actor_user_id: auth.user.id,
          reason: 'transfer_claimed',
          idempotency_key: `transfer:${transfer.id}:claim:out`,
        },
        {
          org_id: ticket.org_id ?? claim.org_id ?? null,
          event_id: ticket.event_id,
          ticket_type_id: ticket.ticket_type_id,
          movement_type: 'transfer_in',
          quantity: 1,
          source_entity_type: 'transfer',
          source_entity_id: transfer.id,
          actor_user_id: auth.user.id,
          reason: 'transfer_claimed',
          idempotency_key: `transfer:${transfer.id}:claim:in`,
        },
      ])
    }

    await service
      .from('ticket_claim_links')
      .update({
        status: 'claimed',
        claimed_by: auth.user.id,
        claimed_at: now,
        updated_at: now,
      })
      .eq('id', claim.id)

    await service.from('ticket_ownership_events').insert(
      ticketIds.map((ticketId: string) => ({
        ticket_id: ticketId,
        to_user_id: auth.user.id,
        to_email: auth.user.email,
        event_type: 'assigned',
        actor_user_id: auth.user.id,
        metadata: { claim_link_id: claim.id, order_id: claim.order_id, transfer_id: transfer?.id ?? null },
      })),
    )

    await service.from('ticket_delivery_attempts').insert({
      org_id: claim.org_id ?? null,
      event_id: claim.event_id,
      order_id: claim.order_id,
      ticket_id: claim.ticket_id,
      recipient_email: claim.recipient_email,
      delivery_channel: 'claim_link',
      status: 'claimed',
      manage_url: `/tickets/orders/${claim.order_id}`,
      metadata: { claim_link_id: claim.id, claimed_by: auth.user.id },
    })

    return NextResponse.json({
      success: true,
      ticket_ids: ticketIds,
      order_id: claim.order_id,
      redirect_to: claim.order_id ? `/tickets/orders/${claim.order_id}` : '/tickets/my-tickets',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('[Ticket Claim API] Error:', error)
    return NextResponse.json({ error: 'Unable to claim tickets' }, { status: 500 })
  }
}
