import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { evaluateSuccession } from "@/lib/music/creator-protocol-constitution/succession-and-fork-policy"

export const dynamic = "force-dynamic"

const EXIT_CHECKLIST = [
  "authority_chain_documented",
  "successor_qualified",
  "continuity_package_current",
  "local_exit_available",
  "asset_schedule_verified",
  "tourify_unavailable_drill",
  "legitimate_fork_namespace_reserved",
]

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_fork_continuity_sandbox_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Succession/fork sandbox is not available.", retryable: false })

  const [{ data: cases }, { data: forks }] = await Promise.all([
    supabase
      .from("creator_protocol_succession_cases")
      .select("id, constitution_id, trigger, status, checklist, policy_version, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_protocol_forks")
      .select("id, parent_protocol_version, fork_protocol_version, namespace_status, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const succession = evaluateSuccession({
    trigger: "planned",
    approvedAuthorityChain: false,
    successorQualified: false,
    continuityPackageCurrent: false,
    localExitAvailable: false,
    assetScheduleVerified: false,
  })

  return NextResponse.json({
    data: {
      cases: cases || [],
      forks: forks || [],
      exitChecklist: EXIT_CHECKLIST,
      succession,
      drillReleaseBlocked: true,
    },
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Succession/fork drill stubs only — release blocked without counsel package.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "succession_release_blocked",
    message: "Succession case completion remains blocked until drills and counsel package complete.",
    retryable: false,
  })
}
