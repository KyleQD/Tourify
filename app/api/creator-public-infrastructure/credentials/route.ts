import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_credentials_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Credentials are not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_public_credentials")
    .select("id, subject_identifier, schema_uri, status, issued_at, expires_at, source_record_type, source_record_id, source_record_version")
    .order("issued_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "credentials_query_failed", message: "Unable to load credentials.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Credentials are signed statements only and never authorize licensing or enforcement.",
    enabled: true,
  })
}
