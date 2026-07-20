import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_membership",
    "kill_switch_credentials",
    "kill_switch_mandates",
    "kill_switch_directory",
    "kill_switch_cross_border",
    "kill_switch_governance",
    "kill_switch_representation",
    "kill_switch_collective_licensing",
    "kill_switch_collective_bargaining",
    "credential_compromise_stop",
    "federation_partition_stop",
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
  kill_switch_readiness: ["creator_federation_readiness_enabled"],
  kill_switch_membership: ["creator_federation_membership_enabled"],
  kill_switch_credentials: ["creator_federation_credentials_enabled", "creator_federation_trust_registry_enabled", "creator_federation_wallet_interop_enabled"],
  kill_switch_mandates: ["creator_federation_mandates_enabled"],
  kill_switch_directory: ["creator_federation_service_directory_enabled", "creator_federation_public_api_enabled"],
  kill_switch_cross_border: ["creator_federation_cross_border_data_enabled"],
  kill_switch_governance: ["creator_federation_governance_enabled", "creator_federation_voting_enabled"],
  kill_switch_representation: ["creator_federation_representation_network_enabled"],
  kill_switch_collective_licensing: ["creator_federation_collective_licensing_enabled"],
  kill_switch_collective_bargaining: ["creator_federation_collective_bargaining_enabled"],
  credential_compromise_stop: [
    "creator_federation_credentials_enabled",
    "creator_federation_trust_registry_enabled",
    "creator_federation_mandates_enabled",
    "creator_federation_wallet_interop_enabled",
    "creator_federation_public_api_enabled",
  ],
  federation_partition_stop: [
    "creator_federation_membership_enabled",
    "creator_federation_credentials_enabled",
    "creator_federation_mandates_enabled",
    "creator_federation_service_directory_enabled",
    "creator_federation_cross_border_data_enabled",
    "creator_federation_governance_enabled",
    "creator_federation_voting_enabled",
    "creator_federation_representation_network_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Federation ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_federation_outbox_events")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_federation_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Federation ops are not available.", retryable: false })
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

    await trusted.from("creator_federation_audit_events").insert({
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
