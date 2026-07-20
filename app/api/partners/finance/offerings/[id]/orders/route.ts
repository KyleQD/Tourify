import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { canAcceptOfferingOrder } from "@/lib/music/finance/offerings"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import { parseMinorUnits } from "@/lib/music/royalties/money"
import { minorUnitsToDb } from "@/lib/music/royalties/royalties-access"

export const dynamic = "force-dynamic"

const orderSchema = z.object({
  investor_ref: z.string().max(200).optional().nullable(),
  amount_minor: z.string().regex(/^[1-9]\d*$/).optional(),
  currency: z.string().length(3).optional(),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_finance_offerings_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Finance offerings are not available.", retryable: false })

    const { id } = await context.params
    const payload = orderSchema.parse(await request.json().catch(() => ({})))
    const trusted = await getTrustedMusicWriteClient(supabase)

    const { data: offering } = await trusted
      .from("music_finance_offerings")
      .select("*")
      .eq("id", id)
      .maybeSingle()

    if (!offering)
      return jsonError({ status: 404, code: "offering_not_found", message: "Offering not found.", retryable: false })

    const gate = canAcceptOfferingOrder({
      acceptsOrders: offering.accepts_orders === true,
      counselApproved: offering.counsel_approved === true,
      partnerApproved: offering.partner_approved === true,
      status: offering.status,
    })

    // Always persist an attempt; only accept when fully approved and live.
    const amountMinor = payload.amount_minor ? parseMinorUnits(payload.amount_minor) : null
    const { data: order, error } = await trusted
      .from("music_finance_offering_orders")
      .insert({
        offering_id: offering.id,
        investor_ref: payload.investor_ref || user.id,
        status: gate.allowed ? "accepted" : "rejected",
        rejection_reason: gate.allowed ? null : (gate.rejectionReason || "orders_disabled"),
        amount_minor: amountMinor != null ? minorUnitsToDb(amountMinor) : null,
        currency: payload.currency?.toUpperCase() || null,
      })
      .select("*")
      .maybeSingle()

    if (error)
      return jsonError({ status: 500, code: "offering_order_failed", message: "Unable to record offering order.", retryable: true })

    if (!gate.allowed)
      return jsonError({
        status: 403,
        code: gate.rejectionReason || "orders_disabled",
        message: "Offering orders are rejected until counsel and partner approval are complete and the offering is live.",
        retryable: false,
        issues: { order },
      })

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid offering order payload.", issues: error.issues })
    console.error("offering order failed", error)
    return jsonError({ status: 500, code: "offering_order_internal", message: "Unexpected offering order error.", retryable: true })
  }
}
