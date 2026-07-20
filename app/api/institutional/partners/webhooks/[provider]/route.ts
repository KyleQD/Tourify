import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { hashPayload, verifyPartnerWebhookSignature } from "@/lib/music/institutional/partner-adapters"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params
    const providerId = provider?.trim()
    if (!providerId)
      return NextResponse.json({ error: "provider required" }, { status: 400 })

    const bodyText = await request.text()
    const signature = request.headers.get("x-tourify-partner-signature")
    const secret =
      process.env[`MUSIC_INSTITUTIONAL_WEBHOOK_SECRET_${providerId.toUpperCase()}`] ||
      process.env.MUSIC_INSTITUTIONAL_WEBHOOK_SECRET
    const allowUnsigned = process.env.MUSIC_INSTITUTIONAL_WEBHOOK_ALLOW_UNSIGNED === "true"

    let signatureVerified = false
    if (secret && signature) {
      signatureVerified = verifyPartnerWebhookSignature({ rawBody: bodyText, signature, secret })
      if (!signatureVerified)
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    } else if (!allowUnsigned) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 })
    }

    const payload = JSON.parse(bodyText || "{}") as Record<string, unknown>
    const externalEventId = String(payload.id || payload.event_id || "")
    const eventType = String(payload.type || payload.event_type || "")
    if (!externalEventId || !eventType)
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { data: existing } = await supabase
      .from("music_institutional_partner_events")
      .select("id")
      .eq("provider_id", providerId)
      .eq("external_event_id", externalEventId)
      .maybeSingle()
    if (existing)
      return NextResponse.json({ data: { id: existing.id, idempotent: true } })

    const { data: stored, error } = await supabase
      .from("music_institutional_partner_events")
      .insert({
        provider_id: providerId,
        external_event_id: externalEventId,
        event_type: eventType,
        raw_payload: payload,
        payload_hash: hashPayload(payload),
        signature_verified: signatureVerified,
        processing_status: "received",
      })
      .select("id")
      .single()

    if (error)
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })

    if (eventType === "fund.nav.finalized" && typeof payload.fund_vehicle_id === "string") {
      await supabase.from("music_institutional_outbox_events").insert({
        event_type: "fund.nav.finalized",
        aggregate_type: "fund_vehicle",
        aggregate_id: payload.fund_vehicle_id,
        payload: { providerEventId: externalEventId, payload },
      })
    }

    await supabase
      .from("music_institutional_partner_events")
      .update({ processed_at: new Date().toISOString(), processing_status: "processed" })
      .eq("id", stored.id)

    return NextResponse.json({ data: { id: stored.id, processed: true } })
  } catch (error) {
    console.error("[music-institutional-webhook]", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
