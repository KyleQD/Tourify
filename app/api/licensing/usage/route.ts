import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { buildPhase3RoyaltyHandoff } from "@/lib/music/licensing/phase3-handoff"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  agreement_id: z.string().uuid(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  source: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  handoff_phase3: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_cues_usage_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Usage reporting is not available.", retryable: false })

  const agreementId = request.nextUrl.searchParams.get("agreement_id")
  if (!agreementId)
    return jsonError({ status: 400, code: "validation_error", message: "agreement_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_license_usage_reports")
    .select("id, agreement_id, period_start, period_end, source, status, phase3_handoff_id, created_at")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "usage_query_failed", message: "Unable to load usage reports.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_cues_usage_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Usage reporting is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const handoff = payload.handoff_phase3
      ? buildPhase3RoyaltyHandoff({ agreementId: payload.agreement_id })
      : null

    const { data, error } = await trusted
      .from("music_license_usage_reports")
      .insert({
        agreement_id: payload.agreement_id,
        period_start: payload.period_start || null,
        period_end: payload.period_end || null,
        source: payload.source,
        payload: payload.payload,
        status: handoff ? "handed_off_phase3" : "received",
        phase3_handoff_id: handoff ? `intent-${payload.agreement_id}-${Date.now()}` : null,
      })
      .select("id, agreement_id, status, phase3_handoff_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "usage_create_failed", message: "Unable to create usage report.", retryable: true })

    if (handoff) {
      await trusted.from("music_licensing_outbox").insert({
        event_type: "phase3.usage_handoff",
        payload: handoff,
        status: "pending",
      })
    }

    return NextResponse.json({
      data,
      handoff,
      disclaimer: LICENSING_DISCLAIMER,
      note: "Phase 3 royalty ledger remains source of truth; handoff does not rewrite journals.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid usage payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "usage_create_failed", message: "Unable to create usage report.", retryable: true })
  }
}
