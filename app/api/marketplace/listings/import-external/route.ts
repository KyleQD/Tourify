/**
 * POST /api/marketplace/listings/import-external
 *
 * Step 1 of the external listing import flow.
 * Accepts a URL, runs the SSRF-safe metadata fetch, and returns the sanitised
 * metadata for the seller to review before confirming.
 *
 * The canonical_url is stored server-side in marketplace_external_listings
 * only AFTER the seller confirms. This endpoint returns the metadata preview
 * WITHOUT the canonical_url — that is only written on confirmation.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { resolveActingContext } from "@/lib/auth/acting-context"
import { jsonError, fromZodError } from "@/lib/api/route-helpers"
import { requireMarketplaceEnabled, requireExternalListingsEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { resolveMarketplaceEntitlements } from "@/lib/marketplace/entitlement-resolver"
import { fetchExternalListingMetadata } from "@/lib/marketplace/external-import"

export const dynamic = "force-dynamic"

const importSchema = z.object({
  url: z.string().url().max(2000),
})

export async function POST(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard
  const extGuard = requireExternalListingsEnabled()
  if (extGuard) return extGuard

  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx
    const { accountType } = ctx

    const entitlements = resolveMarketplaceEntitlements(accountType)
    if (!entitlements.canCreateExternalListings) {
      return jsonError({
        status: 403,
        code: "external_listing_not_permitted",
        message: "External listings are not permitted for this account type.",
      })
    }

    const body = importSchema.parse(await request.json())
    const result = await fetchExternalListingMetadata(body.url)

    if (!result.success) {
      return jsonError({
        status: 422,
        code: result.code,
        message: result.message,
      })
    }

    // Return metadata preview. canonicalUrl is deliberately omitted —
    // the client never receives the destination URL directly.
    const { canonicalUrl: _hidden, ...safeMetadata } = result.metadata

    return NextResponse.json({
      data: {
        ...safeMetadata,
        // We include a short-lived server token so the confirm step can
        // securely retrieve the canonical URL without re-fetching.
        _canonicalUrlHash: Buffer.from(result.metadata.canonicalUrl).toString("base64url"),
      },
    })
  } catch (err) {
    const zodError = fromZodError(err, "Invalid import payload")
    if (zodError) return zodError
    console.error("External import error", err)
    return jsonError({ status: 500, code: "internal_error", message: "Unexpected error during import." })
  }
}

/**
 * POST /api/marketplace/listings/import-external?confirm=1
 *
 * Step 2: seller confirms the metadata (optionally overriding title/description).
 * This call creates (or updates) the marketplace_external_listings row with the
 * canonical URL for the given listing_id.
 */
const confirmSchema = z.object({
  listingId: z.string().uuid(),
  canonicalUrlHash: z.string(),  // base64url-encoded canonical URL from step 1
  overrides: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    displayedPrice: z.string().max(30).optional().nullable(),
    displayedCurrency: z.string().max(10).optional().nullable(),
  }).optional(),
  // Metadata snapshot from step 1 (minus canonicalUrl)
  metadataSnapshot: z.record(z.string(), z.unknown()).optional(),
  providerName: z.string().max(100).optional().nullable(),
  providerDomain: z.string().max(255).optional().nullable(),
})

export async function PUT(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard
  const extGuard = requireExternalListingsEnabled()
  if (extGuard) return extGuard

  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx
    const { user: { id: userId }, accountType, supabase } = ctx

    const entitlements = resolveMarketplaceEntitlements(accountType)
    if (!entitlements.canCreateExternalListings) {
      return jsonError({ status: 403, code: "external_listing_not_permitted", message: "External listings are not permitted for this account type." })
    }

    const body = confirmSchema.parse(await request.json())

    // Verify listing ownership
    const { data: listing } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id, listing_kind")
      .eq("id", body.listingId)
      .maybeSingle()

    if (!listing) return jsonError({ status: 404, code: "listing_not_found", message: "Listing not found." })
    if (listing.seller_user_id !== userId) return jsonError({ status: 403, code: "forbidden", message: "Forbidden." })
    if (listing.listing_kind !== "external") {
      return jsonError({ status: 400, code: "not_external_listing", message: "This listing is not of kind 'external'." })
    }

    // Decode the canonical URL hash (base64url → original URL)
    let canonicalUrl: string
    try {
      canonicalUrl = Buffer.from(body.canonicalUrlHash, "base64url").toString("utf8")
      if (!canonicalUrl.startsWith("https://")) throw new Error("Not HTTPS")
    } catch {
      return jsonError({ status: 400, code: "invalid_canonical_url_hash", message: "Invalid URL token." })
    }

    const providerDomain = body.providerDomain ?? new URL(canonicalUrl).hostname.replace(/^www\./, "")

    const { data: externalListing, error: upsertError } = await supabase
      .from("marketplace_external_listings")
      .upsert({
        listing_id: body.listingId,
        canonical_url: canonicalUrl,
        provider_name: body.providerName ?? null,
        provider_domain: providerDomain,
        metadata_snapshot: body.metadataSnapshot ?? {},
        displayed_price: body.overrides?.displayedPrice ?? null,
        displayed_currency: body.overrides?.displayedCurrency ?? null,
        safety_status: "pending_review",
        seller_confirmed_at: new Date().toISOString(),
      }, { onConflict: "listing_id" })
      .select("id, listing_id, provider_name, provider_domain, safety_status, displayed_price, displayed_currency, seller_confirmed_at")
      .single()

    if (upsertError) {
      console.error("Failed to upsert external listing", upsertError)
      return jsonError({ status: 500, code: "db_error", message: "Failed to save external listing." })
    }

    return NextResponse.json({ data: externalListing })
  } catch (err) {
    const zodError = fromZodError(err, "Invalid confirm payload")
    if (zodError) return zodError
    console.error("External import confirm error", err)
    return jsonError({ status: 500, code: "internal_error", message: "Unexpected error confirming import." })
  }
}
