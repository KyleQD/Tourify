import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { canTransitionOrder } from "@/lib/music/marketplace/order-state-machine"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"
import { createSandboxAtsAdapter } from "@/lib/music/marketplace/partner-adapters"
import { LIQUIDITY_DISCLAIMER } from "@/lib/music/marketplace/marketplace-domain"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  security_class_id: z.string().uuid(),
  side: z.enum(["buy", "sell"]),
  quantity_minor: z.string().regex(/^\d+$/),
  price_minor: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  partner_id: z.string().min(1).max(80).default("sandbox_ats"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_secondary_sync_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Secondary order sync is not available.",
      retryable: false,
    })

  const { data, error } = await supabase
    .from("music_marketplace_partner_orders")
    .select("id, public_id, security_class_id, partner_id, partner_order_id, side, quantity_minor, price_minor, currency, status, created_at")
    .eq("investor_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "orders_query_failed", message: "Unable to load partner orders.", retryable: true })

  return NextResponse.json({
    data: data || [],
    matchingEngine: null,
    note: "Tourify does not operate an order book or matching engine. Orders are partner ATS receipts.",
    disclaimer: LIQUIDITY_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_secondary_sync_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Secondary order sync is not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    if (!canTransitionOrder("draft_local", "submitted_to_partner"))
      return jsonError({ status: 500, code: "invalid_order_transition", message: "Invalid order transition.", retryable: false })

    const ats = createSandboxAtsAdapter()
    const partnerOrder = await ats.submitOrder({
      securityPartnerId: payload.security_class_id,
      side: payload.side,
      quantityMinor: payload.quantity_minor,
      priceMinor: payload.price_minor != null ? String(payload.price_minor) : undefined,
      currency: payload.currency,
    })

    const { data, error } = await supabase
      .from("music_marketplace_partner_orders")
      .insert({
        investor_user_id: user.id,
        security_class_id: payload.security_class_id,
        partner_id: payload.partner_id,
        partner_order_id: partnerOrder.partnerOrderId,
        side: payload.side,
        quantity_minor: payload.quantity_minor,
        price_minor: payload.price_minor ?? null,
        currency: payload.currency ?? null,
        status: "submitted_to_partner",
      })
      .select("id, public_id, partner_order_id, side, quantity_minor, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "order_create_failed", message: "Unable to submit partner order receipt.", retryable: true })

    return NextResponse.json({
      data,
      matchingEngine: null,
      disclaimer: LIQUIDITY_DISCLAIMER,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid order payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "order_create_failed", message: "Unable to create order.", retryable: true })
  }
}
