import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_cooperative_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative readiness is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_cooperative_entities")
    .select("id, public_id, legal_name, jurisdiction, entity_type, readiness_status, production_authority, governing_document_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "entities_query_failed", message: "Unable to load entities.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Entity records are readiness-only; production_authority remains false without counsel/board approvals.",
    enabled: true,
  })
}
