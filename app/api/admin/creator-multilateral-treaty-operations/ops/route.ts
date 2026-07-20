import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorTreatyOpsFlags } from "@/lib/music/creator-multilateral-treaty-operations/creator-treaty-ops-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_review",
    "kill_switch_registries",
    "public_law_claim_stop",
    "competence_stop",
    "depositary_stop",
    "treaty_ops_freeze",
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
  kill_switch_readiness: ["creator_treaty_ops_readiness_enabled"],
  kill_switch_review: [
    "creator_treaty_ops_periodic_review_enabled",
    "creator_treaty_ops_review_evidence_enabled",
    "creator_treaty_ops_governing_body_sessions_enabled",
    "creator_treaty_ops_implementation_reporting_enabled",
  ],
  kill_switch_registries: ["creator_treaty_ops_public_registries_enabled"],
  public_law_claim_stop: [
    "creator_treaty_ops_public_registries_enabled",
    "creator_treaty_ops_relationship_agreements_enabled",
    "creator_treaty_ops_public_service_obligations_enabled",
    "creator_treaty_ops_readiness_enabled",
  ],
  competence_stop: [
    "creator_treaty_ops_institutional_reform_enabled",
    "creator_treaty_ops_protocol_amendment_enabled",
  ],
  depositary_stop: ["creator_treaty_ops_private_custody_enabled"],
  treaty_ops_freeze: [
    "creator_treaty_ops_readiness_enabled",
    "creator_treaty_ops_multi_year_evidence_enabled",
    "creator_treaty_ops_legal_character_enabled",
    "creator_treaty_ops_administration_enabled",
    "creator_treaty_ops_periodic_review_enabled",
    "creator_treaty_ops_governing_body_sessions_enabled",
    "creator_treaty_ops_review_evidence_enabled",
    "creator_treaty_ops_implementation_reporting_enabled",
    "creator_treaty_ops_public_registries_enabled",
    "creator_treaty_ops_private_custody_enabled",
    "creator_treaty_ops_relationship_agreements_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorTreatyOpsFlags(supabase, user.id)
  if (!flags.creator_treaty_ops_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Treaty operations ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_treaty_ops_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_treaty_ops_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorTreatyOpsFlags(supabase, user.id)
    if (!flags.creator_treaty_ops_readiness_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Treaty operations ops are not available.", retryable: false })
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

    await trusted.from("creator_treaty_ops_audit_events").insert({
      event_type: payload.action_type,
      actor_type: "admin",
      actor_id: user.id,
      subject_type: "feature_flags",
      subject_id: "creator_treaty_ops",
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
      event_hash: `p17-ops:${payload.action_type}:${user.id}:${Date.now()}`,
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
