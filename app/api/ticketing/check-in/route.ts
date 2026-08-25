import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { parseQrPayload } from '@/lib/ticketing/credentials'
import { hasTicketingPermission } from '@/lib/ticketing/permissions'
import { emitTicketAnalyticsEvent } from '@/lib/ticketing/analytics'
import { isTicketingV2Enabled } from '@/lib/ticketing/feature-flag'
import { createRateLimiter, clientKeyFromRequest, isRateLimitingActive } from '@/lib/utils/rate-limit'

// Distributed sliding-window limiter. The previous in-process Map was a no-op
// across serverless instances (AUDIT H9); keep it only as an in-memory
// fallback when Redis is not configured.
const rateMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const STATS_RATE_LIMIT = 120
const RATE_WINDOW_MS = 60_000

function isRateLimited(ip: string): boolean {
  if (isRateLimitingActive()) return false // handled by distributed limiter below
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
}

/**
 * Door authority derives exclusively from the canonical catalog (VEN-149):
 * scan_tickets / operate_box_office grants, venue ticketing authority or
 * workforce door assignments. Bare organization/assignment existence no
 * longer implies scanning power.
 */
async function authorizeScanner(params: {
  supabase: ReturnType<typeof createServiceRoleClient>
  userId: string
  eventId: string
}): Promise<boolean> {
  for (const permission of ['scan_tickets', 'operate_box_office'] as const) {
    if (
      await hasTicketingPermission({
        supabase: params.supabase,
        userId: params.userId,
        eventId: params.eventId,
        permission,
      })
    )
      return true
  }
  return false
}

/**
 * VEN-155 — attendee identity projection. Contact fields exist ONLY with
 * view_attendee_contact; names never silently fall back to raw emails.
 */
function projectAttendee(input: { name?: string | null; email?: string | null }, canViewContact: boolean) {
  const name = input.name?.trim() ? input.name.trim() : 'Guest'
  return {
    buyer_name: name,
    ...(canViewContact && input.email ? { buyer_email: input.email } : {}),
  }
}

function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Active checkpoint names for an event ([] when no registry exists yet). */
async function loadCheckpoints(supabase: ReturnType<typeof createServiceRoleClient>, eventId: string): Promise<string[]> {
  const { data } = await supabase
    .from('ticket_checkpoints')
    .select('name')
    .eq('event_id', eventId)
    .eq('is_active', true)
    .order('name')
  return (data || []).map((row: any) => String(row.name))
}

export async function POST(request: NextRequest) {
  const ip = clientKeyFromRequest(request)
  if (isRateLimited(ip))
    return NextResponse.json({ error: 'Too many check-in attempts. Please wait and try again.' }, { status: 429 })

  const rl = createRateLimiter({ namespace: 'ticket-checkin', limit: RATE_LIMIT, windowSec: RATE_WINDOW_MS / 1000 })
  if (!(await rl.check(ip)).success)
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
      reason,
      // VEN-157 — stable client operation identity for offline reconciliation.
      client_scan_id,
    } = body

    const supabase = createServiceRoleClient()

    if (client_scan_id !== undefined && !isValidUuid(client_scan_id)) {
      return NextResponse.json(
        { success: false, error: 'client_scan_id must be a UUID', code: 'VALIDATION_ERROR' },
        { status: 400 },
      )
    }

    // ── Reverse check-in (VEN-158): permissioned, reasoned, audited ─────────
    if (reverse && checkin_id) {
      if (!isValidUuid(checkin_id))
        return NextResponse.json({ success: false, error: 'Invalid check-in id', code: 'VALIDATION_ERROR' }, { status: 400 })

      const normalizedReason = typeof reason === 'string' ? reason.trim() : ''
      if (normalizedReason.length < 4 || normalizedReason.length > 300) {
        return NextResponse.json(
          { success: false, error: 'A reversal reason (4–300 characters) is required', code: 'VALIDATION_ERROR' },
          { status: 422 },
        )
      }

      const { data: checkin } = await supabase
        .from('ticket_checkins')
        .select('*')
        .eq('id', checkin_id)
        .maybeSingle()

      if (!checkin)
        return NextResponse.json({ success: false, error: 'Check-in not found', code: 'NOT_FOUND' }, { status: 404 })

      if (checkin.reversed_at) {
        // Idempotent double-reverse guard.
        return NextResponse.json(
          { success: false, error: 'This check-in was already reversed', code: 'ALREADY_REVERSED' },
          { status: 409 },
        )
      }

      const allowed = await hasTicketingPermission({
        supabase,
        userId: auth.user.id,
        eventId: checkin.event_id,
        permission: 'reverse_checkin',
      })
      if (!allowed)
        return NextResponse.json({ success: false, error: 'Reverse check-in permission required', code: 'FORBIDDEN' }, { status: 403 })

      const reversedAt = new Date().toISOString()
      const { error: reverseError } = await supabase
        .from('ticket_checkins')
        .update({
          reversed_at: reversedAt,
          reversed_by: auth.user.id,
          reverse_reason: normalizedReason,
        })
        // Conditional guard closes the double-reverse race.
        .eq('id', checkin_id)
        .is('reversed_at', null)

      if (reverseError)
        return NextResponse.json({ success: false, error: 'Failed to reverse check-in' }, { status: 500 })

      await supabase
        .from('tickets')
        .update({ status: 'valid', updated_at: reversedAt })
        .eq('id', checkin.ticket_id)
        .eq('status', 'checked_in')

      // Reconcile order-level rollup after reversal.
      const { data: ticketRow } = await supabase.from('tickets').select('order_id').eq('id', checkin.ticket_id).maybeSingle()
      if (ticketRow?.order_id) {
        const { data: siblings } = await supabase
          .from('tickets')
          .select('status')
          .eq('order_id', ticketRow.order_id)
        const anyCheckedIn = (siblings || []).some((t: any) => t.status === 'checked_in')
        if (!anyCheckedIn) {
          await supabase
            .from('ticket_sales')
            .update({ checked_in: false, checked_in_at: null, checked_in_by: null, updated_at: reversedAt })
            .eq('id', ticketRow.order_id)
            .eq('checked_in', true)
        }
      }

      await emitTicketAnalyticsEvent({
        supabase,
        eventName: 'ticket_checkin_reversed',
        eventId: checkin.event_id,
        ticketId: checkin.ticket_id,
        actorUserId: auth.user.id,
        metadata: { reason: normalizedReason, checkpoint: checkin.checkpoint },
      })

      return NextResponse.json({ success: true, message: 'Check-in reversed', checkin_id })
    }

    // ── V2 credential-based scan ─────────────────────────────────────────────
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

      // Idempotent replay: same client_scan_id resolves to its original outcome.
      if (client_scan_id) {
        const { data: replayed } = await supabase
          .from('ticket_checkins')
          .select('id, result, reversed_at')
          .eq('client_scan_id', client_scan_id)
          .maybeSingle()
        if (replayed) {
          const canViewContactReplay = await hasTicketingPermission({
            supabase,
            userId: auth.user.id,
            eventId,
            permission: 'view_attendee_contact',
          })
          return NextResponse.json({
            success: true,
            message: replayed.result === 'valid' ? 'Welcome!' : `Scan previously resolved: ${replayed.result}`,
            checkin_id: replayed.id,
            replayed: true,
            result: replayed.result,
            ...projectAttendee({ name: ticket.owner_name, email: ticket.owner_email }, canViewContactReplay),
            ticket_type: (ticket.ticket_types as any)?.name || 'General',
            event_title: (ticket.events_v2 as any)?.title || '',
            checkpoint,
          })
        }
      }

      if (ticket.status === 'refunded')
        return NextResponse.json({ success: false, error: 'Ticket refunded', code: 'REFUNDED' }, { status: 400 })

      if (ticket.status === 'canceled' || ticket.status === 'void')
        return NextResponse.json({ success: false, error: 'Ticket canceled', code: 'CANCELED' }, { status: 400 })

      if (ticket.status === 'checked_in') {
        return NextResponse.json({
          success: false,
          error: 'Already checked in',
          code: 'ALREADY_CHECKED_IN',
          ticket_type: (ticket.ticket_types as any)?.name || 'General',
        }, { status: 409 })
      }

      // VEN-159 — validate checkpoint against the event's registry.
      const normalizedCheckpoint = typeof checkpoint === 'string' && checkpoint.trim() ? checkpoint.trim().slice(0, 60) : 'main'
      const registry = await loadCheckpoints(supabase, eventId)
      if (registry.length > 0 && !registry.includes(normalizedCheckpoint)) {
        return NextResponse.json(
          { success: false, error: `Unknown checkpoint "${normalizedCheckpoint}"`, code: 'UNKNOWN_CHECKPOINT' },
          { status: 422 },
        )
      }

      const { data: existingCheckin } = await supabase
        .from('ticket_checkins')
        .select('id, created_at')
        .eq('ticket_id', ticket.id)
        .eq('checkpoint', normalizedCheckpoint)
        .eq('result', 'valid')
        .is('reversed_at', null)
        .maybeSingle()

      if (existingCheckin) {
        return NextResponse.json({
          success: false,
          error: `Already checked in at ${normalizedCheckpoint}`,
          code: 'ALREADY_CHECKED_IN',
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
          checkpoint: normalizedCheckpoint,
          result: 'valid',
          ...(client_scan_id ? { client_scan_id } : {}),
        })
        .select('id')
        .single()

      if (checkinError) {
        if (String(checkinError.code) === '23505') {
          return NextResponse.json({
            success: false,
            error: 'Already checked in',
            code: 'ALREADY_CHECKED_IN',
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
        metadata: { checkpoint: normalizedCheckpoint, ...(client_scan_id ? { client_scan_id } : {}) },
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
        ...projectAttendee({ name: ticket.owner_name, email: ticket.owner_email }, canViewContact),
        ticket_type: (ticket.ticket_types as any)?.name || 'General',
        event_title: (ticket.events_v2 as any)?.title || '',
        checkpoint: normalizedCheckpoint,
      })
    }

    // ── Legacy sale-level check-in path (flag-off deployments) ──────────────
    if (!qr_code && !sale_id)
      return NextResponse.json({ error: 'qr_code or sale_id is required' }, { status: 400 })

    if (sale_id !== undefined && !isValidUuid(sale_id))
      return NextResponse.json({ success: false, error: 'Invalid sale id', code: 'VALIDATION_ERROR' }, { status: 400 })

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

    const canViewContact = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId,
      permission: 'view_attendee_contact',
    })

    return NextResponse.json({
      success: true,
      message: 'Welcome!',
      ...projectAttendee({ name: sale.buyer_name, email: sale.buyer_email }, canViewContact),
      ticket_type: (sale.ticket_types as any)?.name || 'General',
      event_title: (sale.events_v2 as any)?.title || '',
    })
  } catch (err: any) {
    console.error('[Check-In API] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const ip = clientKeyFromRequest(request)
  if (isRateLimited(`stats:${ip}`))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  const rl = createRateLimiter({ namespace: 'ticket-checkin-stats', limit: STATS_RATE_LIMIT, windowSec: RATE_WINDOW_MS / 1000 })
  if (!(await rl.check(`stats:${ip}`)).success)
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event_id')
  if (!eventId) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const allowed = await authorizeScanner({ supabase, userId: auth.user.id, eventId })
  if (!allowed)
    return NextResponse.json({ error: 'Check-in permission required', code: 'FORBIDDEN' }, { status: 403 })

  const headers = { 'Cache-Control': 'no-store' }

  // ── Recent admissions feed for the reverse workflow (VEN-158) ────────────
  if (searchParams.get('recent') === '1') {
    const canReverse = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId,
      permission: 'reverse_checkin',
    })
    if (!canReverse)
      return NextResponse.json({ error: 'Reverse check-in permission required', code: 'FORBIDDEN' }, { status: 403 })

    const canViewContact = await hasTicketingPermission({
      supabase,
      userId: auth.user.id,
      eventId,
      permission: 'view_attendee_contact',
    })

    const includeReversed = searchParams.get('include_reversed') === '1'
    let recentQuery = supabase
      .from('ticket_checkins')
      .select('id, checkpoint, result, created_at, reversed_at, reverse_reason, ticket_id, tickets(owner_name, owner_email, status, ticket_types(name))')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(25)
    if (!includeReversed) recentQuery = recentQuery.is('reversed_at', null)

    const { data: recentRows, error: recentError } = await recentQuery
    if (recentError) return NextResponse.json({ error: 'Failed to load admissions' }, { status: 500, headers })

    return NextResponse.json(
      {
        admissions: (recentRows || []).map((row: any) => ({
          checkin_id: row.id,
          checkpoint: row.checkpoint,
          result: row.result,
          created_at: row.created_at,
          reversed_at: row.reversed_at,
          reverse_reason: canReverse ? row.reverse_reason : undefined,
          attendee: projectAttendee(
            { name: row.tickets?.owner_name, email: row.tickets?.owner_email },
            canViewContact,
          ),
          ticket_status: row.tickets?.status,
          ticket_type: row.tickets?.ticket_types?.name || 'General',
        })),
        contact_visible: canViewContact,
      },
      { headers },
    )
  }

  // ── Door statistics (VEN-154: attendance-permission gated) ───────────────
  if (isTicketingV2Enabled()) {
    const wantByCheckpoint = searchParams.get('by_checkpoint') === '1'
    const checkpointFilter = searchParams.get('checkpoint')

    let checkedInQuery = supabase
      .from('ticket_checkins')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('result', 'valid')
      .is('reversed_at', null)
    if (checkpointFilter) checkedInQuery = checkedInQuery.eq('checkpoint', checkpointFilter)

    const [totalRes, checkedInRes, capRes, checkpointsRes] = await Promise.allSettled([
      supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', eventId).in('status', ['valid', 'assigned', 'transferred', 'checked_in']),
      checkedInQuery,
      supabase.from('events_v2').select('capacity').eq('id', eventId).maybeSingle(),
      loadCheckpoints(supabase, eventId),
    ])

    // Per-checkpoint breakdown for the door dashboard (VEN-159).
    let byCheckpoint: Record<string, number> | undefined
    if (wantByCheckpoint) {
      const { data: cpRows } = await supabase
        .from('ticket_checkins')
        .select('checkpoint')
        .eq('event_id', eventId)
        .eq('result', 'valid')
        .is('reversed_at', null)
        .limit(10_000)
      byCheckpoint = {}
      for (const row of cpRows || []) {
        const key = String(row.checkpoint || 'main')
        byCheckpoint[key] = (byCheckpoint[key] || 0) + 1
      }
    }

    return NextResponse.json(
      {
        total: totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0,
        checked_in: checkedInRes.status === 'fulfilled' ? (checkedInRes.value.count ?? 0) : 0,
        capacity: capRes.status === 'fulfilled' ? (capRes.value.data?.capacity ?? 0) : 0,
        checkpoints: checkpointsRes.status === 'fulfilled' ? checkpointsRes.value : [],
        ...(byCheckpoint ? { by_checkpoint: byCheckpoint } : {}),
      },
      { headers },
    )
  }

  const [totalRes, checkedInRes, capRes] = await Promise.allSettled([
    supabase.from('ticket_sales').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('payment_status', 'completed'),
    supabase.from('ticket_sales').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true),
    supabase.from('events_v2').select('capacity').eq('id', eventId).maybeSingle(),
  ])

  return NextResponse.json(
    {
      total: totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0,
      checked_in: checkedInRes.status === 'fulfilled' ? (checkedInRes.value.count ?? 0) : 0,
      capacity: capRes.status === 'fulfilled' ? (capRes.value.data?.capacity ?? 0) : 0,
      checkpoints: [],
    },
    { headers },
  )
}
