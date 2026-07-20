import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { generatePlanningCandidates } from "@/lib/music/marketplace/offering-pathway"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

const planSchema = z.object({
  issuer_id: z.string().uuid(),
  target_raise_minor: z.string().regex(/^\d+$/),
  public_marketing_required: z.boolean(),
  include_non_accredited_investors: z.boolean(),
  audited_financials_ready: z.boolean(),
  desired_secondary_liquidity: z.boolean(),
  selected_pathway: z
    .enum(["reg_cf", "reg_d_506b", "reg_d_506c", "reg_a_tier_2", "registered_or_other"])
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_offerings_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Marketplace pathway planning is not available.",
        retryable: false,
      })

    const payload = planSchema.parse(await request.json())
    const { data: issuer } = await supabase
      .from("music_marketplace_issuers")
      .select("id")
      .eq("id", payload.issuer_id)
      .eq("owner_user_id", user.id)
      .maybeSingle()
    if (!issuer)
      return jsonError({ status: 404, code: "issuer_not_found", message: "Issuer not found.", retryable: false })

    const candidates = generatePlanningCandidates({
      targetRaiseMinor: payload.target_raise_minor,
      publicMarketingRequired: payload.public_marketing_required,
      includeNonAccreditedInvestors: payload.include_non_accredited_investors,
      auditedFinancialsReady: payload.audited_financials_ready,
      desiredSecondaryLiquidity: payload.desired_secondary_liquidity,
    })

    if (!payload.selected_pathway)
      return NextResponse.json({
        data: { candidates },
        note: "Candidates require counsel approval. No offering may launch without an approved pathway decision and regulated partner.",
      })

    const selected = candidates.find((c) => c.candidate === payload.selected_pathway) || {
      candidate: payload.selected_pathway,
      warnings: ["selected_outside_generated_candidates"],
      requiresCounselApproval: true as const,
    }

    const { data, error } = await supabase
      .from("music_marketplace_pathway_decisions")
      .insert({
        issuer_id: payload.issuer_id,
        pathway: selected.candidate,
        status: "planning",
        planning_facts: payload,
        warnings: selected.warnings,
        counsel_approved: false,
        partner_approved: false,
      })
      .select("id, pathway, status, warnings, counsel_approved, partner_approved, created_at")
      .single()

    if (error)
      return jsonError({ status: 500, code: "pathway_create_failed", message: "Unable to record pathway decision.", retryable: true })

    return NextResponse.json({ data, candidates }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid pathway payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "pathway_create_failed", message: "Unable to plan pathway.", retryable: true })
  }
}
