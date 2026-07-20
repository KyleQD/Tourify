import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_participation",
    "kill_switch_assets",
    "kill_switch_protocols",
    "kill_switch_registry",
    "kill_switch_operators",
    "kill_switch_transition",
    "kill_switch_public_api",
    "kill_switch_limited_production",
    "asset_custody_stop",
    "operator_failover_stop",
    "tourify_exit_freeze",
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
  kill_switch_readiness: ["creator_digital_commons_readiness_enabled"],
  kill_switch_participation: ["creator_digital_commons_participation_enabled"],
  kill_switch_assets: ["creator_digital_commons_asset_register_enabled", "creator_digital_commons_asset_escrow_enabled"],
  kill_switch_protocols: ["creator_digital_commons_protocol_governance_enabled"],
  kill_switch_registry: ["creator_digital_commons_registry_sandbox_enabled"],
  kill_switch_operators: ["creator_digital_commons_operator_accreditation_enabled", "creator_digital_commons_conformance_enabled"],
  kill_switch_transition: ["creator_digital_commons_transition_escrow_enabled"],
  kill_switch_public_api: ["creator_digital_commons_public_api_sandbox_enabled"],
  kill_switch_limited_production: ["creator_digital_commons_limited_production_enabled"],
  asset_custody_stop: [
    "creator_digital_commons_asset_register_enabled",
    "creator_digital_commons_asset_escrow_enabled",
    "creator_digital_commons_transition_escrow_enabled",
  ],
  operator_failover_stop: [
    "creator_digital_commons_operator_accreditation_enabled",
    "creator_digital_commons_conformance_enabled",
    "creator_digital_commons_public_api_sandbox_enabled",
  ],
  tourify_exit_freeze: [
    "creator_digital_commons_readiness_enabled",
    "creator_digital_commons_participation_enabled",
    "creator_digital_commons_transition_escrow_enabled",
    "creator_digital_commons_limited_production_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Digital commons ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_commons_outbox")
      .select("id, topic, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_digital_commons_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
    if (!flags.creator_digital_commons_readiness_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Digital commons ops are not available.", retryable: false })
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

    await trusted.from("creator_commons_audit_events").insert({
      actor_user_id: user.id,
      event_type: payload.action_type,
      aggregate_type: "feature_flags",
      aggregate_id: "creator_digital_commons",
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
      policy_version: "1.0.0",
      idempotency_key: `cc-ops:${payload.action_type}:${user.id}:${Date.now()}`,
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
