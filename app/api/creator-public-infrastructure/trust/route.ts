import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { isTrustedFor } from "@/lib/music/creator-public-infrastructure/trust-registry-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_trust_registry_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Trust registry is not available.", retryable: false })

  const scope = request.nextUrl.searchParams.get("scope") || "participation"
  const jurisdiction = request.nextUrl.searchParams.get("jurisdiction") || undefined

  const { data, error } = await supabase
    .from("creator_public_trust_registry_entries")
    .select("id, entity_id, subject_identifier, role, scopes, jurisdictions, status, policy_version, recognized_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "trust_query_failed", message: "Unable to load trust registry.", retryable: true })

  const now = new Date()
  const projected = (data || []).map((entry: any) => ({
    ...entry,
    trusted_for_scope: isTrustedFor({
      entry: {
        status: entry.status,
        scopes: entry.scopes || [],
        jurisdictions: entry.jurisdictions || [],
        expiresAt: entry.expires_at || undefined,
      },
      scope,
      jurisdiction,
      now,
    }),
  }))

  return NextResponse.json({
    data: projected,
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Trust projections are not licensing authority.",
    enabled: true,
  })
}
