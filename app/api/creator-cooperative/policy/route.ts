import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { policySourceIsCurrent } from "@/lib/music/creator-cooperative/policy-source-validity"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.policy_observatory_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Policy observatory is not available.", retryable: false })

  const { data, error } = await supabase

    .from("creator_policy_sources")
    .select("id, jurisdiction, source_url, source_type, status, published_at, review_by, summary")
    .in("status", ["reviewed", "published", "stale"])
    .order("published_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "policy_query_failed", message: "Unable to load policy sources.", retryable: true })

  const now = new Date().toISOString()
  const items = (data || []).map((row: Record<string, any>) => ({
    ...row,
    current: policySourceIsCurrent({
      source: {
        publishedAt: row.published_at,
        reviewedAt: row.published_at,
        reviewBy: row.review_by,
        status: row.status === "published" || row.status === "reviewed" ? "enacted" : "guidance",
      },
      now,
    }),
    educationalOnly: true,
  }))

  return NextResponse.json({
    data: items,
    disclaimer: CREATOR_COOPERATIVE_DISCLAIMER,
    note: "Policy observatory content is educational, not legal advice or lobbying.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  return jsonError({
    status: 403,
    code: "policy_submission_blocked",
    message: "Public policy submissions and lobbying activation remain counsel-gated.",
    retryable: false,
  })
}
