import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { hashPayload, verifyPartnerWebhookSignature } from "@/lib/music/rights-admin/partner-adapters"
import { reconcileExternalRecord } from "@/lib/music/rights-admin/external-record-reconciliation"

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
      process.env[`MUSIC_RIGHTS_ADMIN_WEBHOOK_SECRET_${providerId.toUpperCase()}`] ||
      process.env.MUSIC_RIGHTS_ADMIN_WEBHOOK_SECRET
    const allowUnsigned = process.env.MUSIC_RIGHTS_ADMIN_WEBHOOK_ALLOW_UNSIGNED === "true"

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
      .from("music_rights_admin_partner_events")
      .select("id")
      .eq("provider", providerId)
      .eq("external_event_id", externalEventId)
      .maybeSingle()
    if (existing)
      return NextResponse.json({ data: { id: existing.id, idempotent: true } })

    const { data: stored, error } = await supabase
      .from("music_rights_admin_partner_events")
      .insert({
        provider: providerId,
        external_event_id: externalEventId,
        event_type: eventType,
        payload,
        payload_hash: hashPayload(payload),
        status: signatureVerified || allowUnsigned ? "verified" : "received",
      })
      .select("id")
      .single()

    if (error)
      return NextResponse.json({ error: "Event persistence failed" }, { status: 500 })

    if (eventType === "registration.status" && typeof payload.external_id === "string") {
      const fields = reconcileExternalRecord([{
        field: "status",
        localValue: payload.prior_status || null,
        externalValue: payload.status,
        authority: "external",
      }])
      await supabase.from("music_rights_external_records").insert({
        provider_code: providerId,
        external_id: payload.external_id,
        record_type: "registration_status",
        payload_hash: hashPayload(payload),
        payload: { ...payload, reconciliation: fields },
        effective_at: new Date().toISOString(),
      })
      await supabase.from("music_rights_admin_outbox").insert({
        event_type: "registration.reconciled",
        aggregate_id: stored.id,
        payload: { providerEventId: externalEventId, fields },
        idempotency_key: `reg-reconcile-${externalEventId}`,
      })
    }

    await supabase
      .from("music_rights_admin_partner_events")
      .update({ processed_at: new Date().toISOString(), status: "processed" })
      .eq("id", stored.id)

    return NextResponse.json({ data: { id: stored.id, processed: true, signatureVerified } })
  } catch (error) {
    console.error("[music-rights-admin-webhook]", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
