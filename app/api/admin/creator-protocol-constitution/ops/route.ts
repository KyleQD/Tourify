import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_membership",
    "kill_switch_amendments",
    "kill_switch_review",
    "kill_switch_assets",
    "kill_switch_operators",
    "kill_switch_forks",
    "kill_switch_limited_production",
    "fundamental_provision_freeze",
    "succession_crisis_stop",
    "emergency_sunset",
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
  kill_switch_readiness: ["creator_protocol_constitution_readiness_enabled"],
  kill_switch_membership: ["creator_protocol_compact_membership_enabled"],
  kill_switch_amendments: ["creator_protocol_amendment_process_enabled", "creator_protocol_public_deliberation_enabled"],
  kill_switch_review: ["creator_protocol_independent_review_enabled"],
  kill_switch_assets: ["creator_protocol_asset_covenant_enabled"],
  kill_switch_operators: ["creator_protocol_operator_constitution_enabled"],
  kill_switch_forks: ["creator_protocol_fork_continuity_sandbox_enabled"],
  kill_switch_limited_production: ["creator_protocol_limited_production_enabled"],
  fundamental_provision_freeze: [
    "creator_protocol_amendment_process_enabled",
    "creator_protocol_fundamental_provisions_enabled",
    "creator_protocol_limited_production_enabled",
  ],
  succession_crisis_stop: [
    "creator_protocol_fork_continuity_sandbox_enabled",
    "creator_protocol_operator_constitution_enabled",
    "creator_protocol_asset_covenant_enabled",
    "creator_protocol_limited_production_enabled",
  ],
  emergency_sunset: [
    "creator_protocol_constitution_readiness_enabled",
    "creator_protocol_compact_membership_enabled",
    "creator_protocol_amendment_process_enabled",
    "creator_protocol_limited_production_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_constitution_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Protocol constitution ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_protocol_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_protocol_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
    if (!flags.creator_protocol_constitution_readiness_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Protocol constitution ops are not available.", retryable: false })
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

    await trusted.from("creator_protocol_audit_events").insert({
      event_type: payload.action_type,
      actor_type: "admin",
      actor_id: user.id,
      subject_type: "feature_flags",
      subject_id: null,
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
      event_hash: `cpc-ops:${payload.action_type}:${user.id}:${Date.now()}`,
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
