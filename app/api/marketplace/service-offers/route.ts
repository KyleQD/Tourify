import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiUser, jsonError } from "@/lib/api/route-helpers"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { buildOfferRevision } from "@/lib/marketplace/service-state-machine"

export const dynamic = "force-dynamic"

const lineItemSchema = z.object({
  title: z.string().min(1).max(300),
  quantity: z.number().int().min(1),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
})

const createOfferSchema = z.object({
  requestId: z.string().uuid(),
  lineItems: z.array(lineItemSchema).min(1).max(50),
  subtotal: z.number().nonnegative(),
  terms: z.string().max(5000).optional(),
  /** ISO datetime */
  expiresAt: z.string().datetime().optional(),
  depositPercentage: z.number().min(0).max(100).optional(),
  depositAmount: z.number().nonnegative().optional(),
  notes: z.string().max(2000).optional(),
})

/**
 * POST /api/marketplace/service-offers
 *
 * Seller creates or revises a quote for a service request.
 * Each call inserts a new revision row; prior revisions remain readable.
 * Only the seller who owns the listing associated with the request may create offers.
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

  const parsed = createOfferSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, code: "invalid_request", message: "Invalid offer payload", retryable: false, issues: parsed.error.issues })
  }
  const data = parsed.data

  // Load the service request and verify seller ownership
  const { data: sr, error: srError } = await supabase
    .from("marketplace_service_requests")
    .select(`
      id, status, mode,
      marketplace_listings!inner (id, seller_user_id)
    `)
    .eq("id", data.requestId)
    .maybeSingle()

  if (srError || !sr) {
    return jsonError({ status: 404, code: "request_not_found", message: "Service request not found.", retryable: false })
  }

  const listing = sr.marketplace_listings as any
  if (listing?.seller_user_id !== user.id) {
    return jsonError({ status: 403, code: "seller_only", message: "Only the seller can create or revise a quote.", retryable: false })
  }

  // Only quote_request mode supports offer revisions
  if (sr.mode !== "quote_request") {
    return jsonError({ status: 400, code: "quote_request_only", message: "Offer revisions are only supported for quote requests.", retryable: false })
  }

  // Request must be in a status that allows issuing quotes
  const allowedStatuses = ["submitted", "under_review"]
  if (!allowedStatuses.includes(sr.status)) {
    return jsonError({ status: 409, code: "wrong_status", message: `Cannot issue a quote in status '${sr.status}'.`, retryable: false })
  }

  // Get current max revision number
  const { data: existingOffers } = await supabase
    .from("marketplace_service_offers")
    .select("revision_number")
    .eq("request_id", data.requestId)
    .order("revision_number", { ascending: false })
    .limit(1)

  const prevRevisionNumber = (existingOffers?.[0] as any)?.revision_number ?? 0

  const newOfferRow = buildOfferRevision({
    requestId: data.requestId,
    createdBy: user.id,
    prevRevisionNumber,
    input: {
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      terms: data.terms,
      expiresAt: data.expiresAt,
      depositPercentage: data.depositPercentage,
      depositAmount: data.depositAmount,
      notes: data.notes,
    },
  })

  const { data: offer, error: insertError } = await supabase
    .from("marketplace_service_offers")
    .insert(newOfferRow)
    .select("id, revision_number, status, subtotal, expires_at, created_at")
    .single()

  if (insertError || !offer) {
    console.error("Failed to insert service offer", insertError)
    return jsonError({ status: 500, code: "create_failed", message: "Failed to create offer.", retryable: true })
  }

  // Transition request to under_review if still submitted
  if (sr.status === "submitted") {
    await supabase
      .from("marketplace_service_requests")
      .update({ status: "under_review" })
      .eq("id", data.requestId)
      .eq("status", "submitted")
  }

  return NextResponse.json({ data: offer }, { status: 201 })
}
