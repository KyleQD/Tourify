import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createTicketClaimLink } from '@/lib/ticketing/claim-links'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { revokeAndReissueCredential } from '@/lib/ticketing/issuance'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { notifyTransferAccepted, notifyTransferRequested } from '@/lib/ticketing/notifications'

const createSchema = z.object({
  ticket_id: z.string().uuid(),
  to_email: z.string().email(),
  to_user_id: z.string().uuid().optional(),
  message: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ticket_transfers')
    .select('*, tickets(id, event_id, ticket_types(name), events_v2(title))')
    .or(`from_user_id.eq.${auth.user.id},to_user_id.eq.${auth.user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transfers: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const action = body.action || 'create'
  const supabase = await createClient()

  if (action === 'create') {
    const parsed = createSchema.parse(body)
    const service = createServiceRoleClient()

    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, ticket_types(is_transferable), events_v2(org_id, start_at)')
      .eq('id', parsed.ticket_id)
      .eq('owner_user_id', auth.user.id)
      .maybeSingle()

    if (!ticket)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (ticket.status !== 'valid' && ticket.status !== 'assigned')
      return NextResponse.json({ error: 'Ticket is not transferable in its current state' }, { status: 400 })

    if ((ticket.ticket_types as any)?.is_transferable === false)
      return NextResponse.json({ error: 'This ticket type is not transferable' }, { status: 400 })

    const eventStart = (ticket.events_v2 as any)?.start_at
    if (eventStart && Date.now() >= new Date(eventStart).getTime()) {
      return NextResponse.json({ error: 'Transfers are closed for this event' }, { status: 400 })
    }

    const { data: config } = await supabase
      .from('event_ticketing_config')
      .select('transfer_policy')
      .eq('event_id', ticket.event_id)
      .maybeSingle()
    if (String(config?.transfer_policy || '').toLowerCase().includes('no transfer')) {
      return NextResponse.json({ error: 'Transfers are disabled by event policy' }, { status: 400 })
    }

    const { data: existingPending } = await supabase
      .from('ticket_transfers')
      .select('id')
      .eq('ticket_id', parsed.ticket_id)
      .eq('status', 'pending')
      .maybeSingle()
    if (existingPending) {
      return NextResponse.json({ error: 'This ticket already has a pending transfer' }, { status: 409 })
    }

    const { data: profileMatch } = await service
      .from('profiles')
      .select('id, user_id')
      .eq('email', parsed.to_email.toLowerCase())
      .limit(1)
      .maybeSingle()
    const toUserId = parsed.to_user_id ?? profileMatch?.user_id ?? profileMatch?.id ?? null

    const { data: transfer, error } = await supabase
      .from('ticket_transfers')
      .insert({
        ticket_id: parsed.ticket_id,
        from_user_id: auth.user.id,
        to_user_id: toUserId,
        to_email: parsed.to_email ?? null,
        message: parsed.message ?? null,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.from('ticket_ownership_events').insert({
      ticket_id: parsed.ticket_id,
      from_user_id: auth.user.id,
      to_user_id: toUserId,
      to_email: parsed.to_email ?? null,
      event_type: 'transfer_requested',
      actor_user_id: auth.user.id,
      metadata: { transfer_id: transfer.id },
    })

    const claim = await createTicketClaimLink({
      supabase: service as any,
      orgId: (ticket.events_v2 as any)?.org_id ?? ticket.org_id ?? null,
      eventId: ticket.event_id,
      ticketId: parsed.ticket_id,
      recipientEmail: parsed.to_email,
      purpose: 'transfer_accept',
      ttlHours: 168,
      createdBy: auth.user.id,
      metadata: { transfer_id: transfer.id },
    })

    if (toUserId) {
      await notifyTransferRequested({
        toUserId,
        transferId: transfer.id,
      })
    }

    return NextResponse.json({ transfer, claim_url: claim.url }, { status: 201 })
  }

  if (action === 'accept' || action === 'decline' || action === 'cancel') {
    const transferId = z.string().uuid().parse(body.transfer_id)
    const { data: transfer } = await supabase
      .from('ticket_transfers')
      .select('*')
      .eq('id', transferId)
      .maybeSingle()

    if (!transfer)
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })

    if (transfer.status !== 'pending')
      return NextResponse.json({ error: 'Transfer is not pending' }, { status: 400 })

    if (transfer.expires_at && Date.now() > new Date(transfer.expires_at).getTime()) {
      await supabase
        .from('ticket_transfers')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', transferId)
      return NextResponse.json({ error: 'Transfer link expired' }, { status: 410 })
    }

    if (action === 'cancel') {
      if (transfer.from_user_id !== auth.user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      await supabase
        .from('ticket_transfers')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', transferId)

      await supabase.from('ticket_ownership_events').insert({
        ticket_id: transfer.ticket_id,
        event_type: 'transfer_canceled',
        actor_user_id: auth.user.id,
        metadata: { transfer_id: transferId },
      })

      return NextResponse.json({ success: true })
    }

    if (transfer.to_user_id && transfer.to_user_id !== auth.user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (transfer.to_email && auth.user.email && transfer.to_email.toLowerCase() !== auth.user.email.toLowerCase())
      return NextResponse.json({ error: 'This transfer belongs to another email' }, { status: 403 })

    if (action === 'decline') {
      await supabase
        .from('ticket_transfers')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', transferId)

      await supabase.from('ticket_ownership_events').insert({
        ticket_id: transfer.ticket_id,
        event_type: 'transfer_declined',
        actor_user_id: auth.user.id,
        metadata: { transfer_id: transferId },
      })

      return NextResponse.json({ success: true })
    }

    // accept
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', transfer.ticket_id)
      .maybeSingle()

    if (!ticket)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (ticket.owner_user_id !== transfer.from_user_id)
      return NextResponse.json({ error: 'Ticket ownership changed before transfer acceptance' }, { status: 409 })
    if (!['valid', 'assigned', 'transferred'].includes(ticket.status))
      return NextResponse.json({ error: 'Ticket is not transferable in its current state' }, { status: 400 })

    await supabase
      .from('tickets')
      .update({
        owner_user_id: auth.user.id,
        owner_email: auth.user.email,
        status: 'transferred',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transfer.ticket_id)

    await revokeAndReissueCredential({
      supabase,
      ticketId: transfer.ticket_id,
      reason: 'transfer_accepted',
    })

    await supabase
      .from('tickets')
      .update({ status: 'valid', updated_at: new Date().toISOString() })
      .eq('id', transfer.ticket_id)

    await supabase
      .from('ticket_transfers')
      .update({
        status: 'accepted',
        to_user_id: auth.user.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId)

    await supabase.from('ticket_ownership_events').insert({
      ticket_id: transfer.ticket_id,
      from_user_id: transfer.from_user_id,
      to_user_id: auth.user.id,
      event_type: 'transfer_accepted',
      actor_user_id: auth.user.id,
      metadata: { transfer_id: transferId },
    })

    await emitTicketAnalyticsEvent({
      supabase,
      eventName: 'ticket_transferred',
      eventId: ticket.event_id,
      ticketId: ticket.id,
      orderId: ticket.order_id,
      actorUserId: auth.user.id,
    })

    await createServiceRoleClient().from('ticketing_inventory_ledger').insert([
      {
        org_id: ticket.org_id ?? null,
        event_id: ticket.event_id,
        ticket_type_id: ticket.ticket_type_id,
        movement_type: 'transfer_out',
        quantity: 1,
        source_entity_type: 'transfer',
        source_entity_id: transferId,
        actor_user_id: auth.user.id,
        reason: 'transfer_accepted',
        idempotency_key: `transfer:${transferId}:out`,
      },
      {
        org_id: ticket.org_id ?? null,
        event_id: ticket.event_id,
        ticket_type_id: ticket.ticket_type_id,
        movement_type: 'transfer_in',
        quantity: 1,
        source_entity_type: 'transfer',
        source_entity_id: transferId,
        actor_user_id: auth.user.id,
        reason: 'transfer_accepted',
        idempotency_key: `transfer:${transferId}:in`,
      },
    ])

    await notifyTransferAccepted({
      fromUserId: transfer.from_user_id,
      toUserId: auth.user.id,
      transferId,
    })

    return NextResponse.json({ success: true, ticket_id: ticket.id, ticket_url: `/tickets/${ticket.id}` })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
