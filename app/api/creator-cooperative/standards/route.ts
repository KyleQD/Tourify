import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { standardsProposalCanBeSubmitted } from "@/lib/music/creator-cooperative/standards-proposal-state-machine"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.standards_participation_workspace_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Standards workspace is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_standards_contributions")
    .select("id, standards_body, project_name, state, ipr_review_status, board_approval_status, submission_reference, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "standards_query_failed", message: "Unable to load standards contributions.", retryable: true })

  const canSubmit = standardsProposalCanBeSubmitted({
    state: "board_approval",
    iprApproved: false,
    boardApproved: false,
    representativeAuthorized: false,
  })

  return NextResponse.json({
    data: data || [],
    submissionGate: { canSubmit, reason: "requires_ipr_board_and_representative_authorization" },
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    enabled: true,
  })
}
