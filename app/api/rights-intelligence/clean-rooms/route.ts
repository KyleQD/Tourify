import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { RIGHTS_INTELLIGENCE_DISCLAIMER } from "@/lib/music/rights-intelligence/intelligence-disclaimer"
import { resolveMusicRightsIntelligenceFlags } from "@/lib/music/rights-intelligence/music-rights-intelligence-flags"
import { authorizeCleanRoomQuery } from "@/lib/music/rights-intelligence/data-clean-room-access"

export const dynamic = "force-dynamic"

const DEFAULT_POLICY = {
  allowedTemplateIds: ["aggregate_descriptive_v1", "policy_coverage_v1"],
  prohibitedColumns: ["email", "legal_name", "bank_account", "ssn", "raw_contract_text", "peer_user_id"],
}

const createSchema = z.object({
  template_id: z.string().min(1),
  purpose_id: z.string().uuid().optional().nullable(),
  requested_columns: z.array(z.string()).default([]),
  requested_filters: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
  if (!flags.music_rights_intelligence_clean_rooms_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Clean-room research access is not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_intelligence_clean_room_queries")
    .select("id, template_id, status, deny_reason, created_at")
    .eq("requester_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "clean_room_query_failed", message: "Unable to load clean-room queries.", retryable: true })

  return NextResponse.json({ data: data || [], disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER, enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRightsIntelligenceFlags(supabase, user.id)
    if (!flags.music_rights_intelligence_clean_rooms_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Clean-room research access is not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const allowed = authorizeCleanRoomQuery({
      query: {
        templateId: payload.template_id,
        requestedColumns: payload.requested_columns,
        requestedFilters: payload.requested_filters,
        purposeId: payload.purpose_id || "research",
      },
      policy: DEFAULT_POLICY,
    })

    const { data, error } = await supabase
      .from("music_intelligence_clean_room_queries")
      .insert({
        requester_user_id: user.id,
        template_id: payload.template_id,
        purpose_id: payload.purpose_id || null,
        requested_columns: payload.requested_columns,
        status: allowed ? "approved" : "denied",
        deny_reason: allowed ? null : "template_or_column_policy",
      })
      .select("id, template_id, status, deny_reason")
      .single()

    if (error)
      return jsonError({ status: 500, code: "clean_room_create_failed", message: "Unable to create clean-room query.", retryable: true })

    return NextResponse.json({
      data,
      disclaimer: RIGHTS_INTELLIGENCE_DISCLAIMER,
      note: "Clean-room access is default-deny and never returns peer-identifying columns.",
    }, { status: allowed ? 201 : 403 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid clean-room payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "clean_room_create_failed", message: "Unable to create clean-room query.", retryable: true })
  }
}
