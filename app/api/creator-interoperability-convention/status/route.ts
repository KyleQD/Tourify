import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_INTEROP_CONVENTION_DISCLAIMER } from "@/lib/music/creator-interoperability-convention/interop-convention-disclaimer"
import { resolveCreatorInteropConventionFlags } from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)
  if (!flags.creator_interop_public_status_enabled && !flags.creator_interop_convention_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public status stubs are not available.", retryable: false })

  const [{ data: incidents }, { data: projections }, { data: profiles }] = await Promise.all([
    supabase
      .from("creator_interop_incidents")
      .select("id, severity, incident_type, status, public_summary, declared_at, expires_at")
      .order("declared_at", { ascending: false })
      .limit(25),
    supabase
      .from("creator_interop_public_projections")
      .select("id, projection_type, source_type, source_id, source_version, disputed, suspended, revoked, fresh_until")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("creator_interop_profiles")
      .select("id, network_id, profile_key, version, status, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  return NextResponse.json({
    data: {
      incidents: incidents || [],
      projections: projections || [],
      profiles: profiles || [],
    },
    disclaimer: CREATOR_INTEROP_CONVENTION_DISCLAIMER,
    enabled: true,
  })
}
