import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { INSTITUTIONAL_DISCLAIMER } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  title: z.string().min(1).max(200).default("Untitled institutional case"),
  seller_organization_id: z.string().uuid().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
  if (!flags.music_institutional_deals_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Institutional deals are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_institutional_transaction_cases")
    .select("id, public_id, title, status, classification_status, approved_path, seller_organization_id, created_at, updated_at")
    .eq("artist_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "opportunities_query_failed", message: "Unable to load opportunities.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: INSTITUTIONAL_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_deals_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional deals are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_institutional_transaction_cases")
      .insert({
        artist_user_id: user.id,
        title: payload.title,
        seller_organization_id: payload.seller_organization_id || null,
        status: "draft",
        classification_status: "review_required",
      })
      .select("id, public_id, title, status, classification_status, approved_path")
      .single()

    if (error)
      return jsonError({ status: 500, code: "opportunity_create_failed", message: "Unable to create opportunity.", retryable: true })

    return NextResponse.json({ data, disclaimer: INSTITUTIONAL_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid opportunity payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "opportunity_create_failed", message: "Unable to create opportunity.", retryable: true })
  }
}
