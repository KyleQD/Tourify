import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  payload: z.record(z.unknown()).default({}),
  version: z.number().int().positive().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_briefs_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing briefs are not available.", retryable: false })

  const projectId = request.nextUrl.searchParams.get("project_id")
  if (!projectId)
    return jsonError({ status: 400, code: "validation_error", message: "project_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_licensing_briefs")
    .select("id, project_id, version, payload, is_current, created_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "briefs_query_failed", message: "Unable to load briefs.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_briefs_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing briefs are not available.", retryable: false })

    const body = createSchema.parse(await request.json())
    const { data: latest } = await supabase
      .from("music_licensing_briefs")
      .select("version")
      .eq("project_id", body.project_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const version = body.version || (latest?.version || 0) + 1
    await supabase
      .from("music_licensing_briefs")
      .update({ is_current: false })
      .eq("project_id", body.project_id)
      .eq("is_current", true)

    const { data, error } = await supabase
      .from("music_licensing_briefs")
      .insert({
        project_id: body.project_id,
        version,
        payload: body.payload,
        is_current: true,
        created_by: user.id,
      })
      .select("id, project_id, version, is_current")
      .single()

    if (error)
      return jsonError({ status: 500, code: "brief_create_failed", message: "Unable to create brief.", retryable: true })

    return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid brief payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "brief_create_failed", message: "Unable to create brief.", retryable: true })
  }
}
