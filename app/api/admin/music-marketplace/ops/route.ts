import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_offerings",
    "kill_switch_subscriptions",
    "kill_switch_secondary",
    "kill_switch_transfers",
    "escalate_alert",
    "open_hold",
    "release_hold",
  ]),
  subject_type: z.string().min(1).max(80).default("system"),
  subject_id: z.string().uuid().optional().nullable(),
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
  const level = Number(data.admin_level || 0)
  return level >= 1
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_admin_ops_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Marketplace admin ops are not available.",
      retryable: false,
    })
  if (!(await assertAdmin(supabase, user.id)))
    return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: alerts }, { data: holds }, { data: flagsRows }] = await Promise.all([
    trusted
      .from("music_marketplace_surveillance_alerts")
      .select("id, source, alert_type, severity, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    trusted
      .from("music_marketplace_compliance_holds")
      .select("id, subject_type, subject_id, hold_type, status, reason_code, opened_at")
      .eq("status", "open")
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "music_marketplace_%"),
  ])

  return NextResponse.json({
    data: {
      alerts: alerts || [],
      openHolds: holds || [],
      flags: flagsRows || [],
    },
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_admin_ops_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Marketplace admin ops are not available.",
        retryable: false,
      })
    if (!(await assertAdmin(supabase, user.id)))
      return jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false })

    const payload = actionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    const killMap: Record<string, string> = {
      kill_switch_offerings: "music_marketplace_offerings_enabled",
      kill_switch_subscriptions: "music_marketplace_subscriptions_enabled",
      kill_switch_secondary: "music_marketplace_secondary_sync_enabled",
      kill_switch_transfers: "music_marketplace_transfers_enabled",
    }

    if (payload.action_type in killMap) {
      await trusted
        .from("feature_flags")
        .update({ enabled: false, rollout_percentage: 0, updated_at: new Date().toISOString() })
        .eq("key", killMap[payload.action_type])
    }

    if (payload.action_type === "open_hold" && payload.subject_id) {
      await trusted.from("music_marketplace_compliance_holds").insert({
        subject_type: payload.subject_type,
        subject_id: payload.subject_id,
        hold_type: String(payload.payload.hold_type || "admin"),
        reason_code: String(payload.payload.reason_code || "admin_hold"),
        opened_by: user.id,
        status: "open",
      })
    }

    if (payload.action_type === "release_hold" && payload.subject_id) {
      await trusted
        .from("music_marketplace_compliance_holds")
        .update({ status: "released", released_at: new Date().toISOString() })
        .eq("id", payload.subject_id)
    }

    if (payload.action_type === "escalate_alert" && payload.subject_id) {
      await trusted
        .from("music_marketplace_surveillance_alerts")
        .update({ status: "escalated_to_partner", updated_at: new Date().toISOString() })
        .eq("id", payload.subject_id)
    }

    const { data: action, error } = await trusted
      .from("music_marketplace_admin_actions")
      .insert({
        actor_user_id: user.id,
        action_type: payload.action_type,
        subject_type: payload.subject_type,
        subject_id: payload.subject_id || null,
        dual_control_required: payload.dual_control_required,
        payload: payload.payload,
      })
      .select("id, action_type, dual_control_required, created_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "admin_action_failed", message: "Unable to record admin action.", retryable: true })

    return NextResponse.json({
      data: action,
      note: payload.dual_control_required
        ? "Dual-control approval required before treating kill-switch or hold changes as production-complete."
        : undefined,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid admin action.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "admin_action_failed", message: "Unable to perform admin action.", retryable: true })
  }
}
