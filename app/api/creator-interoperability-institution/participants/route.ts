import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_INSTITUTION_DISCLAIMER } from "@/lib/music/creator-interoperability-institution/institution-disclaimer"
import { resolveCreatorInteropInstitutionFlags } from "@/lib/music/creator-interoperability-institution/creator-interop-institution-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropInstitutionFlags(supabase, user.id)
  if (
    !flags.creator_interop_institution_state_participation_enabled &&
    !flags.creator_interop_institution_observer_program_enabled &&
    !flags.creator_interop_institution_readiness_enabled
  )
    return jsonError({ status: 404, code: "feature_disabled", message: "Participant authority sandbox is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_interop_institution_participants")
    .select("id, institution_id, participant_class, authority_state, jurisdiction, live_membership, effective_at, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "participants_query_failed", message: "Unable to load participants.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_INTEROP_INSTITUTION_DISCLAIMER,
    note: "No live state membership. No membership inferred from Tourify accounts or Phase 15 participation.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "live_membership_blocked",
    message: "Live state membership and binding authority remain blocked in the first implementation slice.",
    retryable: false,
  })
}
