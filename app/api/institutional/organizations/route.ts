import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  legal_name: z.string().min(1).max(200),
  organization_type: z.enum([
    "buyer", "seller", "label", "publisher", "fund", "adviser",
    "family_office", "broker_dealer", "administrator", "other",
  ]),
  jurisdiction: z.string().max(80).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
  if (!flags.music_institutional_orgs_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Institutional organizations are not available.", retryable: false })

  const { data: owned } = await supabase
    .from("music_institutional_organizations")
    .select("id, public_id, legal_name, organization_type, jurisdiction, status, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return NextResponse.json({ data: owned || [], enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_orgs_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional organizations are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_institutional_organizations")
      .insert({
        owner_user_id: user.id,
        legal_name: payload.legal_name,
        organization_type: payload.organization_type,
        jurisdiction: payload.jurisdiction || null,
        status: "active",
      })
      .select("id, public_id, legal_name, organization_type, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "org_create_failed", message: "Unable to create organization.", retryable: true })

    await supabase.from("music_institutional_memberships").insert({
      organization_id: data.id,
      user_id: user.id,
      role: "owner",
      status: "active",
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid organization payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "org_create_failed", message: "Unable to create organization.", retryable: true })
  }
}
