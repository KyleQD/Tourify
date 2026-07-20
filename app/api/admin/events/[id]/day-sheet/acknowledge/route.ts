import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import {
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"

function extractEventId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('events')
  return idx >= 0 ? segments[idx + 1] : null
}

export const POST = withAuth(async (request: NextRequest, { supabase, user }) => {
  const eventId = extractEventId(request.url)
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const version = Number(body.version || 0)
  const token = typeof body.token === 'string' ? body.token : null
  const now = new Date().toISOString()

  let isAdmin = false
  try {
    await assertAdminEventAccess({ supabase, userId: user.id, eventId })
    isAdmin = true
  } catch {
    isAdmin = false
  }

  // Recipient path: match receipt by user id, email, or ack token
  if (!isAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle()

    let query = supabase
      .from('day_sheet_receipts')
      .select('id, recipient_user_id, recipient_email, version, status, metadata')
      .eq('event_id', eventId)

    if (version > 0) query = query.eq('version', version)

    const { data: receipts, error: lookupError } = await query
    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 })
    }

    const email = (profile?.email || user.email || '').toLowerCase()
    const match = (receipts || []).find((receipt: any) => {
      if (receipt.recipient_user_id === user.id) return true
      if (email && receipt.recipient_email && String(receipt.recipient_email).toLowerCase() === email) return true
      if (token && receipt.metadata?.ack_token === token) return true
      return false
    })

    if (!match) {
      return NextResponse.json({ error: 'No day sheet receipt found for this recipient' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('day_sheet_receipts')
      .update({ status: 'acknowledged', acknowledged_at: now, recipient_user_id: user.id })
      .eq('id', match.id)
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ receipt: data })
  }

  // Admin override: acknowledge own receipt or a specific recipient
  let query = supabase
    .from('day_sheet_receipts')
    .update({ status: 'acknowledged', acknowledged_at: now })
    .eq('event_id', eventId)

  if (body.recipient_user_id) query = query.eq('recipient_user_id', body.recipient_user_id)
  else if (body.recipient_email) query = query.eq('recipient_email', body.recipient_email)
  else query = query.eq('recipient_user_id', user.id)

  if (version > 0) query = query.eq('version', version)

  const { data, error } = await query.select().maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'No receipt found' }, { status: 404 })
  }

  return NextResponse.json({ receipt: data })
})
