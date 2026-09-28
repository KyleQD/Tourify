import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requirePublicDiscoveryEnabled } from "@/lib/marketplace/require-marketplace-enabled"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/listings/[id]/redirect
 *
 * Safe stored-destination redirect for external listings.
 *
 * Security rules:
 * - Only reads the stored canonical_url from marketplace_external_listings.
 * - Never accepts a destination URL from the query string.
 * - Only redirects when safety_status = 'approved'.
 * - Records an attribution click before redirecting.
 * - Returns 404 for unknown/non-external listings.
 * - Returns 451 for blocked/flagged domains.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = requirePublicDiscoveryEnabled()
  if (guard) return guard

  const { id: listingId } = await params
  const source = request.nextUrl.searchParams.get("from") ?? "unknown"

  const supabase = await createClient()

  // 1. Load the listing and its external record in one join
  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select(`
      id,
      listing_kind,
      status,
      moderation_status,
      marketplace_external_listings (
        canonical_url,
        provider_domain,
        safety_status
      )
    `)
    .eq("id", listingId)
    .maybeSingle()

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 })
  }

  // Must be an external listing
  if (listing.listing_kind !== "external") {
    return NextResponse.json({ error: "Not an external listing." }, { status: 400 })
  }

  // Must be published and approved
  if (listing.status !== "published" || listing.moderation_status !== "approved") {
    return NextResponse.json({ error: "Listing is not available." }, { status: 404 })
  }

  const ext = Array.isArray(listing.marketplace_external_listings)
    ? listing.marketplace_external_listings[0]
    : listing.marketplace_external_listings

  if (!ext?.canonical_url) {
    return NextResponse.json({ error: "No destination configured." }, { status: 404 })
  }

  // Block flagged/blocked domains
  if (ext.safety_status === "blocked" || ext.safety_status === "flagged") {
    return NextResponse.json(
      { error: "This link has been disabled for safety reasons." },
      { status: 451 }
    )
  }

  // 2. Record attribution click (best-effort, non-blocking)
  const rawSession = request.headers.get("x-session-id") ?? request.headers.get("x-forwarded-for") ?? ""
  const sessionFingerprint = rawSession
    ? Buffer.from(rawSession).toString("base64").slice(0, 32)
    : null

  const validSurfaces = ["hub", "storefront", "profile", "feed", "direct", "unknown"]
  const safeSurface = validSurfaces.includes(source) ? source : "unknown"

  supabase
    .from("marketplace_external_clicks")
    .insert({
      listing_id: listingId,
      source_surface: safeSurface,
      session_fingerprint: sessionFingerprint,
    })
    .then(() => {/* fire-and-forget */})
    .catch(() => {/* swallow — attribution is never blocking */})

  // 3. Redirect to stored destination
  return NextResponse.redirect(ext.canonical_url, { status: 302 })
}
