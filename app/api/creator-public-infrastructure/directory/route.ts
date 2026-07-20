import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { selectEligibleServices } from "@/lib/music/creator-public-infrastructure/service-directory"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_service_directory_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Service directory is not available.", retryable: false })

  if (flags.creator_public_infrastructure_public_api_enabled)
    return jsonError({
      status: 403,
      code: "public_api_gated",
      message: "Public API access remains separately gated and default-deny until counsel package.",
      retryable: false,
    })

  const capability = request.nextUrl.searchParams.get("capability") || "status_resolve"
  const jurisdiction = request.nextUrl.searchParams.get("jurisdiction") || undefined

  const { data, error } = await supabase
    .from("creator_public_service_directory")
    .select("id, organization_identifier, capability, endpoint_uri, jurisdictions, status, policy_version, health_checked_at")
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "directory_query_failed", message: "Unable to load service directory.", retryable: true })

  const eligible = selectEligibleServices({
    entries: (data || []).map((row: any) => ({
      status: row.status,
      capabilities: [row.capability],
      jurisdictions: row.jurisdictions || [],
      endpoint: row.endpoint_uri,
      healthCheckedAt: row.health_checked_at || new Date(0).toISOString(),
    })),
    capability,
    jurisdiction,
  })

  return NextResponse.json({
    data: { entries: data || [], eligible },
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Bilateral private discovery only — not collective action or universal marketplace.",
    enabled: true,
  })
}
