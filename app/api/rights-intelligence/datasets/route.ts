import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_datasets_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence datasets are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_dataset_versions")
    .select("id, purpose_id, quality_status, privacy_status, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "datasets_query_failed", message: "Unable to load datasets.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    note: "Dataset versions consume Phase 7 mirrors/events only; never rewrite passport/licence/admin source rows.",
    enabled: true,
  })
}
