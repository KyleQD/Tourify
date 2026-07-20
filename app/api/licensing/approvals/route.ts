import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { evaluateApprovals } from "@/lib/music/licensing/approval-matrix"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  clearance_leg_id: z.string().uuid(),
  request_version: z.number().int().positive(),
  party_id: z.string().uuid(),
  authority_record_id: z.string().uuid().optional().nullable(),
  decision: z.enum(["approved", "rejected", "conditional", "deferred"]),
  conditions: z.array(z.unknown()).default([]),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_requests_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing approvals are not available.", retryable: false })

  const requestId = request.nextUrl.searchParams.get("request_id")
  if (!requestId)
    return jsonError({ status: 400, code: "validation_error", message: "request_id required.", retryable: false })

  const { data: legs, error: legsError } = await supabase
    .from("music_license_clearance_legs")
    .select("id, request_id, right_category, required_approvers, status, blockers, asset_id")
    .eq("request_id", requestId)
  if (legsError)
    return jsonError({ status: 500, code: "legs_query_failed", message: "Unable to load clearance legs.", retryable: true })

  const legIds = (legs || []).map((l: any) => l.id)
  const { data: approvals } = legIds.length
    ? await supabase
        .from("music_license_approvals")
        .select("id, clearance_leg_id, request_version, party_id, decision, conditions, decided_at")
        .in("clearance_leg_id", legIds)
    : { data: [] }

  const evaluation = evaluateApprovals({
    currentRequestVersion: Number(request.nextUrl.searchParams.get("request_version") || 1),
    legs: (legs || []).map((leg: any) => ({
      id: leg.id,
      rightCategory: leg.right_category,
      assetId: leg.asset_id || "",
      requiredApproverPartyIds: (leg.required_approvers || []).map((a: any) => a.partyId || a),
      authoritySnapshots: [],
      status: leg.status === "satisfied" || leg.status === "approved" ? "satisfied"
        : leg.status === "blocked" ? "blocked"
        : leg.status === "not_applicable" ? "not_applicable"
        : "pending",
      blockers: leg.blockers || [],
    })),
    approvals: (approvals || []).map((a: any) => ({
      partyId: a.party_id,
      requestVersion: a.request_version,
      approved: a.decision === "approved",
    })),
  })

  return NextResponse.json({
    data: { legs: legs || [], approvals: approvals || [], evaluation },
    disclaimer: LICENSING_DISCLAIMER,
    note: "Approval is not a licence.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_requests_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing approvals are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const { data, error } = await supabase
      .from("music_license_approvals")
      .insert({
        clearance_leg_id: payload.clearance_leg_id,
        request_version: payload.request_version,
        party_id: payload.party_id,
        authority_record_id: payload.authority_record_id || null,
        decision: payload.decision,
        conditions: payload.conditions,
        decided_by: user.id,
      })
      .select("id, clearance_leg_id, decision, request_version")
      .single()

    if (error)
      return jsonError({ status: 500, code: "approval_create_failed", message: "Unable to record approval.", retryable: true })

    return NextResponse.json({ data, disclaimer: LICENSING_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid approval payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "approval_create_failed", message: "Unable to record approval.", retryable: true })
  }
}
