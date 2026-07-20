import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evaluateOutboundActionGate, RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  source_url: z.string().url().optional().nullable(),
  capture_path: z.string().optional().nullable(),
  capture_sha256: z.string().optional().nullable(),
  candidate_asset_id: z.string().uuid().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
  human_reviewed: z.boolean().default(false),
  request_takedown: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_enforcement_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Enforcement observations are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_enforcement_observations")
    .select("id, source_url, candidate_asset_id, confidence, triage_status, human_reviewed, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "observations_query_failed", message: "Unable to load observations.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_enforcement_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Enforcement observations are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    let triageStatus = payload.human_reviewed ? "manual_review" : "new"

    if (payload.request_takedown) {
      const gate = evaluateOutboundActionGate({
        hasActiveMandate: false,
        humanReviewed: payload.human_reviewed,
        automatedSubmissionEnabled: flags.music_rights_admin_automated_submission_enabled,
        autoTakedownEnabled: flags.music_rights_admin_auto_takedown_enabled,
        action: "takedown",
        matchConfidence: payload.confidence ?? 0,
      })
      if (!gate.allowed)
        return jsonError({
          status: 403,
          code: "takedown_blocked",
          message: gate.reason,
          retryable: false,
        })
      triageStatus = "escalated"
    } else if ((payload.confidence ?? 0) >= 0.7 && !payload.human_reviewed) {
      triageStatus = "manual_review"
    }

    const { data, error } = await supabase
      .from("music_enforcement_observations")
      .insert({
        owner_user_id: user.id,
        source_url: payload.source_url || null,
        capture_path: payload.capture_path || null,
        capture_sha256: payload.capture_sha256 || null,
        candidate_asset_id: payload.candidate_asset_id || null,
        confidence: payload.confidence ?? null,
        triage_status: triageStatus,
        human_reviewed: payload.human_reviewed,
      })
      .select("id, triage_status, confidence, human_reviewed")
      .single()

    if (error)
      return jsonError({ status: 500, code: "observation_create_failed", message: "Unable to create observation.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: RIGHTS_ADMIN_DISCLAIMER,
      note: "Fingerprint confidence alone never sends a takedown.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid observation payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "observation_create_failed", message: "Unable to create observation.", retryable: true })
  }
}
