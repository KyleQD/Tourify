import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorInteropOrgFlags } from "@/lib/music/creator-interoperability-organization/creator-interop-org-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_governance",
    "kill_switch_headquarters",
    "kill_switch_public_registry",
    "public_law_claim_stop",
    "privileges_stop",
    "un_relationship_stop",
    "organization_freeze",
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
  kill_switch_readiness: ["creator_interop_org_readiness_enabled"],
  kill_switch_governance: [
    "creator_interop_org_governance_sandbox_enabled",
    "creator_interop_org_constitutive_drafting_enabled",
    "creator_interop_org_participant_applications_enabled",
  ],
  kill_switch_headquarters: ["creator_interop_org_headquarters_readiness_enabled"],
  kill_switch_public_registry: ["creator_interop_org_public_registry_enabled"],
  public_law_claim_stop: [
    "creator_interop_org_public_registry_enabled",
    "creator_interop_org_relationship_agreements_enabled",
    "creator_interop_org_readiness_enabled",
  ],
  privileges_stop: ["creator_interop_org_headquarters_readiness_enabled"],
  un_relationship_stop: ["creator_interop_org_relationship_agreements_enabled"],
  organization_freeze: [
    "creator_interop_org_readiness_enabled",
    "creator_interop_org_entity_options_enabled",
    "creator_interop_org_constitutive_drafting_enabled",
    "creator_interop_org_participant_applications_enabled",
    "creator_interop_org_governance_sandbox_enabled",
    "creator_interop_org_headquarters_readiness_enabled",
    "creator_interop_org_public_registry_enabled",
    "creator_interop_org_voluntary_funding_enabled",
    "creator_interop_org_relationship_agreements_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropOrgFlags(supabase, user.id)
  if (!flags.creator_interop_org_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Interop organization ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_interop_org_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_interop_org_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorInteropOrgFlags(supabase, user.id)
    if (!flags.creator_interop_org_readiness_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Interop organization ops are not available.", retryable: false })
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

    await trusted.from("creator_interop_org_audit_events").insert({
      event_type: payload.action_type,
      actor_type: "admin",
      actor_id: user.id,
      subject_type: "feature_flags",
      subject_id: "creator_interop_organization",
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
      event_hash: `p15-ops:${payload.action_type}:${user.id}:${Date.now()}`,
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
