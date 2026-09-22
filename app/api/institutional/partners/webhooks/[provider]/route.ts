import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { hashPayload, verifyPartnerWebhookSignature } from "@/lib/music/institutional/partner-adapters"
import { auditFeatureUnavailable, isAuditFeatureApproved } from "@/lib/config/audit-feature-gates"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  if (!isAuditFeatureApproved("advanced_webhooks"))
    return auditFeatureUnavailable("advanced_webhooks")

  let supabase: any = null
  let claimedEventId: string | null = null
  let routeProviderId: string | null = null
  try {
    const { provider } = await context.params
    const providerId = provider?.trim()
    if (!providerId)
      return NextResponse.json({ error: "provider required" }, { status: 400 })
    routeProviderId = providerId

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

    let payload: Record<string, unknown>
    try {
      const parsed = JSON.parse(bodyText || "{}")
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid payload")
      payload = parsed as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })
    }
    const externalEventId = String(payload.id || payload.event_id || "").trim()
    const eventType = String(payload.type || payload.event_type || "").trim()
    if (!externalEventId || !eventType)
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 })

    supabase = createServiceRoleClient()
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

    if (error?.code === "23505" || /duplicate key/i.test(error?.message ?? ""))
      return NextResponse.json({ data: { providerEventId: externalEventId, idempotent: true } })
    if (error)
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })
    claimedEventId = externalEventId

    if (eventType === "fund.nav.finalized" && typeof payload.fund_vehicle_id === "string") {
      const { error: outboxError } = await supabase.from("music_institutional_outbox_events").insert({
        event_type: "fund.nav.finalized",
        aggregate_type: "fund_vehicle",
        aggregate_id: payload.fund_vehicle_id,
        payload: { providerEventId: externalEventId, payload },
      })
      if (outboxError) throw new Error("Institutional event persistence failed")
    }

    const { error: completionError } = await supabase
      .from("music_institutional_partner_events")
      .update({ processed_at: new Date().toISOString(), processing_status: "processed" })
      .eq("id", stored.id)
    if (completionError) throw new Error("Event completion persistence failed")

    return NextResponse.json({ data: { id: stored.id, processed: true } })
  } catch {
    if (supabase && claimedEventId) {
      const { error: failureError } = await supabase
        .from("music_institutional_partner_events")
        .update({ processing_status: "failed" })
        .eq("provider_id", routeProviderId)
        .eq("external_event_id", claimedEventId)
      if (failureError) console.error("[music-institutional-webhook] failed to record failure", { kind: "internal_error" })
    }
    console.error("[music-institutional-webhook]", { kind: "internal_error" })
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
