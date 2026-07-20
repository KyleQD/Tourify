import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { assertOwnedProject, writeRightsAuditEvent } from "@/lib/music-rights/rights-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(300),
  iswc: z.string().max(20).optional().nullable(),
  work_type: z.enum(["original", "adaptation", "arrangement", "medley", "unknown"]).default("original"),
  alternate_titles: z.array(z.string().max(300)).max(20).default([]),
  language_code: z.string().max(16).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase.from("music_rights_musical_works").select("*").eq("owner_user_id", user.id).order("updated_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "rights_works_query_failed", message: "Unable to load musical works.", retryable: true })
  return NextResponse.json({ data: data || [], enabled: flags.music_rights_workspace_enabled })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsFlags(supabase, user.id)
    if (!flags.music_rights_workspace_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights workspace is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    const project = await assertOwnedProject({ supabase: trusted, userId: user.id, projectId: payload.project_id })
    if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })

    const { data, error } = await trusted
      .from("music_rights_musical_works")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        title: payload.title,
        iswc: payload.iswc || null,
        work_type: payload.work_type,
        alternate_titles: payload.alternate_titles,
        language_code: payload.language_code || null,
      })
      .select("*")
      .single()
    if (error || !data)
      return jsonError({ status: 500, code: "rights_work_create_failed", message: "Unable to create musical work.", retryable: true })

    await writeRightsAuditEvent({
      supabase: trusted,
      projectId: project.id,
      actorUserId: user.id,
      eventType: "music.rights.work.created",
      entityType: "musical_work",
      entityId: data.id,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid musical work request.", issues: error.issues })
    console.error("Rights work create failed", error)
    return jsonError({ status: 500, code: "rights_work_internal_error", message: "Unexpected musical work error.", retryable: true })
  }
}
