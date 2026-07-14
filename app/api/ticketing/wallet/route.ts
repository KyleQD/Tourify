import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const ticketId = new URL(request.url).searchParams.get('ticket_id')

  if (ticketId) {
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        ticket_types(id, name, category, description),
        events_v2(id, title, start_at, end_at, venue_id),
        ticket_credentials!inner(id, token, status, issued_at)
      `)
      .eq('id', ticketId)
      .eq('owner_user_id', auth.user.id)
      .eq('ticket_credentials.status', 'active')
      .maybeSingle()

    if (error || !ticket)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

    return NextResponse.json({ ticket })
  }

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select(`
      id, status, is_complimentary, issued_at, event_id, ticket_type_id, order_id,
      ticket_types(id, name, category),
      events_v2(id, title, start_at),
      ticket_credentials(token, status)
    `)
    .eq('owner_user_id', auth.user.id)
    .in('status', ['valid', 'assigned', 'transferred', 'checked_in'])
    .order('issued_at', { ascending: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  const wallet = (tickets || []).map((t: any) => ({
    ...t,
    qr_token: (t.ticket_credentials || []).find((c: any) => c.status === 'active')?.token || null,
    ticket_credentials: undefined,
  }))

  return NextResponse.json({ tickets: wallet })
}
