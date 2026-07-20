import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER } from "@/lib/music/creator-protocol-constitution/constitution-disclaimer"
import { resolveCreatorProtocolConstitutionFlags } from "@/lib/music/creator-protocol-constitution/creator-protocol-constitution-flags"
import { classifyAmendment } from "@/lib/music/creator-protocol-constitution/amendment-classification"
import { evaluateDecision } from "@/lib/music/creator-protocol-constitution/constitutional-decision-policy"
import { evaluateFundamentalRights } from "@/lib/music/creator-protocol-constitution/fundamental-rights-policy"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const proposeSchema = z.object({
  constitution_id: z.string().uuid(),
  title: z.string().min(1),
  changes_fundamental_right: z.boolean().default(false),
  changes_reserved_power: z.boolean().default(false),
  breaks_interoperability: z.boolean().default(false),
  changes_operator_configuration_only: z.boolean().default(false),
  is_typographical_only: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
  if (!flags.creator_protocol_amendment_process_enabled && !flags.creator_protocol_public_deliberation_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Amendment process is not available.", retryable: false })

  const { data, error } = await supabase
    .from("creator_protocol_amendments")
    .select("id, constitution_id, amendment_class, title, status, policy_version, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "amendments_query_failed", message: "Unable to load amendments.", retryable: true })

  const decisionGate = evaluateDecision({
    eligibleVotes: 0,
    votesCast: 0,
    approvals: 0,
    rejections: 0,
    quorumPercent: 0.5,
    approvalPercent: 0.67,
    classVetoSatisfied: false,
    conflictsReviewed: false,
  })

  return NextResponse.json({
    data: data || [],
    decisionGate,
    disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    note: "Fundamental amendments cannot pass without separate ratification package.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorProtocolConstitutionFlags(supabase, user.id)
    if (!flags.creator_protocol_amendment_process_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Amendment process is not available.", retryable: false })

    const payload = proposeSchema.parse(await request.json())
    const amendmentClass = classifyAmendment({
      changesFundamentalRight: payload.changes_fundamental_right,
      changesReservedPower: payload.changes_reserved_power,
      breaksInteroperability: payload.breaks_interoperability,
      changesOperatorConfigurationOnly: payload.changes_operator_configuration_only,
      isTypographicalOnly: payload.is_typographical_only,
    })

    if (amendmentClass === "fundamental" || amendmentClass === "emergency") {
      const rights = evaluateFundamentalRights({
        action: "propose_amendment",
        affectedRights: payload.changes_fundamental_right ? ["local_sovereignty"] : [],
        amendmentClass,
        hasFundamentalRatification: false,
        emergencyExpiresAt: amendmentClass === "emergency" ? undefined : undefined,
        policy: {
          policyVersion: "1.0.0",
          schemaVersion: "1",
          jurisdiction: "sandbox",
          evaluatedAt: new Date().toISOString(),
        },
      })
      if (!rights.allowed)
        return jsonError({
          status: 403,
          code: "fundamental_blocked",
          message: "Fundamental/emergency amendments remain blocked without ratification package.",
          retryable: false,
          issues: rights,
        })
    }

    if (flags.creator_protocol_emergency_override_enabled)
      return jsonError({ status: 403, code: "emergency_override_blocked", message: "Emergency override remains hard-disabled.", retryable: false })

    const trusted = await getTrustedMusicWriteClient(supabase)
    const { data, error } = await trusted
      .from("creator_protocol_amendments")
      .insert({
        constitution_id: payload.constitution_id,
        amendment_class: amendmentClass,
        title: payload.title,
        status: "comment",
        created_by: user.id,
        idempotency_key: `cpc-amend:${payload.constitution_id}:${payload.title}:${Date.now()}`,
      })
      .select("id, constitution_id, amendment_class, title, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "amendment_create_failed", message: "Unable to create amendment proposal.", retryable: true })

    return NextResponse.json({
      data,
      classifiedAs: amendmentClass,
      disclaimer: CREATOR_PROTOCOL_CONSTITUTION_DISCLAIMER,
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid amendment payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "amendment_create_failed", message: "Unable to create amendment proposal.", retryable: true })
  }
}
