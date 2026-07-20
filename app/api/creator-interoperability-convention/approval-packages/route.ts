import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_CONVENTION_DISCLAIMER } from "@/lib/music/creator-interoperability-convention/interop-convention-disclaimer"
import { resolveCreatorInteropConventionFlags } from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags"
import { evaluateApprovalPackage } from "@/lib/music/creator-interoperability-convention/approval-package-gate"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)
  if (!flags.creator_interop_approval_package_enabled && !flags.creator_interop_convention_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Approval packages are not available.", retryable: false })

  const { data, error } = await supabase
    .from("future_phase14_approval_packages")
    .select("id, package_key, status, title, jurisdiction, dual_control, public_notice_complete, independent_review_complete, state_or_io_participation_requested, state_or_io_package_attached, policy_version, executed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "packages_query_failed", message: "Unable to load approval packages.", retryable: true })

  const evaluated = (data || []).map((row: any) => ({
    ...row,
    gate: evaluateApprovalPackage({
      packageStatus: row.status,
      dualControl: row.dual_control,
      publicNoticeComplete: row.public_notice_complete,
      independentReviewComplete: row.independent_review_complete,
      stateOrIoParticipationRequested: row.state_or_io_participation_requested,
      stateOrIoPackageAttached: row.state_or_io_package_attached,
    }),
  }))

  return NextResponse.json({
    data: evaluated,
    disclaimer: CREATOR_INTEROP_CONVENTION_DISCLAIMER,
    note: "IO/state participation requires a separate attached package and remains hard-gated.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "approval_execution_blocked",
    message: "Approval package execution remains blocked until counsel and dual-control package complete.",
    retryable: false,
  })
}
