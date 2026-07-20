import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { screenCompetitionSensitiveTopic } from "@/lib/music/rights-intelligence/antitrust-guard"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  purpose: z.string().default("negotiation_readiness"),
  topic_summary: z.string().min(1),
  jurisdiction_policy: z.record(z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_groups_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Negotiation readiness groups are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_negotiation_groups")
    .select("id, public_id, group_type, purpose, legal_status, state, external_action_enabled, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "groups_query_failed", message: "Unable to load groups.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    note: "Groups default to readiness_only with external_action_enabled=false.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_groups_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Negotiation readiness groups are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())

    const screen = screenCompetitionSensitiveTopic(payload.topic_summary)
    if (!screen.allowed)
      return jsonError({
        status: 403,
        code: "competition_sensitive_topic",
        message: "Topic failed competition sensitivity screen.",
        retryable: false,
        issues: screen.matchedPatterns,
      })

    const { data, error } = await supabase
      .from("music_intelligence_negotiation_groups")
      .insert({
        group_type: "readiness",
        purpose: payload.purpose,
        jurisdiction_policy: payload.jurisdiction_policy,
        legal_status: "educational",
        state: "readiness_only",
        external_action_enabled: false,
        created_by: user.id,
      })
      .select("id, public_id, state, external_action_enabled, legal_status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "group_create_failed", message: "Unable to create group.", retryable: true })

    await supabase.from("music_intelligence_negotiation_memberships").insert({
      group_id: data.id,
      user_id: user.id,
      status: "active",
      joined_at: new Date().toISOString(),
    })

    return NextResponse.json({
      data,
      topicScreen: screen,
      disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid group payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "group_create_failed", message: "Unable to create group.", retryable: true })
  }
}
