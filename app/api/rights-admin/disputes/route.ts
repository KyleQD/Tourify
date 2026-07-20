import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_id: z.string().uuid().optional().nullable(),
  claim_id: z.string().uuid().optional().nullable(),
  dispute_type: z.string().min(1),
  details: z.record(z.unknown()).default({}),
  escalate_legal: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_claims_enabled && !flags.music_rights_admin_enforcement_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Disputes are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_disputes")
    .select("id, case_id, claim_id, dispute_type, status, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "disputes_query_failed", message: "Unable to load disputes.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    const payload = createSchema.parse(await request.json())

    if (payload.escalate_legal && !flags.music_rights_admin_litigation_enabled)
      return jsonError({ status: 403, code: "litigation_disabled", message: "Litigation escalation requires separate approval.", retryable: false })

    const { data, error } = await supabase
      .from("music_rights_disputes")
      .insert({
        owner_user_id: user.id,
        case_id: payload.case_id || null,
        claim_id: payload.claim_id || null,
        dispute_type: payload.dispute_type,
        details: payload.details,
        status: payload.escalate_legal ? "escalated_legal" : "open",
      })
      .select("id, dispute_type, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "dispute_create_failed", message: "Unable to create dispute.", retryable: true })

    return NextResponse.json({ data, disclaimer: RIGHTS_ADMIN_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid dispute payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "dispute_create_failed", message: "Unable to create dispute.", retryable: true })
  }
}
