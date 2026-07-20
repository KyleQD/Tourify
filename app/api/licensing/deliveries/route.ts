import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evaluateDeliveryGate, LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  agreement_id: z.string().uuid(),
  storage_bucket: z.string().min(1).default("music-licensing-stems"),
  storage_path: z.string().min(1),
  purpose: z.enum(["preview", "final", "stem", "artwork", "other"]).default("final"),
  conditions_satisfied: z.boolean().default(false),
  payment_required: z.boolean().default(false),
  payment_confirmed: z.boolean().default(false),
  expires_at: z.string().datetime().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_delivery_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing delivery is not available.", retryable: false })

  const agreementId = request.nextUrl.searchParams.get("agreement_id")
  if (!agreementId)
    return jsonError({ status: 400, code: "validation_error", message: "agreement_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_license_deliveries")
    .select("id, agreement_id, purpose, status, hold_reason, released_at, expires_at, created_at")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "deliveries_query_failed", message: "Unable to load deliveries.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_delivery_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing delivery is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data: agreement } = await trusted
      .from("music_license_agreements")
      .select("id, status")
      .eq("id", payload.agreement_id)
      .single()
    if (!agreement)
      return jsonError({ status: 404, code: "not_found", message: "Agreement not found.", retryable: false })

    const gate = evaluateDeliveryGate({
      agreementStatus: agreement.status,
      conditionsSatisfied: payload.conditions_satisfied,
      paymentRequired: payload.payment_required,
      paymentConfirmed: payload.payment_confirmed,
      purpose: payload.purpose,
    })

    const { data, error } = await trusted
      .from("music_license_deliveries")
      .insert({
        agreement_id: payload.agreement_id,
        recipient_user_id: user.id,
        storage_bucket: payload.storage_bucket,
        storage_path: payload.storage_path,
        purpose: payload.purpose,
        status: gate.allowed ? "released" : "held",
        hold_reason: gate.holdReason || null,
        released_at: gate.allowed ? new Date().toISOString() : null,
        expires_at: payload.expires_at || null,
      })
      .select("id, agreement_id, purpose, status, hold_reason")
      .single()

    if (error)
      return jsonError({ status: 500, code: "delivery_create_failed", message: "Unable to create delivery.", retryable: true })

    return NextResponse.json({
      data,
      gate,
      disclaimer: LICENSING_DISCLAIMER,
      note: "Delivery blocked until agreement is effective.",
    }, { status: gate.allowed ? 201 : 202 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid delivery payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "delivery_create_failed", message: "Unable to create delivery.", retryable: true })
  }
}
