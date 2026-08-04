import { type NextRequest, NextResponse } from "next/server"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { resolveActingContext } from "@/lib/auth/acting-context"
import {
  executeListingTransition,
  type ListingStatus,
} from "@/lib/marketplace/listing-lifecycle"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { jsonError } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

/**
 * POST /api/marketplace/listings/[id]/lifecycle
 *
 * Perform an optimistic-version-protected listing status transition.
 *
 * Body: { targetStatus: ListingStatus; expectedVersion: number }
 *
 * Returns: { data: { status, optimistic_version } }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  const ctx = await resolveActingContext(request)
  if (ctx instanceof NextResponse) return ctx

  const { id: listingId } = await params
  const { userId, supabase } = ctx

  let body: { targetStatus: string; expectedVersion: number }
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, code: "invalid_body", message: "Invalid JSON body." })
  }

  const { targetStatus, expectedVersion } = body

  if (!targetStatus || typeof expectedVersion !== "number") {
    return jsonError({
      status: 400,
      code: "missing_fields",
      message: "targetStatus and expectedVersion are required.",
    })
  }

  // Check seller agreement acceptance
  const { data: storefront } = await supabase
    .from("marketplace_storefronts")
    .select("id, accepted_seller_agreement_at")
    .eq("seller_user_id", userId)
    .maybeSingle()

  const sellerAgreementAccepted = Boolean(storefront?.accepted_seller_agreement_at)

  // Check payout readiness (only needed for publish transitions)
  let payoutReady = true
  if (targetStatus === "published") {
    const readiness = await getSellerPayoutReadiness({ supabase, sellerUserId: userId })
    payoutReady = readiness.ready
  }

  const result = await executeListingTransition({
    supabase,
    listingId,
    userId,
    targetStatus: targetStatus as ListingStatus,
    expectedVersion,
    sellerAgreementAccepted,
    payoutReady,
  })

  if (!result.success) {
    const statusMap: Record<string, number> = {
      listing_not_found: 404,
      forbidden: 403,
      invalid_transition: 422,
      optimistic_conflict: 409,
      seller_agreement_required: 403,
      stripe_connect_required: 403,
      db_error: 500,
    }
    return jsonError({
      status: (statusMap[result.code] ?? 500) as 400 | 403 | 404 | 409 | 422 | 500,
      code: result.code,
      message: result.message,
    })
  }

  return NextResponse.json({
    data: {
      id: listingId,
      status: result.newStatus,
      optimistic_version: result.newVersion,
    },
  })
}
