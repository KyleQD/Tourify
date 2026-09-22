import { NextRequest, NextResponse } from "next/server"
import { requireApiUser, jsonError } from "@/lib/api/route-helpers"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { isRequestExpired } from "@/lib/marketplace/service-state-machine"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/service-requests/[id]
 *
 * Returns the full request detail for a participant (buyer or seller).
 * Includes all offer revisions and booking if confirmed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  const { id } = await params

  // Load the request — RLS policies allow buyer or seller to read
  const { data: serviceRequest, error } = await supabase
    .from("marketplace_service_requests")
    .select(`
      id, listing_id, buyer_user_id, mode, status, optimistic_version,
      proposed_date, proposed_end_date, timezone, location,
      scope_summary, notes, budget_range_min, budget_range_max,
      created_at, updated_at, expires_at,
      marketplace_listings (
        id, title, cover_image_url, base_price, currency, seller_user_id,
        marketplace_storefronts (id, slug, display_name, avatar_url)
      ),
      marketplace_service_offers (
        id, revision_number, status, line_items, subtotal, terms,
        expires_at, deposit_percentage, deposit_amount, notes, created_at
      ),
      marketplace_service_bookings (
        id, confirmed_start_at, confirmed_end_at, timezone, location, status, calendar_event_id
      )
    `)
    .eq("id", id)
    .maybeSingle()

  if (error || !serviceRequest) {
    return NextResponse.json({ error: "Service request not found." }, { status: 404 })
  }

  // Verify participant access (belt-and-suspenders on top of RLS)
  const listing = serviceRequest.marketplace_listings as any
  const isBuyer = serviceRequest.buyer_user_id === user.id
  const isSeller = listing?.seller_user_id === user.id
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 })
  }

  // Sort offers by revision_number desc
  const offers = ((serviceRequest.marketplace_service_offers ?? []) as any[])
    .sort((a, b) => b.revision_number - a.revision_number)
    .map(o => ({
      ...o,
      isExpired: isOfferExpired(o.expires_at),
    }))

  return NextResponse.json({
    data: {
      ...serviceRequest,
      isExpired: isRequestExpired(serviceRequest.expires_at),
      userRole: isBuyer ? "buyer" : "seller",
      marketplace_service_offers: offers,
    },
  })
}

function isOfferExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}
