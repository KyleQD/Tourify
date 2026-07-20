import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateContinuity } from "@/lib/music/creator-digital-commons/service-continuity-policy"

export const dynamic = "force-dynamic"

const EXIT_CHECKLIST = [
  "export_manifest_complete",
  "escrow_keys_verified",
  "domain_recovery_tested",
  "independent_operator_nominated",
  "participant_records_portable",
  "rights_sources_unchanged",
  "rollback_plan_documented",
]

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_transition_escrow_enabled && !flags.creator_digital_commons_asset_escrow_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Transition escrow planner is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_commons_transition_packages")
    .select("id, package_version, status, manifest_hash, escrow_verified_at, release_conditions, checklist, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "transition_query_failed", message: "Unable to load transition packages.", retryable: true })

  const continuity = evaluateContinuity({
    tourifyUnavailable: false,
    independentBuildSucceeded: false,
    independentOperatorAvailable: false,
    currentAssetEscrowVerified: false,
    exportRestoreSucceeded: false,
    keyAndDomainRecoverySucceeded: false,
    participantRecordsPreserved: false,
    rightsSourcesUnchanged: true,
    policyVersion: "1.0.0",
  })

  return NextResponse.json({
    data: {
      packages: data || [],
      exitChecklist: EXIT_CHECKLIST,
      continuity,
      releaseBlocked: true,
    },
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Tourify-exit planner stubs only — irreversible release blocked.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "transition_release_blocked",
    message: "Transition package release remains blocked until escrow drills and counsel package complete.",
    retryable: false,
  })
}
