import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_data_vault_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative data vault is not available.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  await trusted.from("creator_data_vault_access_logs").insert({
    actor_id: user.id,
    access_class: "metadata",
    subject_type: "vault_summary",
    purpose: "member_dashboard",
    allowed: true,
  })

  const { count } = await trusted
    .from("creator_data_source_manifests")
    .select("id", { count: "exact", head: true })

  return NextResponse.json({
    data: {
      manifestCount: count || 0,
      rawDataExposed: false,
      accessClass: "metadata_only",
    },
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Raw cooperative vault data is never returned to clients.",
    enabled: true,
  })
}
