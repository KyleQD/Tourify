import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError } from "@/lib/api/route-helpers"
import { withPlatformAdmin } from "@/lib/auth/api-auth"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const actionSchema = z.object({
  action_type: z.enum([
    "kill_switch_deals",
    "kill_switch_funds",
    "kill_switch_bids",
    "kill_switch_nav",
    "kill_switch_secondaries",
    "kill_switch_tokenization",
    "kill_switch_cross_border",
  ]),
  subject_type: z.string().default("system"),
  subject_id: z.string().uuid().optional().nullable(),
  dual_control_required: z.boolean().default(true),
  payload: z.record(z.unknown()).default({}),
})

export const GET = withPlatformAdmin(async (_request: NextRequest, { user, supabase }) => {
  const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
  if (!flags.music_institutional_admin_ops_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Institutional admin ops are not available.", retryable: false })

  const trusted = await getTrustedMusicWriteClient(supabase)
  const [{ data: exceptions }, { data: flagRows }] = await Promise.all([
    trusted
      .from("music_institutional_reconciliation_exceptions")
      .select("id, provider_id, domain, severity, status, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    trusted
      .from("feature_flags")
      .select("key, enabled, rollout_percentage")
      .like("key", "music_institutional_%"),
  ])

  return NextResponse.json({ data: { openExceptions: exceptions || [], flags: flagRows || [] }, enabled: true })
})

export const POST = withPlatformAdmin(async (request: NextRequest, { user, supabase }) => {
  try {
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_admin_ops_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional admin ops are not available.", retryable: false })

    const payload = actionSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const killMap: Record<string, string> = {
      kill_switch_deals: "music_institutional_deals_enabled",
      kill_switch_funds: "music_institutional_funds_enabled",
      kill_switch_bids: "music_institutional_bids_auctions_enabled",
      kill_switch_nav: "music_institutional_nav_enabled",
      kill_switch_secondaries: "music_institutional_secondaries_enabled",
      kill_switch_tokenization: "music_institutional_tokenization_enabled",
      kill_switch_cross_border: "music_institutional_cross_border_enabled",
    }

    await trusted
      .from("feature_flags")
      .update({ enabled: false, rollout_percentage: 0, updated_at: new Date().toISOString() })
      .eq("key", killMap[payload.action_type])

    const { data: action, error } = await trusted
      .from("music_institutional_admin_actions")
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

    return NextResponse.json({ data: action }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid admin action.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "admin_action_failed", message: "Unable to perform admin action.", retryable: true })
  }
})
