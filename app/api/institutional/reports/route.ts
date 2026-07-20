import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createHash } from "crypto"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  organization_id: z.string().uuid(),
  report_type: z.enum(["portfolio_summary", "lp_statement", "nav_export", "diligence_pack"]),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_deals_enabled && !flags.music_institutional_funds_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional reports are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const storagePath = `${user.id}/${payload.report_type}-${Date.now()}.json`
    const payloadHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex")

    const { data, error } = await supabase
      .from("music_institutional_report_exports")
      .insert({
        organization_id: payload.organization_id,
        report_type: payload.report_type,
        status: "queued",
        storage_path: storagePath,
        payload_hash: payloadHash,
        created_by: user.id,
      })
      .select("id, report_type, status, storage_path, created_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "report_create_failed", message: "Unable to queue report.", retryable: true })

    await supabase.from("music_institutional_outbox_events").insert({
      event_type: "institutional.report.queued",
      aggregate_type: "report_export",
      aggregate_id: data.id,
      payload: { report_type: payload.report_type },
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid report payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "report_create_failed", message: "Unable to queue report.", retryable: true })
  }
}
