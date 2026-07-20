import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { screenCompetitionSensitiveTopic } from "@/lib/music/rights-intelligence/antitrust-guard"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  body_text: z.string().min(1),
  proposal_class: z.enum(["education", "readiness", "simulation"]).default("education"),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_groups_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Negotiation readiness groups are not available.", retryable: false })

  const { id } = await context.params
  const { data, error } = await supabase
    .from("music_intelligence_negotiation_proposals")
    .select("id, proposal_class, body, topic_screen, status, created_at")
    .eq("group_id", id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "proposals_query_failed", message: "Unable to load proposals.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER, enabled: true })
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_groups_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Negotiation readiness groups are not available.", retryable: false })

    const { id } = await context.params
    const { data: group } = await supabase
      .from("music_intelligence_negotiation_groups")
      .select("id, state, external_action_enabled")
      .eq("id", id)
      .maybeSingle()

    if (!group)
      return jsonError({ status: 404, code: "group_not_found", message: "Group not found.", retryable: false })
    if (group.external_action_enabled)
      return jsonError({ status: 403, code: "external_action_blocked", message: "External action must remain disabled.", retryable: false })
    if (group.state !== "readiness_only" && group.state !== "approved_for_simulation")
      return jsonError({ status: 403, code: "group_state_blocked", message: "Proposals only allowed in readiness/simulation states.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const screen = screenCompetitionSensitiveTopic(payload.body_text)
    const status = screen.allowed ? "screened" : "blocked"

    const { data, error } = await supabase
      .from("music_intelligence_negotiation_proposals")
      .insert({
        group_id: id,
        proposal_class: payload.proposal_class,
        body: { text: payload.body_text },
        topic_screen: screen,
        status,
        created_by: user.id,
      })
      .select("id, status, topic_screen, proposal_class")
      .single()

    if (error)
      return jsonError({ status: 500, code: "proposal_create_failed", message: "Unable to create proposal.", retryable: true })

    if (!screen.allowed)
      return jsonError({
        status: 403,
        code: "competition_sensitive_topic",
        message: "Proposal blocked by competition sensitivity screen.",
        retryable: false,
        issues: screen.matchedPatterns,
      })

    return NextResponse.json({ data, disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid proposal payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "proposal_create_failed", message: "Unable to create proposal.", retryable: true })
  }
}
