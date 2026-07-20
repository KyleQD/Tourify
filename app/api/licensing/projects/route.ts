import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  title: z.string().min(1).max(200),
  confidentiality: z.enum(["verified_buyer", "nda", "clean_team", "internal"]).default("verified_buyer"),
  buyer_organization_id: z.string().uuid().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_briefs_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing briefs are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_licensing_projects")
    .select("id, public_id, title, status, confidentiality, created_at, updated_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "projects_query_failed", message: "Unable to load projects.", retryable: true })

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

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_licensing_projects")
      .insert({
        created_by: user.id,
        title: payload.title,
        confidentiality: payload.confidentiality,
        buyer_organization_id: payload.buyer_organization_id || null,
        status: "draft",
      })
      .select("id, public_id, title, status, confidentiality")
      .single()

    if (error)
      return jsonError({ status: 500, code: "project_create_failed", message: "Unable to create project.", retryable: true })

    await supabase.from("music_licensing_project_members").insert({
      project_id: data.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    })

    return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid project payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "project_create_failed", message: "Unable to create project.", retryable: true })
  }
}
