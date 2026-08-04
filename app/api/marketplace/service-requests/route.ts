import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser, jsonError } from "@/lib/api/route-helpers"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { isRequestExpired } from "@/lib/marketplace/service-state-machine"

export const dynamic = "force-dynamic"

const submitSchema = z.object({
  listingId: z.string().uuid(),
  mode: z.enum(["booking_request", "quote_request"]),
  proposedDate: z.string().datetime().optional(),
  proposedEndDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  location: z.string().max(500).optional(),
  scopeSummary: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  budgetRangeMin: z.number().positive().optional(),
  budgetRangeMax: z.number().positive().optional(),
  /** Default expiry = 7 days from submission */
  expiresInDays: z.number().int().min(1).max(60).optional(),
})

/**
 * POST /api/marketplace/service-requests
 * Buyer submits a new service booking or quote request.
 */
export async function POST(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, code: "invalid_json", message: "Could not parse request body", retryable: false })
  }

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, code: "invalid_request", message: "Invalid service request payload", retryable: false, issues: parsed.error.issues })
  }
  const data = parsed.data

  // Load listing to verify it exists, is published, and supports the mode
  const { data: listing, error: listingError } = await supabase
    .from("marketplace_listings")
    .select("id, seller_user_id, status, listing_kind, service_mode")
    .eq("id", data.listingId)
    .maybeSingle()

  if (listingError || !listing) {
    return jsonError({ status: 404, code: "listing_not_found", message: "Listing not found.", retryable: false })
  }
  if (listing.status !== "published") {
    return jsonError({ status: 400, code: "listing_not_published", message: "This listing is not available for service requests.", retryable: false })
  }
  if (listing.listing_kind !== "service" && listing.service_mode == null) {
    return jsonError({ status: 400, code: "not_a_service_listing", message: "This listing does not accept service requests.", retryable: false })
  }
  // Self-request guard
  if (listing.seller_user_id === user.id) {
    return jsonError({ status: 400, code: "self_request_not_allowed", message: "You cannot request a service from your own listing.", retryable: false })
  }

  // Determine expiry
  const expiresInDays = data.expiresInDays ?? 7
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()

  const { data: serviceRequest, error: insertError } = await supabase
    .from("marketplace_service_requests")
    .insert({
      listing_id: data.listingId,
      buyer_user_id: user.id,
      mode: data.mode,
      status: "submitted",
      optimistic_version: 1,
      proposed_date: data.proposedDate ?? null,
      proposed_end_date: data.proposedEndDate ?? null,
      timezone: data.timezone ?? null,
      location: data.location ?? null,
      scope_summary: data.scopeSummary ?? null,
      notes: data.notes ?? null,
      budget_range_min: data.budgetRangeMin ?? null,
      budget_range_max: data.budgetRangeMax ?? null,
      expires_at: expiresAt,
    })
    .select("id, status, mode, created_at, expires_at")
    .single()

  if (insertError || !serviceRequest) {
    console.error("Failed to create service request", insertError)
    return jsonError({ status: 500, code: "create_failed", message: "Failed to submit service request.", retryable: true })
  }

  return NextResponse.json({ data: serviceRequest }, { status: 201 })
}

/**
 * GET /api/marketplace/service-requests
 * List service requests for the authenticated user:
 *   - As buyer: their own submitted requests.
 *   - As seller: requests for listings they own.
 */
export async function GET(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth

  const { searchParams } = new URL(request.url)
  const role = searchParams.get("role") ?? "buyer"
  const status = searchParams.get("status")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 20
  const offset = (page - 1) * limit

  if (role === "seller") {
    // Requests for the seller's listings
    let query = supabase
      .from("marketplace_service_requests")
      .select(`
        id, mode, status, optimistic_version, proposed_date, timezone, location,
        scope_summary, created_at, expires_at, updated_at,
        listing_id,
        marketplace_listings!inner (id, title, seller_user_id)
      `, { count: "exact" })
      .eq("marketplace_listings.seller_user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq("status", status)

    const { data: requests, count, error } = await query
    if (error) {
      return jsonError({ status: 500, code: "fetch_failed", message: "Failed to load service requests.", retryable: true })
    }

    // Check and auto-expire stale requests on read
    const hydratedRequests = (requests ?? []).map((r: any) => ({
      ...r,
      isExpired: isRequestExpired(r.expires_at),
    }))

    return NextResponse.json({ data: hydratedRequests, pagination: { total: count ?? 0, page, limit } })
  }

  // Default: buyer view
  let query = supabase
    .from("marketplace_service_requests")
    .select(`
      id, mode, status, optimistic_version, proposed_date, timezone, location,
      scope_summary, created_at, expires_at, updated_at, listing_id,
      marketplace_listings (id, title, cover_image_url)
    `, { count: "exact" })
    .eq("buyer_user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)

  const { data: requests, count, error } = await query
  if (error) {
    return jsonError({ status: 500, code: "fetch_failed", message: "Failed to load service requests.", retryable: true })
  }

  const hydratedRequests = (requests ?? []).map((r: any) => ({
    ...r,
    isExpired: isRequestExpired(r.expires_at),
  }))

  return NextResponse.json({ data: hydratedRequests, pagination: { total: count ?? 0, page, limit } })
}
