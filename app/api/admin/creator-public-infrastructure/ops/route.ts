import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_participation",
    "kill_switch_identifiers",
    "kill_switch_trust",
    "kill_switch_credentials",
    "kill_switch_resolver",
    "kill_switch_directory",
    "kill_switch_conformance",
    "kill_switch_cross_border",
    "kill_switch_public_api",
    "identifier_abuse_stop",
    "trust_compromise_stop",
    "participation_withdrawal_broadcast",
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
  kill_switch_readiness: ["creator_public_infrastructure_readiness_enabled"],
  kill_switch_participation: ["creator_public_infrastructure_participation_enabled"],
  kill_switch_identifiers: ["creator_public_infrastructure_identifier_enabled"],
  kill_switch_trust: ["creator_public_infrastructure_trust_registry_enabled"],
  kill_switch_credentials: ["creator_public_infrastructure_credentials_enabled"],
  kill_switch_resolver: ["creator_public_infrastructure_rights_resolver_enabled"],
  kill_switch_directory: ["creator_public_infrastructure_service_directory_enabled"],
  kill_switch_conformance: ["creator_public_infrastructure_conformance_enabled"],
  kill_switch_cross_border: ["creator_public_infrastructure_cross_border_enabled"],
  kill_switch_public_api: ["creator_public_infrastructure_public_api_enabled"],
  identifier_abuse_stop: [
    "creator_public_infrastructure_identifier_enabled",
    "creator_public_infrastructure_credentials_enabled",
    "creator_public_infrastructure_public_api_enabled",
  ],
  trust_compromise_stop: [
    "creator_public_infrastructure_trust_registry_enabled",
    "creator_public_infrastructure_credentials_enabled",
    "creator_public_infrastructure_rights_resolver_enabled",
    "creator_public_infrastructure_service_directory_enabled",
    "creator_public_infrastructure_public_api_enabled",
  ],
  participation_withdrawal_broadcast: ["creator_public_infrastructure_participation_enabled"],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Public-infrastructure ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_public_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_public_infrastructure_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
    if (!flags.creator_public_infrastructure_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Public-infrastructure ops are not available.", retryable: false })
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

    await trusted.from("creator_public_audit_events").insert({
      actor_user_id: user.id,
      event_type: payload.action_type,
      object_type: "feature_flags",
      object_id: "creator_public_infrastructure",
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
