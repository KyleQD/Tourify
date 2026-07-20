import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { INSTITUTIONAL_DISCLAIMER } from "@/lib/music/institutional/classification-gate"
import { resolveMusicInstitutionalFlags } from "@/lib/music/institutional/music-institutional-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  sponsor_organization_id: z.string().uuid(),
  legal_name: z.string().min(1).max(200),
  vehicle_type: z.enum(["private_fund", "spv", "continuation", "other"]).default("spv"),
  administrator_provider_id: z.string().max(120).optional().nullable(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
  if (!flags.music_institutional_funds_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Institutional funds are not available.", retryable: false })

  const { data: memberships } = await supabase
    .from("music_institutional_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active")
  const orgIds = (memberships || []).map((m) => m.organization_id)
  if (orgIds.length === 0) return NextResponse.json({ data: [], disclaimer: INSTITUTIONAL_DISCLAIMER, enabled: true })

  const { data, error } = await supabase
    .from("music_institutional_fund_vehicles")
    .select("id, public_id, legal_name, vehicle_type, status, administrator_provider_id, sponsor_organization_id, created_at")
    .in("sponsor_organization_id", orgIds)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "funds_query_failed", message: "Unable to load funds.", retryable: true })

  return NextResponse.json({
    data: data || [],
    note: "Tourify does not act as fund adviser or administrator. NAV is partner-sourced.",
    disclaimer: INSTITUTIONAL_DISCLAIMER,
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicInstitutionalFlags(supabase, user.id)
    if (!flags.music_institutional_funds_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Institutional funds are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data: membership } = await supabase
      .from("music_institutional_memberships")
      .select("id")
      .eq("organization_id", payload.sponsor_organization_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle()
    if (!membership)
      return jsonError({ status: 403, code: "forbidden", message: "Not a member of sponsor organization.", retryable: false })

    const { data, error } = await supabase
      .from("music_institutional_fund_vehicles")
      .insert({
        sponsor_organization_id: payload.sponsor_organization_id,
        legal_name: payload.legal_name,
        vehicle_type: payload.vehicle_type,
        administrator_provider_id: payload.administrator_provider_id || "sandbox_fund_admin",
        status: "planning",
      })
      .select("id, public_id, legal_name, vehicle_type, status, administrator_provider_id")
      .single()

    if (error)
      return jsonError({ status: 500, code: "fund_create_failed", message: "Unable to create fund vehicle.", retryable: true })

    return NextResponse.json({ data, disclaimer: INSTITUTIONAL_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid fund payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "fund_create_failed", message: "Unable to create fund vehicle.", retryable: true })
  }
}
