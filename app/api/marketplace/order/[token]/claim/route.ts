import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/marketplace/order/[token]/claim
 *
 * Links a guest order to a verified Tourify account.
 *
 * Rules:
 * - Authenticated user must be logged in.
 * - Token must be valid and not expired.
 * - The authenticated user's email must match the guest_email on the order.
 * - Email verification is enforced via Supabase Auth (email_confirmed_at).
 * - Claiming links buyer_user_id without changing the original guest_email snapshot.
 * - Already-claimed orders return 409 (not an error — idempotent for the same user).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid access token.' }, { status: 400 })
  }

  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Sign in to claim this order.' }, { status: 401 })
  }

  const { user } = auth

  // Require confirmed email
  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { error: 'Please verify your email address before claiming this order.' },
      { status: 403 }
    )
  }

  const supabase = createServiceRoleClient()

  const { data: order } = await supabase
    .from('marketplace_orders')
    .select('id, guest_email, buyer_user_id, guest_access_token_expires_at, payment_status')
    .eq('guest_access_token', token)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Order not found or access link has expired.' }, { status: 404 })
  }

  if (order.guest_access_token_expires_at) {
    const expires = new Date(order.guest_access_token_expires_at)
    if (expires < new Date()) {
      return NextResponse.json({ error: 'This order access link has expired.' }, { status: 410 })
    }
  }

  // Already claimed by this user → idempotent success
  if (order.buyer_user_id === user.id) {
    return NextResponse.json({ data: { claimed: true, orderId: order.id } })
  }

  // Already claimed by a different user → reject
  if (order.buyer_user_id && order.buyer_user_id !== user.id) {
    return NextResponse.json({ error: 'This order has already been claimed.' }, { status: 409 })
  }

  // Email must match (case-insensitive)
  if (!order.guest_email || order.guest_email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return NextResponse.json(
      { error: 'The email on this order does not match your account.' },
      { status: 403 }
    )
  }

  // Link buyer_user_id — guest_email snapshot is preserved unchanged
  const { error: updateErr } = await supabase
    .from('marketplace_orders')
    .update({ buyer_user_id: user.id })
    .eq('id', order.id)
    .is('buyer_user_id', null)  // Extra guard against race conditions

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to claim order. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ data: { claimed: true, orderId: order.id } }, { status: 200 })
}
