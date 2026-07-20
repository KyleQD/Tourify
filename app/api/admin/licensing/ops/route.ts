import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_availability",
    "kill_switch_briefs",
    "kill_switch_requests",
    "kill_switch_quotes",
    "kill_switch_agreements",
    "kill_switch_delivery",
    "kill_switch_cues",
    "kill_switch_payments",
    "kill_switch_ai",
    "kill_switch_ddex",
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

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing admin ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: conflicts }, { data: flagRows }] = await Promise.all([
    trusted
      .from("music_license_conflicts")
      .select("id, conflict_type, severity, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "music_licensing_%"),
  ])

  return NextResponse.json({ data: { openConflicts: conflicts || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing admin ops are not available.", retryable: false })
    if (!(await assertAdmin(supabase, user.id)))
      return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

    const payload = actionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const killMap: Record<string, string> = {
      kill_switch_availability: "music_licensing_availability_enabled",
      kill_switch_briefs: "music_licensing_briefs_enabled",
      kill_switch_requests: "music_licensing_requests_enabled",
      kill_switch_quotes: "music_licensing_quotes_enabled",
      kill_switch_agreements: "music_licensing_agreements_enabled",
      kill_switch_delivery: "music_licensing_delivery_enabled",
      kill_switch_cues: "music_licensing_cues_usage_enabled",
      kill_switch_payments: "music_licensing_payments_enabled",
      kill_switch_ai: "music_licensing_ai_enabled",
      kill_switch_ddex: "music_licensing_ddex_enabled",
    }
    const flagKey = killMap[payload.action_type]
    await trusted
      .from("feature_flags")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("key", flagKey)

    await trusted.from("music_licensing_audit_events").insert({
      actor_user_id: user.id,
      actor_role: "admin",
      entity_type: "feature_flag",
      entity_id: user.id,
      event_type: payload.action_type,
      metadata: { flagKey, dual_control_required: payload.dual_control_required, ...payload.payload },
    })

    return NextResponse.json({ data: { disabled: flagKey }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
