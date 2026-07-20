import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveCreatorInteropConventionFlags } from "@/lib/music/creator-interoperability-convention/creator-interop-convention-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_readiness",
    "kill_switch_networks",
    "kill_switch_recognition",
    "kill_switch_approval_packages",
    "kill_switch_limited_production",
    "treaty_implication_stop",
    "universal_representation_stop",
    "convention_freeze",
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
  kill_switch_readiness: ["creator_interop_convention_readiness_enabled"],
  kill_switch_networks: ["creator_interop_network_registry_enabled", "creator_interop_convention_drafting_enabled"],
  kill_switch_recognition: ["creator_interop_mutual_recognition_enabled"],
  kill_switch_approval_packages: ["creator_interop_approval_package_enabled"],
  kill_switch_limited_production: ["creator_interop_limited_production_enabled"],
  treaty_implication_stop: [
    "creator_interop_mutual_recognition_enabled",
    "creator_interop_public_status_enabled",
    "creator_interop_limited_production_enabled",
  ],
  universal_representation_stop: [
    "creator_interop_mutual_recognition_enabled",
    "creator_interop_limited_production_enabled",
  ],
  convention_freeze: [
    "creator_interop_convention_readiness_enabled",
    "creator_interop_network_registry_enabled",
    "creator_interop_mutual_recognition_enabled",
    "creator_interop_approval_package_enabled",
    "creator_interop_limited_production_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)
  if (!flags.creator_interop_convention_readiness_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Interop convention ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("creator_interop_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "creator_interop_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorInteropConventionFlags(supabase, user.id)
    if (!flags.creator_interop_convention_readiness_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Interop convention ops are not available.", retryable: false })
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

    await trusted.from("creator_interop_audit_events").insert({
      event_type: payload.action_type,
      actor_type: "admin",
      actor_id: user.id,
      subject_type: "feature_flags",
      subject_id: "creator_interop_convention",
      payload: { flagKeys, dual_control_required: payload.dual_control_required, ...payload.payload },
      event_hash: `p14-ops:${payload.action_type}:${user.id}:${Date.now()}`,
    })

    return NextResponse.json({ data: { disabled: flagKeys }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
