import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { auditFeatureUnavailable, isAuditFeatureApproved } from "@/lib/config/audit-feature-gates"

export const dynamic = "force-dynamic"

/**
 * Local Stripe signature verification (HMAC-SHA256 over `${timestamp}.${payload}`).
 * Avoids constructing a Stripe API client — signature checking never needs the
 * account API key, so no placeholder keys are ever used here.
 */
function verifyStripeSignatureLocally(
  payload: string,
  header: string,
  secret: string,
): boolean {
  try {
    const parts = Object.fromEntries(
      header.split(",").map((piece) => {
        const idx = piece.indexOf("=")
        return [piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()]
      }),
    ) as { t?: string; v1?: string }
    const { t: timestamp, v1 } = parts
    if (!timestamp || !v1) return false

    // 5-minute replay window, matching Stripe's own tolerance.
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false

    const expected = createHmac("sha256", secret)
      .update(`${timestamp}.${payload}`)
      .digest("hex")
    if (expected.length !== v1.length) return false
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

function mapTransferStatus(eventType: string): "paid" | "failed" | "submitted" | null {
  if (eventType === "transfer.paid" || eventType === "payout.paid") return "paid"
  if (eventType === "transfer.failed" || eventType === "payout.failed") return "failed"
  if (eventType === "transfer.created" || eventType === "payout.created") return "submitted"
  return null
}

export async function POST(request: NextRequest) {
  if (!isAuditFeatureApproved("advanced_webhooks"))
    return auditFeatureUnavailable("advanced_webhooks")

  try {
    const bodyText = await request.text()
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES
    if (!webhookSecret)
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })

    const signature = request.headers.get("stripe-signature")
    if (!signature)
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 })

    let event: { id: string; type: string; data?: { object?: Record<string, unknown> } }

    if (!verifyStripeSignatureLocally(bodyText, signature, webhookSecret)) {
      console.error("[music-royalty-payouts] signature verification failed")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    event = JSON.parse(bodyText)
    if (!event?.id || !event?.type)
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { error: claimError } = await supabase
      .from("music_royalties_payout_provider_events")
      .insert({
        provider: "stripe_connect",
        event_id: event.id,
        event_type: event.type,
        payload: JSON.parse(bodyText),
      })

    if (claimError?.code === "23505" || /duplicate key/i.test(claimError?.message ?? "")) {
      return NextResponse.json({ received: true, duplicate: true })
    }
    if (claimError) {
      console.error("[music-royalty-payouts] event claim failed", { kind: "internal_error" })
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })
    }

    const object = (event.data?.object || {}) as Record<string, unknown>
    const transferId = typeof object.id === "string" ? object.id : null
    const transferGroup = typeof object.transfer_group === "string" ? object.transfer_group : null
    const metadata = (object.metadata || {}) as Record<string, unknown>
    const instructionId = typeof metadata.payout_instruction_id === "string"
      ? metadata.payout_instruction_id
      : null

    let payoutInstructionId: string | null = instructionId
    if (!payoutInstructionId && (transferId || transferGroup)) {
      let query = supabase.from("music_royalties_payout_instructions").select("id")
      if (transferId) query = query.eq("provider_transfer_id", transferId)
      else if (transferGroup) query = query.eq("idempotency_key", transferGroup)
      const { data: instruction, error: lookupError } = await query.maybeSingle()
      if (lookupError) {
        console.error("[music-royalty-payouts] payout instruction lookup failed", { kind: "internal_error" })
        return NextResponse.json({ error: "Payout instruction lookup failed" }, { status: 500 })
      }
      payoutInstructionId = instruction?.id || null
    }

    if (payoutInstructionId) {
      const { error: claimMetadataError } = await supabase
        .from("music_royalties_payout_provider_events")
        .update({ payout_instruction_id: payoutInstructionId })
        .eq("provider", "stripe_connect")
        .eq("event_id", event.id)
      if (claimMetadataError) {
        console.error("[music-royalty-payouts] event metadata update failed", { kind: "internal_error" })
        return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })
      }
    }

    const nextStatus = mapTransferStatus(event.type)
    if (nextStatus && payoutInstructionId) {
      const patch: Record<string, unknown> = {
        status: nextStatus,
        provider_transfer_id: transferId || undefined,
      }
      if (nextStatus === "submitted") patch.submitted_at = new Date().toISOString()
      if (nextStatus === "paid") patch.paid_at = new Date().toISOString()
      if (nextStatus === "failed")
        patch.failure_reason = typeof object.failure_message === "string"
          ? object.failure_message
          : event.type

      const { error: instructionUpdateError } = await supabase
        .from("music_royalties_payout_instructions")
        .update(patch)
        .eq("id", payoutInstructionId)
      if (instructionUpdateError) {
        console.error("[music-royalty-payouts] payout instruction update failed", { kind: "internal_error" })
        return NextResponse.json({ error: "Payout instruction persistence failed" }, { status: 500 })
      }
    }

    const { error: processedUpdateError } = await supabase
      .from("music_royalties_payout_provider_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider", "stripe_connect")
      .eq("event_id", event.id)
    if (processedUpdateError) {
      console.error("[music-royalty-payouts] event completion failed", { kind: "internal_error" })
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })
    }

    return NextResponse.json({ received: true, event_id: event.id })
  } catch {
    console.error("[music-royalty-payouts] webhook failed", { kind: "internal_error" })
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
