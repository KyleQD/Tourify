import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

export interface ClaimLinkClient {
  from: (table: string) => any
}

export function hashClaimToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function buildAppUrl(path: string): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://tourify.live').replace(/\/$/, '')
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

export async function createTicketClaimLink(params: {
  supabase: ClaimLinkClient
  orgId?: string | null
  eventId: string
  orderId?: string | null
  ticketId?: string | null
  recipientEmail?: string | null
  purpose?: 'claim' | 'transfer_accept' | 'manage'
  ttlHours?: number
  createdBy?: string | null
  metadata?: Record<string, unknown>
}): Promise<{ token: string; url: string; expiresAt: string }> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(
    Date.now() + Math.max(params.ttlHours ?? 168, 1) * 60 * 60 * 1000,
  ).toISOString()

  const { error } = await params.supabase.from('ticket_claim_links').insert({
    org_id: params.orgId ?? null,
    event_id: params.eventId,
    order_id: params.orderId ?? null,
    ticket_id: params.ticketId ?? null,
    recipient_email: params.recipientEmail ?? null,
    token_hash: hashClaimToken(token),
    purpose: params.purpose ?? 'claim',
    status: 'active',
    expires_at: expiresAt,
    created_by: params.createdBy ?? null,
    metadata: params.metadata ?? {},
  })

  if (error) throw new Error(error.message || 'Failed to create ticket claim link')

  return {
    token,
    url: buildAppUrl(`/tickets/claim/${token}`),
    expiresAt,
  }
}
