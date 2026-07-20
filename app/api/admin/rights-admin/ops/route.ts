import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_mandates",
    "kill_switch_cases",
    "kill_switch_registration",
    "kill_switch_claims",
    "kill_switch_enforcement",
    "kill_switch_dmca",
    "kill_switch_settlements",
    "kill_switch_partners",
    "kill_switch_automated_submission",
    "kill_switch_auto_takedown",
    "kill_switch_litigation",
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
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights admin ops are not available.", retryable: false })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: openDeadlines }, { data: flagRows }] = await Promise.all([
    trusted
      .from("music_rights_deadlines")
      .select("id, deadline_type, due_at, status")
      .eq("status", "open")
      .order("due_at", { ascending: true })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "music_rights_admin_%"),
  ])

  return NextResponse.json({ data: { openDeadlines: openDeadlines || [], flags: flagRows || [] }, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights admin ops are not available.", retryable: false })
    if (!(await assertAdmin(supabase, user.id)))
      return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

    const payload = actionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const killMap: Record<string, string> = {
      kill_switch_mandates: "music_rights_admin_mandates_enabled",
      kill_switch_cases: "music_rights_admin_cases_enabled",
      kill_switch_registration: "music_rights_admin_registration_enabled",
      kill_switch_claims: "music_rights_admin_claims_enabled",
      kill_switch_enforcement: "music_rights_admin_enforcement_enabled",
      kill_switch_dmca: "music_rights_admin_dmca_enabled",
      kill_switch_settlements: "music_rights_admin_settlements_enabled",
      kill_switch_partners: "music_rights_admin_partners_enabled",
      kill_switch_automated_submission: "music_rights_admin_automated_submission_enabled",
      kill_switch_auto_takedown: "music_rights_admin_auto_takedown_enabled",
      kill_switch_litigation: "music_rights_admin_litigation_enabled",
    }
    const flagKey = killMap[payload.action_type]
    await trusted
      .from("feature_flags")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("key", flagKey)

    await trusted.from("music_rights_admin_audit_events").insert({
      actor_user_id: user.id,
      event_type: payload.action_type,
      event_data: { flagKey, dual_control_required: payload.dual_control_required, ...payload.payload },
    })

    return NextResponse.json({ data: { disabled: flagKey }, enabled: true })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid ops payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "ops_action_failed", message: "Unable to execute ops action.", retryable: true })
  }
}
