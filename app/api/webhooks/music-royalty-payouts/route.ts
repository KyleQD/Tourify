import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

function mapTransferStatus(eventType: string): "paid" | "failed" | "submitted" | null {
  if (eventType === "transfer.paid" || eventType === "payout.paid") return "paid"
  if (eventType === "transfer.failed" || eventType === "payout.failed") return "failed"
  if (eventType === "transfer.created" || eventType === "payout.created") return "submitted"
  return null
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get("stripe-signature")
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_MUSIC_ROYALTIES
      || process.env.STRIPE_WEBHOOK_SECRET

    let event: { id: string; type: string; data?: { object?: Record<string, unknown> } }

    if (webhookSecret && signature) {
      try {
        const Stripe = (await import("stripe")).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
          apiVersion: "2023-10-16" as any,
        })
        event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret) as any
      } catch (error) {
        console.error("[music-royalty-payouts] signature verification failed", error)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
      }
    } else if (process.env.MUSIC_ROYALTY_PAYOUTS_WEBHOOK_ALLOW_UNSIGNED === "true") {
      event = JSON.parse(bodyText)
      if (!event?.id || !event?.type)
        return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })
    } else {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }

    const supabase = createServiceRoleClient()
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
      const { data: instruction } = await query.maybeSingle()
      payoutInstructionId = instruction?.id || null
    }

    const { error: upsertError } = await supabase
      .from("music_royalties_payout_provider_events")
      .upsert({
        provider: "stripe_connect",
        event_id: event.id,
        event_type: event.type,
        payout_instruction_id: payoutInstructionId,
        payload: JSON.parse(bodyText),
        processed_at: new Date().toISOString(),
      }, { onConflict: "provider,event_id" })

    if (upsertError) {
      console.error("[music-royalty-payouts] event upsert failed", upsertError)
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })
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

      await supabase
        .from("music_royalties_payout_instructions")
        .update(patch)
        .eq("id", payoutInstructionId)
    }

    return NextResponse.json({ received: true, event_id: event.id })
  } catch (error) {
    console.error("[music-royalty-payouts] webhook failed", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
