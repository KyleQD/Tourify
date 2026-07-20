import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { evaluateLocalSovereignty } from "@/lib/music/creator-protocol-constitution/local-sovereignty-gate"
import { evaluateFundamentalRights } from "@/lib/music/creator-protocol-constitution/fundamental-rights-policy"

export const dynamic = "force-dynamic"

const checkSchema = z.object({
  requested_power: z.string().min(1),
  organization_id: z.string().uuid(),
  constitution_id: z.string().uuid(),
  delegated_powers: z.array(z.string()).default([]),
  local_decision_status: z.enum(["approved", "rejected", "absent", "disputed"]).default("absent"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_local_sovereignty_enabled && !flags.creator_protocol_fundamental_provisions_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Sovereignty controls are not available.", retryable: false })

  const constitutionId = request.nextUrl.searchParams.get("constitution_id")
  let query = supabase
    .from("creator_protocol_reserved_powers")
    .select("id, constitution_id, organization_id, power_key, status, version, effective_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (constitutionId) query = query.eq("constitution_id", constitutionId)

  const { data, error } = await query
  if (error)
    return jsonError({ status: 500, code: "sovereignty_query_failed", message: "Unable to load reserved powers.", retryable: true })

  const rights = evaluateFundamentalRights({
    action: "read_schedule",
    affectedRights: [],
    amendmentClass: "editorial",
    hasFundamentalRatification: false,
    policy: {
      policyVersion: "1.0.0",
      schemaVersion: "1",
      jurisdiction: "sandbox",
      evaluatedAt: new Date().toISOString(),
    },
  })

  return NextResponse.json({
    data: data || [],
    rightsGate: rights,
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Local sovereignty is default-deny. Absence of delegation means no delegation.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
    if (!flags.creator_protocol_local_sovereignty_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Sovereignty controls are not available.", retryable: false })

    const payload = checkSchema.parse(await request.json())
    const { data: reserved } = await supabase
      .from("creator_protocol_reserved_powers")
      .select("power_key")
      .eq("constitution_id", payload.constitution_id)
      .eq("organization_id", payload.organization_id)
      .eq("status", "active")

    const result = evaluateLocalSovereignty({
      requestedPower: payload.requested_power,
      delegatedPowers: payload.delegated_powers,
      reservedPowers: (reserved || []).map((row: { power_key: string }) => row.power_key),
      localDecisionStatus: payload.local_decision_status,
      delegationExpired: false,
    })

    return NextResponse.json({ data: result, disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid sovereignty payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "sovereignty_check_failed", message: "Unable to evaluate sovereignty.", retryable: true })
  }
}
