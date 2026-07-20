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
  if (!flags.music_rights_intelligence_alerts_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence alerts are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_education_alerts")
    .select("id, content, status, published_at, created_at, is_recommendation")
    .eq("status", "published")
    .eq("is_recommendation", false)
    .order("published_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "alerts_query_failed", message: "Unable to load alerts.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    note: "Alerts are educational risk notices, not recommendations or enforcement actions.",
    enabled: true,
  })
}
