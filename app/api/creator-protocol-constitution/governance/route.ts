import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_public_status_enabled && !flags.creator_protocol_constitution_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public status stubs are not available.", retryable: false })

  const [{ data: incidents }, { data: projections }, { data: decisions }] = await Promise.all([
    supabase
      .from("creator_protocol_incidents")
      .select("id, severity, incident_type, status, public_summary, declared_at, expires_at")
      .order("declared_at", { ascending: false })
      .limit(25),
    supabase
      .from("creator_protocol_public_projections")
      .select("id, projection_type, source_type, source_id, source_version, disputed, suspended, revoked, fresh_until")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("creator_protocol_decisions")
      .select("id, amendment_id, decision_type, status, decided_at, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
  ])

  return NextResponse.json({
    data: {
      incidents: incidents || [],
      projections: projections || [],
      decisions: decisions || [],
      multiRootTrust: { available: false, gated: !flags.creator_protocol_multi_root_trust_enabled },
      compactSandbox: { available: false, gated: !flags.creator_protocol_compact_sandbox_enabled },
    },
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Sandbox transparency / multi-root trust stubs only.",
    enabled: true,
  })
}
