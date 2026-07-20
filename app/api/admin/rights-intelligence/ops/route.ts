import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_consent",
    "kill_switch_datasets",
    "kill_switch_cohorts",
    "kill_switch_metrics",
    "kill_switch_benchmarks",
    "kill_switch_education",
    "kill_switch_alerts",
    "kill_switch_groups",
    "kill_switch_clean_rooms",
    "kill_switch_external_negotiation",
    "kill_switch_collective_licensing",
    "kill_switch_representation",
    "kill_switch_benchmark_public_publish",
    "competition_stop",
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
  kill_switch_consent: ["music_rights_intelligence_consent_enabled"],
  kill_switch_datasets: ["music_rights_intelligence_datasets_enabled"],
  kill_switch_cohorts: ["music_rights_intelligence_cohorts_enabled"],
  kill_switch_metrics: ["music_rights_intelligence_metrics_enabled"],
  kill_switch_benchmarks: ["music_rights_intelligence_benchmarks_enabled"],
  kill_switch_education: ["music_rights_intelligence_education_enabled"],
  kill_switch_alerts: ["music_rights_intelligence_alerts_enabled"],
  kill_switch_groups: ["music_rights_intelligence_groups_enabled"],
  kill_switch_clean_rooms: ["music_rights_intelligence_clean_rooms_enabled"],
  kill_switch_external_negotiation: ["music_rights_intelligence_external_negotiation_enabled"],
  kill_switch_collective_licensing: ["music_rights_intelligence_collective_licensing_enabled"],
  kill_switch_representation: ["music_rights_intelligence_representation_enabled"],
  kill_switch_benchmark_public_publish: ["music_rights_intelligence_benchmark_public_publish_enabled"],
  competition_stop: [
    "music_rights_intelligence_benchmarks_enabled",
    "music_rights_intelligence_groups_enabled",
    "music_rights_intelligence_external_negotiation_enabled",
    "music_rights_intelligence_collective_licensing_enabled",
    "music_rights_intelligence_benchmark_public_publish_enabled",
  ],
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: pendingOutbox }, { data: flagRows }] = await Promise.all([
    trusted
      .from("music_intelligence_outbox")
      .select("id, event_type, status, available_at")
      .in("status", ["pending", "failed"])
      .order("available_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "music_rights_intelligence_%"),
  ])

  return NextResponse.json({ data: { pendingOutbox: pendingOutbox || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights intelligence ops are not available.", retryable: false })
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

    await trusted.from("music_intelligence_audit_events").insert({
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
