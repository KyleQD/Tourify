import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { resolveFederationPower } from "@/lib/music/creator-federation/sovereignty-policy"

export const dynamic = "force-dynamic"

const evaluateSchema = z.object({
  power: z.string().min(1),
  delegated_powers: z.array(z.string()).default([]),
  reserved_powers: z.array(z.string()).default(["local_membership", "local_pricing", "local_governing_documents", "local_enforcement"]),
  local_ratification_required: z.boolean().default(true),
  local_ratified: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_sovereignty_controls_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Sovereignty controls are not available.", retryable: false })

    const payload = evaluateSchema.parse(await request.json())
    const decision = resolveFederationPower({
      power: payload.power,
      delegatedPowers: payload.delegated_powers,
      reservedPowers: payload.reserved_powers,
      localRatificationRequired: payload.local_ratification_required,
      localRatified: payload.local_ratified,
    })

    return NextResponse.json({
      data: { decision },
      disclaimer: CREATOR_FEDERATION_DISCLAIMER,
      note: "Absence of delegation means no delegation.",
    })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid sovereignty payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "sovereignty_failed", message: "Unable to evaluate sovereignty.", retryable: true })
  }
}
