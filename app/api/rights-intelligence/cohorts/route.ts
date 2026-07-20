import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { evaluateAggregationPolicy } from "@/lib/music/rights-intelligence/aggregation-policy"

export const dynamic = "force-dynamic"

const evaluateSchema = z.object({
  observations: z.array(z.object({
    participantId: z.string().min(1),
    controllerId: z.string().min(1),
    weight: z.number().positive(),
    observedAt: z.string().datetime(),
  })).default([]),
  policy: z.object({
    minimumParticipants: z.number().int().positive().default(25),
    minimumIndependentControllers: z.number().int().positive().default(5),
    maximumParticipantWeightBps: z.number().int().positive().default(2000),
    minimumAgeDays: z.number().int().nonnegative().default(90),
    suppressOutliers: z.boolean().default(true),
  }).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_cohorts_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence cohorts are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_cohorts")
    .select("id, code, version, definition, threshold_policy, status, created_at")
    .in("status", ["ready", "suppressed"])
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "cohorts_query_failed", message: "Unable to load cohorts.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_cohorts_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence cohorts are not available.", retryable: false })

    const payload = evaluateSchema.parse(await request.json())
    const decision = evaluateAggregationPolicy({
      observations: payload.observations,
      policy: {
        minimumParticipants: payload.policy.minimumParticipants ?? 25,
        minimumIndependentControllers: payload.policy.minimumIndependentControllers ?? 5,
        maximumParticipantWeightBps: payload.policy.maximumParticipantWeightBps ?? 2000,
        minimumAgeDays: payload.policy.minimumAgeDays ?? 90,
        suppressOutliers: payload.policy.suppressOutliers ?? true,
      },
      nowIso: new Date().toISOString(),
    })

    return NextResponse.json({
      data: { decision },
      disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
      note: "Pseudonymized cohort membership is not anonymous without re-identification assessment.",
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid cohort evaluation payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "cohort_evaluate_failed", message: "Unable to evaluate cohort.", retryable: true })
  }
}
