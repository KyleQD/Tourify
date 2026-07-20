import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"
import { calculateUnderwritingScore } from "@/lib/music/institutional/underwriting-score"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  transaction_case_id: z.string().uuid(),
  buyer_organization_id: z.string().uuid(),
  snapshot_id: z.string().uuid(),
  version: z.number().int().positive().default(1),
  model_version: z.string().default("tourify_uw_v1"),
  factors: z.array(z.object({
    key: z.string(),
    scoreBasisPoints: z.number().int(),
    weightBasisPoints: z.number().int(),
    confidenceBasisPoints: z.number().int(),
  })).min(1),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_underwriting_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional underwriting is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    let score
    try {
      score = calculateUnderwritingScore(payload.factors)
    } catch (err) {
      return jsonError({
        status: 400,
        code: "underwriting_score_invalid",
        message: err instanceof Error ? err.message : "Invalid underwriting factors.",
        retryable: false,
      })
    }

    const { data, error } = await supabase
      .from("music_institutional_underwriting_cases")
      .insert({
        transaction_case_id: payload.transaction_case_id,
        buyer_organization_id: payload.buyer_organization_id,
        snapshot_id: payload.snapshot_id,
        version: payload.version,
        model_version: payload.model_version,
        status: "review",
        score_basis_points: score.weightedScoreBasisPoints,
        confidence_basis_points: score.confidenceBasisPoints,
        score_trace: score.trace,
      })
      .select("id, transaction_case_id, version, status, score_basis_points, confidence_basis_points, disclaimer")
      .single()

    if (error)
      return jsonError({ status: 500, code: "underwriting_create_failed", message: "Unable to create underwriting case.", retryable: true })

    void user
    return NextResponse.json({
      data,
      note: "Underwriting scores are analytical estimates, not NAV, appraisals, or investment recommendations.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid underwriting payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "underwriting_create_failed", message: "Unable to create underwriting case.", retryable: true })
  }
}
