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
 * - Payment must have settled (paid or refunded); a pending or failed order is refused.
 * - A claim that loses the `buyer_user_id IS NULL` race returns 409 and never
 *   resolves entitlements for the losing user.
 *
 * Entitlement resolution:
 * - Digital entitlements created at payment time carry buyer_user_id = null for
 *   guest orders (the buyer was not signed in). Claiming resolves those rows to
 *   the authenticated buyer so `/api/marketplace/delivery/[orderItemId]` can
 *   serve them after the token expires. The resolution is scoped to this order's
 *   digital items only, so a claim token can never touch another order's rows.
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

  // Already claimed by this user → idempotent success (entitlements re-resolved)
  const alreadyClaimedByUser = order.buyer_user_id === user.id

  // Already claimed by a different user → reject
  if (order.buyer_user_id && !alreadyClaimedByUser) {
    return NextResponse.json({ error: 'This order has already been claimed.' }, { status: 409 })
  }

  // Email must match (case-insensitive)
  if (!order.guest_email || order.guest_email.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return NextResponse.json(
      { error: 'The email on this order does not match your account.' },
      { status: 403 }
    )
  }

  // Only settled money can be claimed. A pending or failed checkout must not be
  // linked to an account or have its digital entitlements resolved, otherwise a
  // guest could claim an unpaid order and unlock delivery.
  if (order.payment_status !== 'paid' && order.payment_status !== 'refunded') {
    return NextResponse.json(
      { error: 'This order cannot be claimed until payment has settled.' },
      { status: 409 }
    )
  }

  if (!alreadyClaimedByUser) {
    // Link buyer_user_id — guest_email snapshot is preserved unchanged
    // The `.is('buyer_user_id', null)` guard is the race arbiter: only the
    // writer that actually flips the column owns the claim.
    const { data: claimedOrder, error: updateErr } = await supabase
      .from('marketplace_orders')
      .update({ buyer_user_id: user.id })
      .eq('id', order.id)
      .is('buyer_user_id', null)  // Extra guard against race conditions
      .select('id, buyer_user_id')
      .maybeSingle()

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to claim order. Please try again.' }, { status: 500 })
    }
    if (claimedOrder?.buyer_user_id !== user.id) {
      // A concurrent request claimed this order first. Never report success or
      // resolve entitlements on behalf of a user who does not own the order.
      return NextResponse.json({ error: 'This order has already been claimed.' }, { status: 409 })
    }
  }

  // Resolve this order's guest digital entitlements to the claimed buyer.
  const entitlementsLinked = await resolveGuestEntitlements(supabase, order.id, user.id)
  if (entitlementsLinked === null) {
    return NextResponse.json(
      { error: 'Order linked, but digital delivery could not be enabled. Please try again.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ data: { claimed: true, orderId: order.id, entitlementsLinked } }, { status: 200 })
}

/**
 * Resolve guest entitlements to the claimed user.
 *
 * Guest order entitlements are created with buyer_user_id = null (no signed-in
 * buyer at payment time). After the order is linked, backfill the buyer onto
 * only this order's digital entitlements that are still unowned. Returns the
 * number of rows resolved, or null on a database error.
 */
async function resolveGuestEntitlements(
  supabase: ReturnType<typeof createServiceRoleClient>,
  orderId: string,
  buyerUserId: string
): Promise<number | null> {
  const { data: digitalItems } = await supabase
    .from('marketplace_order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('product_type', 'digital_asset')

  const digitalItemIds = (digitalItems ?? []).map((item: { id: string }) => item.id)
  if (digitalItemIds.length === 0) return 0

  const { data: updated, error: updateErr } = await supabase
    .from('marketplace_entitlements')
    .update({ buyer_user_id: buyerUserId })
    .is('buyer_user_id', null)
    .in('order_item_id', digitalItemIds)
    .select('id')

  if (updateErr) {
    console.error('Failed to resolve guest entitlements', updateErr)
    return null
  }

  return updated?.length ?? 0
}
