import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { policyFreshness } from "@/lib/music/rights-intelligence/policy-freshness"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_education_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence education is not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_policy_versions")
    .select("id, summary, affected_domains, review_by, status, created_at, source_id")
    .in("status", ["reviewed", "published", "stale"])
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "education_query_failed", message: "Unable to load education content.", retryable: true })

  const nowIso = new Date().toISOString()
  const items = (data || []).map((row) => ({
    ...row,
    freshness: policyFreshness({ publishedAt: row.created_at, reviewBy: row.review_by }, nowIso),
    educationalOnly: true,
  }))

  return NextResponse.json({
    data: items,
    disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    note: "Educational summaries are not legal advice.",
    enabled: true,
  })
}
