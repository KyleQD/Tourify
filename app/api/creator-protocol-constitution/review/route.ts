import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { canTransitionReview } from "@/lib/music/creator-protocol-constitution/appeal-review-state-machine"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const fileSchema = z.object({
  challenged_decision_id: z.string().uuid().optional(),
  requested_relief: z.array(z.string()).default(["sandbox_review"]),
  confidentiality: z.enum(["public", "restricted"]).default("public"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_independent_review_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Independent review is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_protocol_review_cases")
    .select("id, challenged_decision_id, status, requested_relief, confidentiality, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "review_query_failed", message: "Unable to load review cases.", retryable: true })

  return NextResponse.json({
    data: data || [],
    canScreen: canTransitionReview("filed", "screening"),
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Sandbox independent review only — not a constitutional court.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
    if (!flags.creator_protocol_independent_review_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Independent review is not available.", retryable: false })

    const payload = fileSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("creator_protocol_review_cases")
      .insert({
        challenged_decision_id: payload.challenged_decision_id || null,
        filer_user_id: user.id,
        status: "filed",
        requested_relief: payload.requested_relief,
        confidentiality: payload.confidentiality,
        policy_version: "1.0.0",
      })
      .select("id, status, requested_relief, confidentiality")
      .single()

    if (error)
      return jsonError({ status: 500, code: "review_file_failed", message: "Unable to file review case.", retryable: true })

    return NextResponse.json({ data, disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid review payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "review_file_failed", message: "Unable to file review case.", retryable: true })
  }
}
