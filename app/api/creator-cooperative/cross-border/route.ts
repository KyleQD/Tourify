import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_COOPERATIVE_DISCLAIMER } from "@/lib/music/creator-cooperative/cooperative-disclaimer"
import { resolveCreatorCooperativeFlags } from "@/lib/music/creator-cooperative/creator-cooperative-flags"
import { resolveCrossBorderDataUse } from "@/lib/music/creator-cooperative/cross-border-data-policy"

export const dynamic = "force-dynamic"

const evaluateSchema = z.object({
  source_jurisdiction: z.string().min(1),
  destination_jurisdiction: z.string().min(1),
  transfer_mechanism_active: z.boolean().default(false),
  localization_required: z.boolean().default(false),
  destination_storage_confirmed: z.boolean().default(false),
  supplementary_safeguards_approved: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorCooperativeFlags(supabase, user.id)
    if (!flags.cross_border_research_enabled)
      return jsonError({ status: 403, code: "cross_border_gated", message: "Cross-border research remains separately gated.", retryable: false })

    const payload = evaluateSchema.parse(await request.json())
    const decision = resolveCrossBorderDataUse({
      sourceJurisdiction: payload.source_jurisdiction,
      destinationJurisdiction: payload.destination_jurisdiction,
      transferMechanismActive: payload.transfer_mechanism_active,
      localizationRequired: payload.localization_required,
      destinationStorageConfirmed: payload.destination_storage_confirmed,
      supplementarySafeguardsApproved: payload.supplementary_safeguards_approved,
    })

    return NextResponse.json({ data: { decision }, disclaimer: CREATOR_COOPERATIVE_DISCLAIMER })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid cross-border payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "cross_border_failed", message: "Unable to evaluate cross-border use.", retryable: true })
  }
}
