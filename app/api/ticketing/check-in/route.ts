import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { parseQrPayload } from '@/lib/ticketing/credentials'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'

const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

async function authorizeScanner(params: {
  supabase: ReturnType<typeof createServiceRoleClient>
  userId: string
  eventId: string
}): Promise<boolean> {
  if (await hasTicketingPermission({
    supabase: params.supabase,
    userId: params.userId,
    eventId: params.eventId,
    permission: 'scan_tickets',
  }))
    return true

  if (await hasTicketingPermission({
    supabase: params.supabase,
    userId: params.userId,
    eventId: params.eventId,
    permission: 'operate_box_office',
  }))
    return true

  // Legacy fallback when v2 flag off
  if (!isTicketingV2Enabled()) {
    const { data: eventScope } = await params.supabase
      .from('events_v2')
      .select('org_id')
      .eq('id', params.eventId)
      .maybeSingle()

    if (eventScope?.org_id) {
      const { data: membership } = await params.supabase
        .from('org_members')
        .select('id')
        .eq('org_id', eventScope.org_id)
        .eq('user_id', params.userId)
        .maybeSingle()
      if (membership?.id) return true
    }

    const { data: assignment } = await params.supabase
      .from('employment_assignments')
      .select('id')
      .eq('event_id', params.eventId)
      .eq('user_id', params.userId)
      .in('status', ['confirmed', 'active'])
      .maybeSingle()
    if (assignment?.id) return true
  }

  return false
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip))
    return NextResponse.json({ error: 'Too many check-in attempts. Please wait and try again.' }, { status: 429 })

  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const {
      qr_code,
      sale_id,
      ticket_id,
      event_id,
      checkpoint = 'main',
      reverse = false,
      checkin_id,
    } = body

    const supabase = createServiceRoleClient()

    // Reverse check-in
    if (reverse && checkin_id) {
      const { data: checkin } = await supabase
        .from('ticket_checkins')
        .select('*')
        .eq('id', checkin_id)
        .maybeSingle()

      if (!checkin)
        return NextResponse.json({ success: false, error: 'Check-in not found', code: 'NOT_FOUND' }, { status: 404 })

      const allowed = await hasTicketingPermission({
        supabase,
        userId: auth.user.id,
        eventId: checkin.event_id,
        permission: 'reverse_checkin',
      })
      if (!allowed)
        return NextResponse.json({ success: false, error: 'Reverse check-in permission required', code: 'FORBIDDEN' }, { status: 403 })

      await supabase
        .from('ticket_checkins')
        .update({
          reversed_at: new Date().toISOString(),
          reversed_by: auth.user.id,
          reverse_reason: body.reason || 'manual_reversal',
        })
        .eq('id', checkin_id)

      await supabase
        .from('tickets')
        .update({ status: 'valid', updated_at: new Date().toISOString() })
        .eq('id', checkin.ticket_id)
        .eq('status', 'checked_in')

      await emitTicketAnalyticsEvent({
        supabase,
        eventName: 'ticket_checkin_reversed',
        eventId: checkin.event_id,
        ticketId: checkin.ticket_id,
        actorUserId: auth.user.id,
      })

      return NextResponse.json({ success: true, message: 'Check-in reversed' })
    }

    // V2 credential-based scan
    if (isTicketingV2Enabled() && (qr_code || ticket_id)) {
      const token = qr_code ? parseQrPayload(String(qr_code)) : null
      let ticket: any = null
      let credential: any = null

      if (token) {
        const { data: cred } = await supabase
          .from('ticket_credentials')
          .select('id, ticket_id, status, token')
          .eq('token', token)
          .maybeSingle()

        if (!cred)
          return NextResponse.json({ success: false, error: 'Ticket not found', code: 'NOT_FOUND' }, { status: 404 })

        credential = cred
        if (cred.status !== 'active') {
          return NextResponse.json({
            success: false,
            error: cred.status === 'superseded' ? 'Ticket was reissued or transferred' : `Credential ${cred.status}`,
            code: cred.status === 'superseded' ? 'TRANSFERRED' : 'REVOKED',
          }, { status: 400 })
        }

        const { data: t } = await supabase
          .from('tickets')
          .select('*, ticket_types(name), events_v2(title, start_at)')
          .eq('id', cred.ticket_id)
          .maybeSingle()
        ticket = t
      } else if (ticket_id) {
        const { data: t } = await supabase
          .from('tickets')
          .select('*, ticket_types(name), events_v2(title, start_at)')
          .eq('id', ticket_id)
          .maybeSingle()
        ticket = t
        if (ticket) {
          const { data: cred } = await supabase
            .from('ticket_credentials')
            .select('id, status')
            .eq('ticket_id', ticket.id)
            .eq('status', 'active')
            .maybeSingle()
          if (!cred)
            return NextResponse.json({
              success: false,
              error: 'No active credential for this ticket',
              code: 'REVOKED',
            }, { status: 400 })
          credential = cred
        }
      }

      if (!ticket)
        return NextResponse.json({ success: false, error: 'Ticket not found', code: 'NOT_FOUND' }, { status: 404 })

      if (event_id && ticket.event_id !== event_id)
        return NextResponse.json({ success: false, error: 'Ticket does not belong to this event', code: 'WRONG_EVENT' }, { status: 400 })

      const eventId = event_id || ticket.event_id
      const allowed = await authorizeScanner({ supabase, userId: auth.user.id, eventId })
      if (!allowed)
        return NextResponse.json({ success: false, error: 'Check-in permission required', code: 'FORBIDDEN' }, { status: 403 })

      if (ticket.status === 'refunded')
        return NextResponse.json({ success: false, error: 'Ticket refunded', code: 'REFUNDED', owner_name: ticket.owner_name }, { status: 400 })

      if (ticket.status === 'canceled' || ticket.status === 'void')
        return NextResponse.json({ success: false, error: 'Ticket canceled', code: 'CANCELED', owner_name: ticket.owner_name }, { status: 400 })

      if (ticket.status === 'checked_in') {
        return NextResponse.json({
          success: false,
          error: 'Already checked in',
          code: 'ALREADY_CHECKED_IN',
          owner_name: ticket.owner_name,
          ticket_type: (ticket.ticket_types as any)?.name || 'General',
        }, { status: 409 })
      }

      const { data: existingCheckin } = await supabase
        .from('ticket_checkins')
        .select('id, created_at')
        .eq('ticket_id', ticket.id)
        .eq('checkpoint', checkpoint)
        .eq('result', 'valid')
        .is('reversed_at', null)
        .maybeSingle()

      if (existingCheckin) {
        return NextResponse.json({
          success: false,
          error: `Already checked in at ${checkpoint}`,
          code: 'ALREADY_CHECKED_IN',
          owner_name: ticket.owner_name,
          ticket_type: (ticket.ticket_types as any)?.name || 'General',
        }, { status: 409 })
      }

      const { data: checkin, error: checkinError } = await supabase
        .from('ticket_checkins')
        .insert({
          ticket_id: ticket.id,
          event_id: eventId,
          credential_id: credential?.id ?? null,
          scanned_by: auth.user.id,
          checkpoint,
          result: 'valid',
        })
        .select('id')
        .single()

      if (checkinError) {
        if (String(checkinError.code) === '23505') {
          return NextResponse.json({
            success: false,
            error: 'Already checked in',
            code: 'ALREADY_CHECKED_IN',
            owner_name: ticket.owner_name,
          }, { status: 409 })
        }
        return NextResponse.json({ success: false, error: 'Failed to check in ticket' }, { status: 500 })
      }

      await supabase
        .from('tickets')
        .update({ status: 'checked_in', updated_at: new Date().toISOString() })
        .eq('id', ticket.id)

      // Only mark the order checked-in when ALL admissions are checked in
      const { data: siblings } = await supabase
        .from('tickets')
        .select('id, status')
        .eq('order_id', ticket.order_id)

      const allCheckedIn = (siblings || []).every((t: any) => t.status === 'checked_in' || t.id === ticket.id)
      if (allCheckedIn) {
        await supabase
          .from('ticket_sales')
          .update({
            checked_in: true,
            checked_in_at: new Date().toISOString(),
            checked_in_by: auth.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticket.order_id)
      }

      await emitTicketAnalyticsEvent({
        supabase,
        eventName: 'ticket_scanned',
        eventId,
        ticketId: ticket.id,
        orderId: ticket.order_id,
        actorUserId: auth.user.id,
        metadata: { checkpoint },
      })

      const canViewContact = await hasTicketingPermission({
        supabase,
        userId: auth.user.id,
        eventId,
        permission: 'view_attendee_contact',
      })

      return NextResponse.json({
        success: true,
        message: 'Welcome!',
        checkin_id: checkin.id,
        buyer_name: ticket.owner_name || ticket.owner_email || 'Guest',
        buyer_email: canViewContact ? ticket.owner_email : undefined,
        ticket_type: (ticket.ticket_types as any)?.name || 'General',
        event_title: (ticket.events_v2 as any)?.title || '',
        checkpoint,
      })
    }

    // Legacy sale-level check-in path
    if (!qr_code && !sale_id)
      return NextResponse.json({ error: 'qr_code or sale_id is required' }, { status: 400 })

    let query = supabase
      .from('ticket_sales')
      .select('id, buyer_name, buyer_email, payment_status, checked_in, checked_in_at, ticket_type_id, event_id, ticket_types(name), events_v2(title, start_at)')

    if (qr_code)
      query = query.eq('qr_code', qr_code)
    else
      query = query.eq('id', sale_id)

    const { data: sale, error } = await (query as any).maybeSingle()

    if (error || !sale)
      return NextResponse.json({ success: false, error: 'Ticket not found', code: 'NOT_FOUND' }, { status: 404 })

    if (event_id && sale.event_id !== event_id)
      return NextResponse.json({ success: false, error: 'Ticket does not belong to this event', code: 'WRONG_EVENT' }, { status: 400 })

    const eventId = event_id || sale.event_id
    const allowed = await authorizeScanner({ supabase, userId: auth.user.id, eventId })
    if (!allowed)
      return NextResponse.json({ success: false, error: 'Check-in permission required', code: 'FORBIDDEN' }, { status: 403 })

    if (sale.payment_status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: `Ticket is not paid (status: ${sale.payment_status})`,
        code: 'NOT_PAID',
        buyer_name: sale.buyer_name,
      }, { status: 400 })
    }

    if (sale.checked_in) {
      const checkedInAt = sale.checked_in_at
        ? new Date(sale.checked_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'earlier'
      return NextResponse.json({
        success: false,
        error: `Already checked in at ${checkedInAt}`,
        code: 'ALREADY_CHECKED_IN',
        buyer_name: sale.buyer_name,
        ticket_type: (sale.ticket_types as any)?.name || 'General',
      }, { status: 409 })
    }

    const { error: updateError } = await supabase
      .from('ticket_sales')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sale.id)

    if (updateError)
      return NextResponse.json({ success: false, error: 'Failed to check in ticket' }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: 'Welcome!',
      buyer_name: sale.buyer_name || sale.buyer_email || 'Guest',
      buyer_email: sale.buyer_email,
      ticket_type: (sale.ticket_types as any)?.name || 'General',
      event_title: (sale.events_v2 as any)?.title || '',
    })
  } catch (err: any) {
    console.error('[Check-In API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = createServiceRoleClient()

  if (isTicketingV2Enabled()) {
    const [totalRes, checkedInRes, capRes] = await Promise.allSettled([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).in('status', ['valid', 'assigned', 'transferred', 'checked_in']),
      supabase.from('ticket_checkins').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('result', 'valid').is('reversed_at', null),
      supabase.from('events_v2').select('capacity').eq('id', eventId).maybeSingle(),
    ])

    return NextResponse.json({
      total: totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0,
      checked_in: checkedInRes.status === 'fulfilled' ? (checkedInRes.value.count ?? 0) : 0,
      capacity: capRes.status === 'fulfilled' ? (capRes.value.data?.capacity ?? 0) : 0,
    })
  }

  const [totalRes, checkedInRes, capRes] = await Promise.allSettled([
    supabase.from('ticket_sales').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('payment_status', 'completed'),
    supabase.from('ticket_sales').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true),
    supabase.from('events_v2').select('capacity').eq('id', eventId).maybeSingle(),
  ])

  return NextResponse.json({
    total: totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0,
    checked_in: checkedInRes.status === 'fulfilled' ? (checkedInRes.value.count ?? 0) : 0,
    capacity: capRes.status === 'fulfilled' ? (capRes.value.data?.capacity ?? 0) : 0,
  })
}
