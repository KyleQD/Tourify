import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

/**
 * GET /api/marketplace/order/[token]
 *
 * Opaque guest order access — validates the hashed access token and returns
 * a safe public projection of the order (no payment secrets, no raw addresses).
 *
 * The token must match the hashed guest_access_token stored on the order.
 * The order number alone never grants access.
 *
 * POST /api/marketplace/order/[token]/claim
 * is handled separately in the /claim sub-route.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length < 16) {
    return NextResponse.json({ error: 'Invalid access token.' }, { status: 400 })
  }

  // Service role needed to read the hashed token column (not exposed to anon)
  const supabase = createServiceRoleClient()

  const { data: order } = await supabase
    .from('marketplace_orders')
    .select(`
      id,
      order_number,
      status,
      payment_status,
      currency,
      subtotal_amount,
      platform_fee_amount,
      tax_amount,
      total_amount,
      guest_email,
      guest_access_token_expires_at,
      seller_user_id,
      created_at,
      marketplace_order_items (
        id,
        title,
        quantity,
        unit_price,
        line_total,
        product_type,
        fulfillment_status
      )
    `)
    .eq('guest_access_token', token)
    .maybeSingle()

  if (!order) {
    return NextResponse.json({ error: 'Order not found or access link has expired.' }, { status: 404 })
  }

  // Check expiry
  if (order.guest_access_token_expires_at) {
    const expires = new Date(order.guest_access_token_expires_at)
    if (expires < new Date()) {
      return NextResponse.json({ error: 'This order access link has expired.' }, { status: 410 })
    }
  }

  // Load seller display info (safe public fields only)
  const { data: seller } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .eq('id', order.seller_user_id)
    .maybeSingle()

  // Never expose: payment secrets, raw address, moderation data, provider IDs
  return NextResponse.json({
    data: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      currency: order.currency,
      subtotal: Number(order.subtotal_amount),
      platformFee: Number(order.platform_fee_amount),
      tax: Number(order.tax_amount),
      total: Number(order.total_amount),
      guestEmail: order.guest_email ? maskEmail(order.guest_email) : null,
      createdAt: order.created_at,
      items: (order.marketplace_order_items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
        productType: item.product_type,
        fulfillmentStatus: item.fulfillment_status,
      })),
      seller: seller
        ? { username: seller.username, fullName: seller.full_name, avatarUrl: seller.avatar_url }
        : null,
    },
  })
}

/** Partially mask email for safe display: a***@example.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 3))}@${domain}`
}
