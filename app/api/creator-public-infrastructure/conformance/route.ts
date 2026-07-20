import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { evaluateConformanceGate } from "@/lib/music/creator-public-infrastructure/conformance-gate"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const runSchema = z.object({
  subject_identifier: z.string().min(1),
  profile_id: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_conformance_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Conformance is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_public_conformance_runs")
    .select("id, subject_identifier, profile_id, status, completed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "conformance_query_failed", message: "Unable to load conformance runs.", retryable: true })

  const gate = evaluateConformanceGate({
    profileApproved: false,
    automatedTestsPassed: true,
    securityReviewPassed: false,
    privacyReviewPassed: false,
    accessibilityReviewPassed: false,
    unresolvedCriticalFindings: 1,
  })

  return NextResponse.json({
    data: data || [],
    gate,
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
    if (!flags.creator_public_infrastructure_conformance_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Conformance is not available.", retryable: false })

    const payload = runSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("creator_public_conformance_runs")
      .insert({
        subject_identifier: payload.subject_identifier,
        profile_id: payload.profile_id,
        status: "queued",
        evidence_json: { queued_by: user.id, sandbox: true },
      })
      .select("id, subject_identifier, profile_id, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "conformance_create_failed", message: "Unable to queue conformance run.", retryable: true })

    return NextResponse.json({ data, disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid conformance payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "conformance_create_failed", message: "Unable to queue conformance run.", retryable: true })
  }
}
