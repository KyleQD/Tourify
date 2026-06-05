import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

// Simple in-memory rate limiter: max 30 check-in attempts per minute per IP
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
  if (entry.count > RATE_LIMIT) return true
  return false
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many check-in attempts. Please wait and try again." }, { status: 429 })
  }

  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { qr_code, sale_id } = body

    if (!qr_code && !sale_id) {
      return NextResponse.json({ error: 'qr_code or sale_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Look up sale by QR code or sale ID
    let query = supabase
      .from('ticket_sales')
      .select('id, buyer_name, buyer_email, payment_status, checked_in, checked_in_at, ticket_type_id, event_id, ticket_types(name), events_v2(title, start_at)')

    if (qr_code) {
      query = query.eq('qr_code', qr_code)
    } else {
      query = query.eq('id', sale_id)
    }

    const { data: sale, error } = await (query as any).maybeSingle()

    if (error || !sale) {
      return NextResponse.json({ success: false, error: 'Ticket not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Check payment status
    if (sale.payment_status !== 'completed') {
      return NextResponse.json({
        success: false,
        error: `Ticket is not paid (status: ${sale.payment_status})`,
        code: 'NOT_PAID',
        buyer_name: sale.buyer_name,
      }, { status: 400 })
    }

    // Check if already checked in
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

    // Check in!
    const { error: updateError } = await supabase
      .from('ticket_sales')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: auth.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sale.id)

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to check in ticket' }, { status: 500 })
    }

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
  const [totalRes, checkedInRes, capRes] = await Promise.allSettled([
    supabase.from('ticket_sales').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('payment_status', 'completed'),
    supabase.from('ticket_sales').select('id', { count: 'exact', head: true }).eq('event_id', eventId).eq('checked_in', true),
    supabase.from('events_v2').select('capacity').eq('id', eventId).maybeSingle(),
  ])

  const total = totalRes.status === 'fulfilled' ? (totalRes.value.count ?? 0) : 0
  const checkedIn = checkedInRes.status === 'fulfilled' ? (checkedInRes.value.count ?? 0) : 0
  const capacity = capRes.status === 'fulfilled' ? (capRes.value.data?.capacity ?? 0) : 0

  return NextResponse.json({ total, checked_in: checkedIn, capacity })
}
