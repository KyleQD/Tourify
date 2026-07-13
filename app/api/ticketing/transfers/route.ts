import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { revokeAndReissueCredential } from '@/lib/ticketing/issuance'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { notifyTransferAccepted, notifyTransferRequested } from '@/lib/ticketing/notifications'

const createSchema = z.object({
  ticket_id: z.string().uuid(),
  to_user_id: z.string().uuid().optional(),
  to_email: z.string().email().optional(),
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
    if (!parsed.to_user_id && !parsed.to_email)
      return NextResponse.json({ error: 'to_user_id or to_email required' }, { status: 400 })

    const { data: ticket } = await supabase
      .from('tickets')
      .select('*, ticket_types(is_transferable)')
      .eq('id', parsed.ticket_id)
      .eq('owner_user_id', auth.user.id)
      .maybeSingle()

    if (!ticket)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    if (ticket.status !== 'valid' && ticket.status !== 'assigned')
      return NextResponse.json({ error: 'Ticket is not transferable in its current state' }, { status: 400 })

    if ((ticket.ticket_types as any)?.is_transferable === false)
      return NextResponse.json({ error: 'This ticket type is not transferable' }, { status: 400 })

    const { data: transfer, error } = await supabase
      .from('ticket_transfers')
      .insert({
        ticket_id: parsed.ticket_id,
        from_user_id: auth.user.id,
        to_user_id: parsed.to_user_id ?? null,
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
      to_user_id: parsed.to_user_id ?? null,
      to_email: parsed.to_email ?? null,
      event_type: 'transfer_requested',
      actor_user_id: auth.user.id,
      metadata: { transfer_id: transfer.id },
    })

    if (parsed.to_user_id) {
      await notifyTransferRequested({
        toUserId: parsed.to_user_id,
        transferId: transfer.id,
      })
    }

    return NextResponse.json({ transfer }, { status: 201 })
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

    await supabase
      .from('tickets')
      .update({
        owner_user_id: auth.user.id,
        owner_email: auth.user.email,
        status: 'transferred',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transfer.ticket_id)

    const newToken = await revokeAndReissueCredential({
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

    await notifyTransferAccepted({
      fromUserId: transfer.from_user_id,
      toUserId: auth.user.id,
      transferId,
    })

    return NextResponse.json({ success: true, credential_token: newToken })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
