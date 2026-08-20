import { NextRequest, NextResponse } from 'next/server'

import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(_request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceRoleClient()

  const { data: order, error } = await service
    .from('ticket_sales')
    .select(`
      *,
      ticket_types(id, name, category, refund_policy, is_transferable),
      events_v2(id, title, start_at, end_at, venue_id)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const { data: tickets } = await service
    .from('tickets')
    .select(`
      id,
      status,
      owner_user_id,
      owner_email,
      owner_name,
      issued_at,
      unit_price,
      is_complimentary,
      ticket_credentials(id, token, status, issued_at)
    `)
    .eq('order_id', id)
    .order('issued_at', { ascending: true })

  const ownsOrder = order.buyer_user_id === auth.user.id
  const ownedTickets = (tickets || []).filter((ticket: any) => ticket.owner_user_id === auth.user.id)
  if (!ownsOrder && ownedTickets.length === 0) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    order,
    tickets: (ownsOrder ? tickets || [] : ownedTickets).map((ticket: any) => ({
      ...ticket,
      ticket_credentials: undefined,
    })),
  })
}
