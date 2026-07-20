import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { resolveMusicRightsFlags } from "@/lib/music-rights/music-rights-flags"
import { assertOwnedProject, writeRightsAuditEvent } from "@/lib/music-rights/rights-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  project_id: z.string().uuid(),
  party_type: z.enum(["person", "organization"]),
  display_name: z.string().min(1).max(300),
  legal_name: z.string().max(300).optional().nullable(),
  stage_name: z.string().max(300).optional().nullable(),
  email: z.string().email().optional().nullable(),
  linked_user_id: z.string().uuid().optional().nullable(),
  identifiers: z.array(z.object({
    identifier_type: z.enum(["ipi", "ipn", "isni", "pro_member", "publisher_code", "custom", "other"]),
    identifier_value: z.string().min(1).max(120),
    issuer: z.string().max(120).optional().nullable(),
  })).max(20).default([]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsFlags(supabase, user.id)
  const projectId = request.nextUrl.searchParams.get("projectId")
  let query = supabase
    .from("music_rights_parties")
    .select("*, music_rights_party_identifiers(*), music_rights_party_profiles(*)")
    .eq("owner_user_id", user.id)
    .order("updated_at", { ascending: false })
  if (projectId) query = query.eq("project_id", projectId)
  const { data, error } = await query
  if (error) return jsonError({ status: 500, code: "rights_parties_query_failed", message: "Unable to load parties.", retryable: true })
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

    const { data: party, error } = await trusted
      .from("music_rights_parties")
      .insert({
        project_id: project.id,
        owner_user_id: user.id,
        party_type: payload.party_type,
        display_name: payload.display_name,
        legal_name: payload.legal_name || null,
        stage_name: payload.stage_name || null,
        email: payload.email || null,
        linked_user_id: payload.linked_user_id || null,
        status: "draft",
      })
      .select("*")
      .single()
    if (error || !party)
      return jsonError({ status: 500, code: "rights_party_create_failed", message: "Unable to create party.", retryable: true })

    await trusted.from("music_rights_party_profiles").insert({ party_id: party.id })
    if (payload.identifiers.length > 0) {
      await trusted.from("music_rights_party_identifiers").insert(
        payload.identifiers.map((identifier) => ({
          party_id: party.id,
          identifier_type: identifier.identifier_type,
          identifier_value: identifier.identifier_value,
          issuer: identifier.issuer || null,
        })),
      )
    }

    await writeRightsAuditEvent({
      supabase: trusted,
      projectId: project.id,
      actorUserId: user.id,
      eventType: "music.rights.party.created",
      entityType: "party",
      entityId: party.id,
    })

    return NextResponse.json({ data: party }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid party request.", issues: error.issues })
    console.error("Rights party create failed", error)
    return jsonError({ status: 500, code: "rights_party_internal_error", message: "Unexpected party error.", retryable: true })
  }
}
