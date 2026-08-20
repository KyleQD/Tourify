import { generateCredentialToken } from '@/lib/ticketing/credentials'

/**
 * Issue individual admission tickets + opaque credentials after payment/comp.
 */

export interface IssuanceClient {
  from: (table: string) => any
}

export interface IssueTicketsParams {
  supabase: IssuanceClient
  orderId: string
  eventId: string
  ticketTypeId: string
  quantity: number
  unitPrice: number
  ownerUserId?: string | null
  ownerEmail?: string | null
  ownerName?: string | null
  isComplimentary?: boolean
  allocationId?: string | null
  actorUserId?: string | null
}

export interface IssuedTicket {
  ticketId: string
  credentialToken: string
}

export async function issueTicketsForOrder(params: IssueTicketsParams): Promise<IssuedTicket[]> {
  const {
    supabase,
    orderId,
    eventId,
    ticketTypeId,
    quantity,
    unitPrice,
    ownerUserId,
    ownerEmail,
    ownerName,
    isComplimentary = false,
    allocationId = null,
    actorUserId = null,
  } = params

  // Idempotent: if tickets already exist for this order, return them
  const { data: existing } = await supabase
    .from('tickets')
    .select('id')
    .eq('order_id', orderId)

  if (existing?.length) {
    const issued: IssuedTicket[] = []
    for (const row of existing) {
      const { data: cred } = await supabase
        .from('ticket_credentials')
        .select('token')
        .eq('ticket_id', row.id)
        .eq('status', 'active')
        .maybeSingle()
      issued.push({ ticketId: row.id, credentialToken: cred?.token || '' })
    }
    return issued
  }

  const issued: IssuedTicket[] = []

  for (let i = 0; i < quantity; i++) {
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        order_id: orderId,
        ticket_type_id: ticketTypeId,
        event_id: eventId,
        owner_user_id: ownerUserId ?? null,
        owner_email: ownerEmail ?? null,
        owner_name: ownerName ?? null,
        status: 'valid',
        is_complimentary: isComplimentary,
        allocation_id: allocationId,
        unit_price: unitPrice,
      })
      .select('id')
      .single()

    if (ticketError || !ticket)
      throw new Error(ticketError?.message || 'Failed to create ticket')

    const token = generateCredentialToken()
    const { error: credError } = await supabase
      .from('ticket_credentials')
      .insert({
        ticket_id: ticket.id,
        token,
        status: 'active',
      })

    if (credError)
      throw new Error(credError.message || 'Failed to create credential')

    await supabase.from('ticket_ownership_events').insert({
      ticket_id: ticket.id,
      to_user_id: ownerUserId ?? null,
      to_email: ownerEmail ?? null,
      event_type: 'issued',
      actor_user_id: actorUserId ?? ownerUserId ?? null,
      metadata: { order_id: orderId, complimentary: isComplimentary },
    })

    issued.push({ ticketId: ticket.id, credentialToken: token })
  }

  await supabase
    .from('ticket_sales')
    .update({
      issuance_status: 'issued',
      finalized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (allocationId) {
    const { data: allocation } = await supabase
      .from('ticket_allocations')
      .select('quantity_issued')
      .eq('id', allocationId)
      .maybeSingle()

    if (allocation) {
      await supabase
        .from('ticket_allocations')
        .update({
          quantity_issued: (allocation.quantity_issued ?? 0) + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', allocationId)
    }
  }

  if (isComplimentary) {
    const { data: eventRow } = await supabase
      .from('events_v2')
      .select('org_id')
      .eq('id', eventId)
      .maybeSingle()

    await supabase.from('ticketing_inventory_ledger').insert({
      org_id: eventRow?.org_id ?? null,
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      movement_type: 'comp',
      quantity,
      source_entity_type: allocationId ? 'allocation' : 'order',
      source_entity_id: allocationId ?? orderId,
      actor_user_id: actorUserId ?? ownerUserId ?? null,
      reason: allocationId ? 'allocation_comp_issued' : 'complimentary_ticket_issued',
      idempotency_key: `comp:${orderId}:${allocationId ?? 'order'}`,
    })
  }

  return issued
}

export async function revokeAndReissueCredential(params: {
  supabase: IssuanceClient
  ticketId: string
  reason: string
}): Promise<string> {
  const { supabase, ticketId, reason } = params

  const { data: active } = await supabase
    .from('ticket_credentials')
    .select('id')
    .eq('ticket_id', ticketId)
    .eq('status', 'active')
    .maybeSingle()

  const newToken = generateCredentialToken()
  const { data: created, error } = await supabase
    .from('ticket_credentials')
    .insert({
      ticket_id: ticketId,
      token: newToken,
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !created)
    throw new Error(error?.message || 'Failed to reissue credential')

  if (active?.id) {
    await supabase
      .from('ticket_credentials')
      .update({
        status: 'superseded',
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
        superseded_by: created.id,
      })
      .eq('id', active.id)
  }

  await supabase.from('ticket_ownership_events').insert({
    ticket_id: ticketId,
    event_type: 'reissued',
    metadata: { reason },
  })

  return newToken
}
