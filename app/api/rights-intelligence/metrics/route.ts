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
  if (!flags.music_rights_intelligence_metrics_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence metrics are not available.", retryable: false })

  const [{ data: definitions, error: defError }, { data: runs, error: runError }] = await Promise.all([
    supabase
      .from("music_intelligence_metric_definitions")
      .select("id, code, version, purpose, formula, prohibited_interpretations, status")
      .eq("status", "approved")
      .order("code", { ascending: true })
      .limit(100),
    supabase
      .from("music_intelligence_metric_runs")
      .select("id, metric_definition_id, cohort_id, review_status, created_at")
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  if (defError || runError)
    return jsonError({ status: 500, code: "metrics_query_failed", message: "Unable to load metrics.", retryable: true })

  return NextResponse.json({
    data: { definitions: definitions || [], runs: runs || [] },
    disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    enabled: true,
  })
}
