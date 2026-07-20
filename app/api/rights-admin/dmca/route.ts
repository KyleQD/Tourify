import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { counterNoticeRestorationWindow } from "@/lib/music/rights-admin/dmca-case-state-machine"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  direction: z.enum(["inbound_sp", "outbound_rightsholder"]),
  notice_version: z.record(z.unknown()).default({}),
  material_locations: z.array(z.unknown()).default([]),
  case_id: z.string().uuid().optional().nullable(),
  counter_notice: z.boolean().default(false),
})

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1)
    const day = result.getUTCDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return result
}

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_dmca_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "DMCA workflows are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_dmca_cases")
    .select("id, direction, status, disabled_at, counter_received_at, restore_earliest_at, restore_latest_at, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "dmca_query_failed", message: "Unable to load DMCA cases.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: RIGHTS_ADMIN_DISCLAIMER,
    note: "Inbound SP duties are separate from outbound rightsholder enforcement.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_dmca_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "DMCA workflows are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const now = new Date()
    let status = "received"
    let counterReceivedAt: string | null = null
    let restoreEarliest: string | null = null
    let restoreLatest: string | null = null

    if (payload.counter_notice) {
      status = "counter_received"
      counterReceivedAt = now.toISOString()
      const window = counterNoticeRestorationWindow(now, addBusinessDays)
      restoreEarliest = window.earliest.toISOString()
      restoreLatest = window.latest.toISOString()
    }

    const { data, error } = await trusted
      .from("music_dmca_cases")
      .insert({
        owner_user_id: user.id,
        case_id: payload.case_id || null,
        direction: payload.direction,
        notice_version: payload.notice_version,
        material_locations: payload.material_locations,
        status,
        counter_received_at: counterReceivedAt,
        restore_earliest_at: restoreEarliest,
        restore_latest_at: restoreLatest,
      })
      .select("id, direction, status, restore_earliest_at, restore_latest_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "dmca_create_failed", message: "Unable to create DMCA case.", retryable: true })

    if (restoreEarliest) {
      await trusted.from("music_rights_deadlines").insert({
        dmca_case_id: data.id,
        deadline_type: "counter_notice_restore_earliest",
        due_at: restoreEarliest,
        source_rule_version: "dmca-512-g",
        status: "open",
      })
    }

    return NextResponse.json({ data, disclaimer: RIGHTS_ADMIN_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid DMCA payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "dmca_create_failed", message: "Unable to create DMCA case.", retryable: true })
  }
}
