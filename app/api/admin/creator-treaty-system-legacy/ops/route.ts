import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorTreatyLegacyFlags } from "@/lib/music/creator-treaty-system-legacy/creator-treaty-legacy-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_custody",
    "kill_switch_identifiers",
    "public_law_claim_stop",
    "legacy_freeze",
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
  kill_switch_readiness: ["creator_treaty_legacy_readiness_enabled"],
  kill_switch_custody: [
    "creator_treaty_legacy_successor_custody_enabled",
    "creator_treaty_legacy_century_scale_strategy_enabled",
  ],
  kill_switch_identifiers: [
    "creator_treaty_legacy_identifier_resolution_enabled",
    "creator_treaty_legacy_protocol_resolution_enabled",
  ],
  public_law_claim_stop: [
    "creator_treaty_legacy_readiness_enabled",
    "creator_treaty_legacy_public_legitimacy_enabled",
    "creator_treaty_legacy_cultural_continuity_enabled",
  ],
  legacy_freeze: [
    "creator_treaty_legacy_readiness_enabled",
    "creator_treaty_legacy_century_scale_strategy_enabled",
    "creator_treaty_legacy_successor_custody_enabled",
    "creator_treaty_legacy_cultural_continuity_enabled",
    "creator_treaty_legacy_identifier_resolution_enabled",
    "creator_treaty_legacy_protocol_resolution_enabled",
    "creator_treaty_legacy_post_dissolution_stewardship_enabled",
    "creator_treaty_legacy_sensitive_archive_ethics_enabled",
    "creator_treaty_legacy_open_specs_enabled",
    "creator_treaty_legacy_funding_continuity_enabled",
    "creator_treaty_legacy_disaster_recovery_enabled",
    "creator_treaty_legacy_provider_independence_enabled",
    "creator_treaty_legacy_public_legitimacy_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
  if (!flags.creator_treaty_legacy_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Treaty legacy ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_treaty_legacy_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_treaty_legacy_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorTreatyLegacyFlags(supabase, user.id)
    if (!flags.creator_treaty_legacy_readiness_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Treaty legacy ops are not available.", retryable: false })
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

    await trusted.from("creator_treaty_legacy_audit_events").insert({
      event_type: payload.action_type,
      actor_type: "admin",
      actor_id: user.id,
      subject_type: "feature_flags",
      subject_id: "creator_treaty_legacy",
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
      event_hash: `p19-ops:${payload.action_type}:${user.id}:${Date.now()}`,
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
