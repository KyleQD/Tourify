import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_id: z.string().uuid().optional().nullable(),
  source_code: z.string().min(1),
  source_event_id: z.string().min(1),
  normalized: z.record(z.unknown()).default({}),
  raw_object_path: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_usage_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Usage ingestion is not available.", retryable: false })

  const caseId = request.nextUrl.searchParams.get("case_id")
  let query = supabase
    .from("music_rights_usage_events")
    .select("id, case_id, source_code, source_event_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (caseId) query = query.eq("case_id", caseId)

  const { data, error } = await query
  if (error)
    return jsonError({ status: 500, code: "usage_query_failed", message: "Unable to load usage events.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_usage_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Usage ingestion is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_rights_usage_events")
      .insert({
        case_id: payload.case_id || null,
        source_code: payload.source_code,
        source_event_id: payload.source_event_id,
        normalized: payload.normalized,
        raw_object_path: payload.raw_object_path || null,
        status: "received",
      })
      .select("id, source_code, source_event_id, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "usage_create_failed", message: "Unable to ingest usage event.", retryable: true })

    return NextResponse.json({ data, disclaimer: RIGHTS_ADMIN_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid usage payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "usage_create_failed", message: "Unable to ingest usage event.", retryable: true })
  }
}
