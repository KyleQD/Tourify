import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const ORDER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const orderSelection = `
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
  buyer_user_id,
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
`

export async function loadMarketplaceOrder(
  token: string,
  options: { checkout?: string; sessionId?: string } = {},
) {
  if (!token || token.length < 16) return null

  const service = createServiceRoleClient()
  const { data: guestOrder } = await service
    .from("marketplace_orders")
    .select(orderSelection)
    .eq("guest_access_token", token)
    .maybeSingle()

  let order = guestOrder
  if (guestOrder?.guest_access_token_expires_at) {
    if (new Date(guestOrder.guest_access_token_expires_at) < new Date()) {
      return { expired: true as const, order: null }
    }
  }

  if (!order && ORDER_ID_PATTERN.test(token)) {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    // A Stripe return must match the session saved for this order. Direct links
    // from the buyer's purchase history need only the verified buyer identity.
    if (options.checkout === "success" && !options.sessionId) return null

    let query = service
      .from("marketplace_orders")
      .select(orderSelection)
      .eq("id", token)
      .eq("buyer_user_id", user.id)
    if (options.checkout === "success") {
      query = query.eq("stripe_checkout_session_id", options.sessionId!)
    }
    const { data: buyerOrder } = await query.maybeSingle()
    order = buyerOrder
  }

  if (!order) return null

  const { data: seller } = await service
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", order.seller_user_id)
    .maybeSingle()

  return { expired: false as const, order, seller }
}
