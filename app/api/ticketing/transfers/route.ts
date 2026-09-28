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

  if (error) {
    console.error('Failed to list transfers:', error)
    return NextResponse.json({ error: 'Failed to load transfers' }, { status: 500 })
  }
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

    if ((ticket.metadata as Record<string, unknown> | null)?.non_transferable === true)
      return NextResponse.json({ error: 'Guest list and crew admissions cannot be transferred' }, { status: 400 })

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

    if (error) {
      console.error('Failed to create transfer:', error)
      return NextResponse.json({ error: 'Failed to create transfer' }, { status: 500 })
    }

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

    if (action !== 'cancel' && transfer.expires_at && new Date(transfer.expires_at).getTime() <= Date.now()) {
      await supabase
        .from('ticket_transfers')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', transferId)
        .eq('status', 'pending')
      return NextResponse.json({ error: 'Transfer has expired' }, { status: 410 })
    }

    if (action === 'cancel') {
      if (transfer.from_user_id !== auth.user.id)
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const { data: canceled } = await supabase
        .from('ticket_transfers')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('id', transferId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (!canceled)
        return NextResponse.json({ error: 'Transfer is not pending' }, { status: 409 })

      await supabase.from('ticket_ownership_events').insert({
        ticket_id: transfer.ticket_id,
        event_type: 'transfer_canceled',
        actor_user_id: auth.user.id,
        metadata: { transfer_id: transferId },
      })

      return NextResponse.json({ success: true })
    }

    // SECURITY: for user-addressed transfers only the named recipient may act.
    // For email-addressed transfers the caller's VERIFIED account email must
    // match the destination email — otherwise any signed-in user could steal
    // the ticket by guessing/knowing the transfer id.
    const authEmail = String(auth.user.email || '').trim().toLowerCase()
    const targetEmail = String(transfer.to_email || '').trim().toLowerCase()
    if (transfer.to_user_id && transfer.to_user_id !== auth.user.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!transfer.to_user_id && (!targetEmail || !authEmail || targetEmail !== authEmail))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (action === 'decline') {
      const { data: declined } = await supabase
        .from('ticket_transfers')
        .update({ status: 'declined', updated_at: new Date().toISOString() })
        .eq('id', transferId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (!declined)
        return NextResponse.json({ error: 'Transfer is not pending' }, { status: 409 })

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

    // Claim ownership conditionally: only succeeds if the current owner is
    // still the original transferor (guards against concurrent cancel/re-transfer).
    const { data: claimedTicket } = await supabase
      .from('tickets')
      .update({
        owner_user_id: auth.user.id,
        owner_email: auth.user.email,
        status: 'transferred',
        updated_at: new Date().toISOString(),
      })
      .eq('id', transfer.ticket_id)
      .eq('owner_user_id', transfer.from_user_id)
      .select('id')
      .maybeSingle()

    if (!claimedTicket)
      return NextResponse.json({ error: 'Ticket is no longer transferable' }, { status: 409 })

    const newToken = await revokeAndReissueCredential({
      supabase,
      ticketId: transfer.ticket_id,
      reason: 'transfer_accepted',
    })

    await supabase
      .from('tickets')
      .update({ status: 'valid', updated_at: new Date().toISOString() })
      .eq('id', transfer.ticket_id)

    const { data: finalizedTransfer, error: finalizeError } = await supabase
      .from('ticket_transfers')
      .update({
        status: 'accepted',
        to_user_id: auth.user.id,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', transferId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (finalizeError || !finalizedTransfer) {
      console.error('Failed to finalize transfer:', finalizeError)
      // Compensate: restore original ownership so a lost race cannot leave
      // the ticket transferred without an accepted transfer record.
      await supabase
        .from('tickets')
        .update({
          owner_user_id: transfer.from_user_id,
          status: 'valid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.ticket_id)
        .eq('owner_user_id', auth.user.id)
      return NextResponse.json({ error: 'Transfer is not pending' }, { status: 409 })
    }

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
