import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"
import { createSandboxPlatformClaimsAdapter } from "@/lib/music/rights-admin/partner-adapters"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  artist_music_id: z.string().uuid(),
  platform_code: z.string().min(1),
  policy: z.record(z.unknown()).default({}),
  ai_training_opt_in: z.boolean().default(false),
  submit: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_platform_claims_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Platform claims are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_platform_policies")
    .select("id, artist_music_id, platform_code, status, ai_training_opt_in, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "policies_query_failed", message: "Unable to load policies.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_platform_claims_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Platform claims are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    let status = "draft"
    if (payload.submit) {
      const adapter = createSandboxPlatformClaimsAdapter()
      const result = await adapter.submitClaimPolicy({
        assetId: payload.artist_music_id,
        policy: payload.policy,
      })
      status = result.status
    }

    const { data, error } = await supabase
      .from("music_rights_platform_policies")
      .insert({
        artist_music_id: payload.artist_music_id,
        owner_user_id: user.id,
        platform_code: payload.platform_code,
        policy: payload.policy,
        ai_training_opt_in: payload.ai_training_opt_in,
        status,
      })
      .select("id, artist_music_id, platform_code, status, ai_training_opt_in")
      .single()

    if (error)
      return jsonError({ status: 500, code: "policy_create_failed", message: "Unable to create policy.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: RIGHTS_ADMIN_DISCLAIMER,
      note: "AI training opt-in is separate; never bundled into ordinary hosting/distribution terms.",
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid policy payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "policy_create_failed", message: "Unable to create policy.", retryable: true })
  }
}
