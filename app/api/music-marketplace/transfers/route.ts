import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"
import {
  defaultDenyTransferSnapshot,
  resolveTransferEligibility,
} from "@/lib/music/marketplace/transfer-eligibility"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  position_id: z.string().uuid(),
  quantity_minor: z.string().regex(/^\d+$/),
  transferee_user_id: z.string().uuid().optional().nullable(),
  eligibility_overrides: z
    .object({
      officialPositionMatched: z.boolean().optional(),
      partnerAccountApproved: z.boolean().optional(),
      transfereeApproved: z.boolean().optional(),
      sanctionsClear: z.boolean().optional(),
      legalHold: z.boolean().optional(),
      instrumentSuspended: z.boolean().optional(),
      holdingPeriodSatisfied: z.boolean().optional(),
      jurisdictionAllowed: z.boolean().optional(),
      transferAgentApprovalRequired: z.boolean().optional(),
      transferAgentApproved: z.boolean().optional(),
    })
    .optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_transfers_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Transfers are not available.",
      retryable: false,
    })

  const { data, error } = await supabase
    .from("music_marketplace_transfer_requests")
    .select("id, position_id, status, eligibility_passed, eligibility_snapshot, quantity_minor, partner_transfer_id, created_at")
    .eq("requested_by", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "transfers_query_failed", message: "Unable to load transfers.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true, defaultPolicy: "deny" })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
    if (!flags.music_marketplace_transfers_enabled)
      return jsonError({
        status: 404,
        code: "feature_disabled",
        message: "Transfers are not available.",
        retryable: false,
      })

    const payload = createSchema.parse(await request.json())
    const { data: position } = await supabase
      .from("music_marketplace_positions")
      .select("id, investor_user_id, reconciliation_status, restriction_status")
      .eq("id", payload.position_id)
      .eq("investor_user_id", user.id)
      .maybeSingle()
    if (!position)
      return jsonError({ status: 404, code: "position_not_found", message: "Position not found.", retryable: false })

    const eligibilityInput = {
      ...defaultDenyTransferSnapshot(),
      ...payload.eligibility_overrides,
      officialPositionMatched:
        payload.eligibility_overrides?.officialPositionMatched ??
        position.reconciliation_status === "matched",
    }
    const eligibility = resolveTransferEligibility(eligibilityInput)

    const { data, error } = await supabase
      .from("music_marketplace_transfer_requests")
      .insert({
        position_id: payload.position_id,
        requested_by: user.id,
        transferee_user_id: payload.transferee_user_id || null,
        quantity_minor: payload.quantity_minor,
        eligibility_snapshot: { input: eligibilityInput, result: eligibility },
        eligibility_passed: eligibility.eligible,
        status: eligibility.eligible ? "submitted_to_partner" : "eligibility_failed",
      })
      .select("id, position_id, status, eligibility_passed, eligibility_snapshot, quantity_minor")
      .single()

    if (error)
      return jsonError({ status: 500, code: "transfer_create_failed", message: "Unable to create transfer request.", retryable: true })

    return NextResponse.json({
      data,
      note: "Transfer eligibility defaults to deny. Approved transfers require partner/transfer-agent confirmation.",
    }, { status: eligibility.eligible ? 201 : 409 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid transfer payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "transfer_create_failed", message: "Unable to create transfer.", retryable: true })
  }
}
