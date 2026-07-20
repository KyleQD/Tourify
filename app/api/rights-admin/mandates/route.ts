import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  scope: z.record(z.unknown()).default({}),
  asset_ids: z.array(z.string().uuid()).default([]),
  right_categories: z.array(z.string()).default([]),
  territory_codes: z.array(z.string()).default([]),
  service_codes: z.array(z.string()).default([]),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional().nullable(),
  written_mandate_ref: z.string().optional().nullable(),
  activate: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_mandates_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights admin mandates are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_admin_mandates")
    .select("id, public_id, status, right_categories, territory_codes, service_codes, starts_at, ends_at, version, created_at")
    .or(`principal_user_id.eq.${user.id},representative_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "mandates_query_failed", message: "Unable to load mandates.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_mandates_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights admin mandates are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_rights_admin_mandates")
      .insert({
        principal_user_id: user.id,
        scope: payload.scope,
        asset_ids: payload.asset_ids,
        right_categories: payload.right_categories,
        territory_codes: payload.territory_codes,
        service_codes: payload.service_codes,
        starts_at: payload.starts_at || new Date().toISOString(),
        ends_at: payload.ends_at || null,
        written_mandate_ref: payload.written_mandate_ref || null,
        status: payload.activate && payload.written_mandate_ref ? "active" : "draft",
      })
      .select("id, public_id, status, version")
      .single()

    if (error)
      return jsonError({ status: 500, code: "mandate_create_failed", message: "Unable to create mandate.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: RIGHTS_ADMIN_DISCLAIMER,
      note: "Passport/license is not an administration mandate.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid mandate payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "mandate_create_failed", message: "Unable to create mandate.", retryable: true })
  }
}
