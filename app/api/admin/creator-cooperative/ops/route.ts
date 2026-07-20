import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_membership",
    "kill_switch_contribution",
    "kill_switch_vault",
    "kill_switch_research",
    "kill_switch_policy",
    "kill_switch_standards",
    "kill_switch_collective",
    "kill_switch_benefits",
    "kill_switch_representation",
    "kill_switch_cross_border",
    "privacy_incident_stop",
    "research_misconduct_stop",
  ]),
  dual_control_required: z.boolean().default(true),
  payload: z.record(z.unknown()).default({}),
})

async function assertAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("admin_level, is_admin")
    .eq("id", userId)
    .maybeSingle()
  if (!data) return false
  if (data.is_admin === true) return true
  return Number(data.admin_level || 0) >= 1
}

const killMap: Record<string, string[]> = {
  kill_switch_readiness: ["creator_cooperative_readiness_enabled"],
  kill_switch_membership: ["creator_cooperative_membership_enabled"],
  kill_switch_contribution: ["creator_data_contribution_enabled"],
  kill_switch_vault: ["creator_data_vault_enabled"],
  kill_switch_research: ["research_exchange_private_beta_enabled", "research_clean_room_enabled", "external_research_licensing_enabled"],
  kill_switch_policy: ["policy_observatory_enabled", "public_policy_submission_enabled"],
  kill_switch_standards: ["standards_participation_workspace_enabled"],
  kill_switch_collective: ["collective_entity_readiness_enabled", "collective_representation_enabled"],
  kill_switch_benefits: ["member_benefit_allocation_enabled"],
  kill_switch_representation: ["collective_representation_enabled"],
  kill_switch_cross_border: ["cross_border_research_enabled"],
  privacy_incident_stop: [
    "creator_data_contribution_enabled",
    "creator_data_vault_enabled",
    "research_exchange_private_beta_enabled",
    "research_clean_room_enabled",
    "external_research_licensing_enabled",
    "cross_border_research_enabled",
  ],
  research_misconduct_stop: [
    "research_exchange_private_beta_enabled",
    "research_clean_room_enabled",
    "external_research_licensing_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
  if (!flags.creator_cooperative_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_cooperative_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .or("key.like.creator_cooperative_%,key.like.creator_data_%,key.like.research_%,key.like.policy_%,key.like.standards_%,key.like.collective_%,key.like.member_benefit_%,key.like.cooperative_token_%,key.like.cross_border_%,key.like.public_policy_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
    if (!flags.creator_cooperative_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Cooperative ops are not available.", retryable: false })
    if (!(await assertAdmin(supabase, user.id)))
      return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

    const payload = actionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const flagKeys = killMap[payload.action_type] || []
    for (const flagKey of flagKeys) {
      await trusted
        .from("feature_flags")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("key", flagKey)
    }

    await trusted.from("creator_cooperative_audit_events").insert({
      actor_id: user.id,
      action: payload.action_type,
      subject_type: "feature_flags",
      metadata: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
