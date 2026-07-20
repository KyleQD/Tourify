import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { assertOwnedProject, writeRightsAuditEvent } from "@/lib/music-rights/rights-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  party_id: z.string().uuid(),
  subject_type: z.enum(["musical_work", "sound_recording"]),
  subject_id: z.string().uuid(),
  role: z.string().min(1).max(120),
  instruments: z.array(z.string().max(80)).max(30).default([]),
  is_featured: z.boolean().default(false),
  visibility: z.enum(["public", "private", "pending"]).default("public"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  if (!projectId) return jsonError({ status: 400, code: "project_required", message: "projectId is required.", retryable: false })
  const project = await assertOwnedProject({ supabase, userId: user.id, projectId })
  if (!project) return jsonError({ status: 404, code: "project_not_found", message: "Rights project not found.", retryable: false })
  const { data, error } = await supabase
    .from("music_rights_contributions")
    .select("*, music_rights_credit_preferences(*), music_rights_parties(id, display_name, stage_name, party_type)")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })
  if (error) return jsonError({ status: 500, code: "rights_contributions_query_failed", message: "Unable to load contributions.", retryable: true })
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

    const { data: party } = await trusted
      .from("music_rights_parties")
      .select("id")
      .eq("id", payload.party_id)
      .eq("project_id", project.id)
      .maybeSingle()
    if (!party) return jsonError({ status: 404, code: "party_not_found", message: "Party not found on this project.", retryable: false })

    const { data: contribution, error } = await trusted
      .from("music_rights_contributions")
      .insert({
        project_id: project.id,
        party_id: payload.party_id,
        subject_type: payload.subject_type,
        subject_id: payload.subject_id,
        role: payload.role,
        instruments: payload.instruments,
        is_featured: payload.is_featured,
        confirmation_status: "proposed",
      })
      .select("*")
      .single()
    if (error || !contribution)
      return jsonError({ status: 500, code: "rights_contribution_create_failed", message: "Unable to create contribution.", retryable: true })

    await trusted.from("music_rights_credit_preferences").insert({
      contribution_id: contribution.id,
      visibility: payload.visibility,
    })

    await writeRightsAuditEvent({
      supabase: trusted,
      projectId: project.id,
      actorUserId: user.id,
      eventType: "music.rights.contribution.created",
      entityType: "contribution",
      entityId: contribution.id,
    })

    return NextResponse.json({ data: contribution }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid contribution request.", issues: error.issues })
    console.error("Rights contribution create failed", error)
    return jsonError({ status: 500, code: "rights_contribution_internal_error", message: "Unexpected contribution error.", retryable: true })
  }
}
