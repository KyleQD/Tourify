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
  if (!flags.creator_interop_institution_public_law_services_enabled && !flags.creator_interop_institution_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public-law service definitions are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_interop_institution_public_law_services")
    .select("id, institution_id, service_key, display_name, status, legal_basis_ref, jurisdiction_list, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "services_query_failed", message: "Unable to load service definitions.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_INTEROP_INSTITUTION_DISCLAIMER,
    note: "Sandbox service definitions only. Status defaults to sandbox; not live public-law services.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "public_law_service_activation_blocked",
    message: "Public-law service activation remains blocked until the Phase 16 activation gate and approval package execute.",
    retryable: false,
  })
}
