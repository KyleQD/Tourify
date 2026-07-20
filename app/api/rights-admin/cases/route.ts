import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_ADMIN_DISCLAIMER } from "@/lib/music/rights-admin/action-safety"
import { resolveMandate } from "@/lib/music/rights-admin/mandate-policy"
import { resolveMusicRightsAdminFlags } from "@/lib/music/rights-admin/music-rights-admin-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  case_type: z.enum([
    "registration", "correction", "usage_claim", "collection", "platform_claim",
    "enforcement", "dmca", "dispute", "settlement", "reversion", "transfer", "other",
  ]),
  subject_type: z.enum(["artist_music", "musical_work", "sound_recording", "party", "other"]),
  subject_id: z.string().uuid(),
  artist_music_id: z.string().uuid().optional().nullable(),
  mandate_id: z.string().uuid().optional().nullable(),
  right_category: z.string().default("composition"),
  territory_code: z.string().default("US"),
  service_code: z.string().default("register"),
  metadata: z.record(z.unknown()).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
  if (!flags.music_rights_admin_cases_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights admin cases are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_rights_admin_cases")
    .select("id, public_id, case_type, status, subject_type, subject_id, artist_music_id, mandate_id, workflow_module, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "cases_query_failed", message: "Unable to load cases.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_ADMIN_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsAdminFlags(supabase, user.id)
    if (!flags.music_rights_admin_cases_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights admin cases are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    let status = "draft"
    let mandateId = payload.mandate_id || null

    if (mandateId) {
      const { data: mandate } = await supabase
        .from("music_rights_admin_mandates")
        .select("*")
        .eq("id", mandateId)
        .single()
      if (mandate) {
        const resolution = resolveMandate({
          action: payload.case_type,
          assetId: payload.artist_music_id || payload.subject_id,
          rightCategory: payload.right_category,
          territoryCode: payload.territory_code,
          serviceCode: payload.service_code,
          at: new Date(),
          mandates: [{
            id: mandate.id,
            status: mandate.status,
            assetIds: mandate.asset_ids || [],
            rightCategories: mandate.right_categories || [],
            territoryCodes: mandate.territory_codes || [],
            serviceCodes: mandate.service_codes || [],
            startsAt: new Date(mandate.starts_at),
            endsAt: mandate.ends_at ? new Date(mandate.ends_at) : undefined,
          }],
        })
        status = resolution.allowed ? "ready" : "needs_authority"
      } else {
        status = "needs_authority"
      }
    } else {
      status = "needs_authority"
    }

    const { data, error } = await supabase
      .from("music_rights_admin_cases")
      .insert({
        owner_user_id: user.id,
        case_type: payload.case_type,
        subject_type: payload.subject_type,
        subject_id: payload.subject_id,
        artist_music_id: payload.artist_music_id || null,
        mandate_id: mandateId,
        status,
        workflow_module: payload.case_type,
        metadata: payload.metadata,
      })
      .select("id, public_id, case_type, status, mandate_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "case_create_failed", message: "Unable to create case.", retryable: true })

    return NextResponse.json({ data, disclaimer: RIGHTS_ADMIN_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid case payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "case_create_failed", message: "Unable to create case.", retryable: true })
  }
}
