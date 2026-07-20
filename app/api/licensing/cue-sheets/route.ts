import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { validateCueSheet } from "@/lib/music/licensing/cue-sheet-validator"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  agreement_id: z.string().uuid().optional().nullable(),
  production_metadata: z.record(z.unknown()).default({}),
  cues: z.array(z.object({
    workTitle: z.string(),
    durationSeconds: z.number().int(),
    useType: z.string(),
    iswc: z.string().optional(),
    isrc: z.string().optional(),
    writers: z.array(z.string()).default([]),
    artist_music_id: z.string().uuid().optional().nullable(),
  })).default([]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_cues_usage_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Cue sheets are not available.", retryable: false })

  const projectId = request.nextUrl.searchParams.get("project_id")
  if (!projectId)
    return jsonError({ status: 400, code: "validation_error", message: "project_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_cue_sheets")
    .select("id, project_id, agreement_id, version, status, created_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "cue_sheets_query_failed", message: "Unable to load cue sheets.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: LICENSING_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_cues_usage_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Cue sheets are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const validation = validateCueSheet(payload.cues)
    if (!validation.valid)
      return jsonError({ status: 400, code: "cue_validation_failed", message: "Cue sheet invalid.", retryable: false, issues: validation.errors })

    const { data: latest } = await supabase
      .from("music_cue_sheets")
      .select("version")
      .eq("project_id", payload.project_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data, error } = await supabase
      .from("music_cue_sheets")
      .insert({
        project_id: payload.project_id,
        agreement_id: payload.agreement_id || null,
        version: (latest?.version || 0) + 1,
        status: "draft",
        production_metadata: payload.production_metadata,
        created_by: user.id,
      })
      .select("id, project_id, version, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "cue_sheet_create_failed", message: "Unable to create cue sheet.", retryable: true })

    if (payload.cues.length) {
      await supabase.from("music_cue_sheet_cues").insert(
        payload.cues.map((cue, index) => ({
          cue_sheet_id: data.id,
          position: index + 1,
          duration_seconds: cue.durationSeconds,
          use_type: cue.useType,
          artist_music_id: cue.artist_music_id || null,
          metadata: {
            workTitle: cue.workTitle,
            writers: cue.writers,
            iswc: cue.iswc,
            isrc: cue.isrc,
          },
        })),
      )
    }

    return NextResponse.json({ data, validation, disclaimer: LICENSING_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid cue sheet payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "cue_sheet_create_failed", message: "Unable to create cue sheet.", retryable: true })
  }
}
