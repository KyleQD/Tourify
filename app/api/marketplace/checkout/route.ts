import { NextRequest, NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import type Stripe from "stripe"
import { requireMarketplaceEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { fromZodError, jsonError } from "@/lib/api/route-helpers"
import { loadActiveFeeSnapshot, calculateFeeBreakdown } from "@/lib/marketplace/fee-calculator"
import { groupCartLinesBySeller, hasSingleSellerCart } from "@/lib/marketplace/cart"
import { getInsufficientInventoryItem } from "@/lib/marketplace/inventory"
import { getSchemaNotReadyMessage, isSchemaCacheMissingError } from "@/lib/marketplace/schema-readiness"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { getStripeClient } from "@/lib/stripe"
import { createServerClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { marketplaceCheckoutRequestSchema } from "@tourify/api-contracts"

export const dynamic = "force-dynamic"

function parseCheckoutErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Invalid checkout payload"
}

/** SHA-256 hash of normalised payload for idempotency dedup */
function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

export async function POST(request: NextRequest) {
  const guard = requireMarketplaceEnabled()
  if (guard) return guard

  try {
    // ── Auth: optional for guest checkout ─────────────────────────────────────
    const authResult = await authenticateApiRequest(request)
    // authResult is null for unauthenticated (guest) requests — that is allowed.

    // Determine which Supabase client to use for reading listings (user-scoped if
    // authenticated, server-scoped for guests). Order writes always use service role.
    const supabase = authResult
      ? authResult.supabase
      : await createServerClient()

    const buyer = authResult?.user ?? null

    // ── Parse payload ─────────────────────────────────────────────────────────
    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return jsonError({ status: 400, code: "invalid_json", message: "Could not parse request body", retryable: false })
    }

    const parsed = marketplaceCheckoutRequestSchema.safeParse(rawBody)
    if (!parsed.success) {
      return jsonError({
        status: 400,
        code: "invalid_request",
        message: "Invalid checkout payload",
        retryable: false,
        issues: parsed.error.issues,
      })
    }
    const payload = parsed.data

    // Guest checkout requires a guest_email in the payload
    if (!buyer && !payload.guestEmail) {
      return jsonError({
        status: 400,
        code: "guest_email_required",
        message: "A valid email address is required for guest checkout.",
        retryable: false,
      })
    }

    // ── Idempotency ──────────────────────────────────────────────────────────
    // Client must supply an idempotency key. If a pending/completed attempt with
    // the same key already exists we return the existing checkout URL.
    const idempotencyKey = payload.idempotencyKey
    const inputHash = hashPayload({
      lines: payload.lines,
      guestEmail: payload.guestEmail ?? null,
      buyerUserId: buyer?.id ?? null,
    })

    if (idempotencyKey) {
      const svc = createServiceRoleClient()
      const { data: existingAttempt } = await svc
        .from("marketplace_checkout_attempts")
        .select("id, status, order_id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle()

      if (existingAttempt) {
        if (existingAttempt.status === "pending" && existingAttempt.order_id) {
          // Return existing order + checkout URL if still valid
          const { data: existingOrder } = await svc
            .from("marketplace_orders")
            .select("id, stripe_checkout_session_id")
            .eq("id", existingAttempt.order_id)
            .maybeSingle()

          if (existingOrder?.stripe_checkout_session_id) {
            const stripe = getStripeClient()
            try {
              const session = await stripe.checkout.sessions.retrieve(existingOrder.stripe_checkout_session_id)
              if (session.status === "open" && session.url) {
                return NextResponse.json({ data: { orderId: existingOrder.id, checkoutUrl: session.url } })
              }
            } catch {
              // Session expired/invalid — fall through to create a fresh one
            }
          }
        }
        if (existingAttempt.status === "completed") {
          return jsonError({ status: 409, code: "already_completed", message: "This checkout has already been completed.", retryable: false })
        }
      }
    }

    // ── Load listings ─────────────────────────────────────────────────────────
    const listingIds = payload.lines.map(line => line.listingId)

    const { data: listings, error: listingsError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id, title, status, product_type, currency, base_price, cover_image_url, metadata, music_track_id, integration_id, source_provider, external_product_id, fulfillment_provider, fulfillment_profile, inventory_count, has_unlimited_inventory, listing_kind")
      .in("id", listingIds)

    if (listingsError || !listings?.length) {
      if (isSchemaCacheMissingError(listingsError)) {
        return jsonError({ status: 503, code: "schema_not_ready", message: getSchemaNotReadyMessage({ feature: "Marketplace checkout" }), retryable: true })
      }
      return jsonError({ status: 400, code: "checkout_listings_unavailable", message: "Unable to load items for checkout", retryable: false })
    }

    const listingMap = new Map<string, any>(listings.map((l: any) => [l.id, l]))
    const missingListing = payload.lines.find(line => !listingMap.has(line.listingId))
    if (missingListing) {
      return jsonError({ status: 400, code: "listing_missing", message: "One or more listings no longer exist", retryable: false })
    }

    const sellerScopedLines = payload.lines.map(line => ({
      ...line,
      sellerUserId: listingMap.get(line.listingId)?.seller_user_id as string,
    }))

    if (!hasSingleSellerCart(sellerScopedLines)) {
      return jsonError({ status: 400, code: "single_seller_required", message: "MVP checkout supports one seller per order", retryable: false, issues: groupCartLinesBySeller(sellerScopedLines) })
    }

    const sellerUserId = sellerScopedLines[0].sellerUserId
    if (!sellerUserId) {
      return jsonError({ status: 400, code: "seller_missing", message: "Unable to determine seller", retryable: false })
    }

    // Self-purchase guard (only when buyer is authenticated)
    if (buyer && sellerUserId === buyer.id) {
      return jsonError({ status: 400, code: "self_purchase_not_allowed", message: "You cannot purchase your own listing", retryable: false })
    }

    // External listings cannot go through native checkout
    const hasExternalListing = listings.some((l: any) => l.listing_kind === "external")
    if (hasExternalListing) {
      return jsonError({ status: 400, code: "external_listing_native_checkout", message: "External listings cannot be purchased through native checkout. Use the redirect link.", retryable: false })
    }

    // ── Variants ──────────────────────────────────────────────────────────────
    const variantIds = payload.lines.map(line => line.variantId).filter(Boolean) as string[]
    let variantMap = new Map<string, any>()
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("marketplace_listing_variants")
        .select("id, listing_id, title, price, inventory_count, external_variant_id, external_product_id, fulfillment_provider, fulfillment_profile")
        .in("id", variantIds)
      variantMap = new Map<string, any>((variants || []).map((v: any) => [v.id, v]))
    }

    const currency = listings[0].currency || "USD"
    const hasMixedCurrencies = listings.some((l: any) => (l.currency || "USD") !== currency)
    if (hasMixedCurrencies) {
      return jsonError({ status: 400, code: "mixed_currency_not_supported", message: "All checkout items must share one currency", retryable: false })
    }

    // ── Inventory check ───────────────────────────────────────────────────────
    const insufficient = getInsufficientInventoryItem(
      payload.lines.map(line => {
        const listing = listingMap.get(line.listingId)
        const variant = line.variantId ? variantMap.get(line.variantId) : null
        return {
          listingId: line.listingId,
          variantId: line.variantId,
          quantity: line.quantity,
          hasUnlimitedInventory: listing?.has_unlimited_inventory,
          listingInventoryCount: listing?.inventory_count,
          variantInventoryCount: variant?.inventory_count,
        }
      })
    )
    if (insufficient) {
      return jsonError({ status: 409, code: "insufficient_inventory", message: "One or more items do not have enough inventory for this purchase.", retryable: false, issues: { listingId: insufficient.listingId, variantId: insufficient.variantId } })
    }

    // ── Build line items (server-authoritative prices) ────────────────────────
    const lineItems = payload.lines.map(line => {
      const listing = listingMap.get(line.listingId)
      if (!listing) throw new Error("Missing listing")
      if (listing.status !== "published") throw new Error("Listing is not available for purchase")

      const variant = line.variantId ? variantMap.get(line.variantId) : null
      if (line.variantId && (!variant || variant.listing_id !== listing.id)) throw new Error("Invalid variant selected")

      // Server-authoritative price — never trust client price
      const resolvedPrice = Number(variant?.price ?? listing.base_price ?? 0)
      if (resolvedPrice <= 0) throw new Error("Invalid listing price")

      const fulfillmentProvider = variant?.fulfillment_provider || listing.fulfillment_provider || null
      const listingMetadata = listing.metadata && typeof listing.metadata === "object" ? listing.metadata : {}
      const fulfillmentProfile = variant?.fulfillment_profile || listing.fulfillment_profile || {}
      const titleSuffix = variant?.title ? ` (${variant.title})` : ""
      return {
        listingId: line.listingId,
        variantId: line.variantId || null,
        productType: listing.product_type || "digital_asset",
        listingKind: listing.listing_kind || "native",
        title: `${listing.title}${titleSuffix}`,
        quantity: line.quantity,
        unitPrice: resolvedPrice,
        lineTotal: Math.round(resolvedPrice * line.quantity * 100) / 100,
        coverImageUrl: listing.cover_image_url || null,
        listingMetadata: {
          ...listingMetadata,
          integrationId: listing.integration_id || null,
          sourceProvider: listing.source_provider || listingMetadata.sourceProvider || null,
          externalProductId: variant?.external_product_id || listing.external_product_id || listingMetadata.externalProductId || null,
          externalVariantId: variant?.external_variant_id || listingMetadata.externalVariantId || null,
          fulfillmentProvider,
          fulfillmentProfile,
        },
        musicTrackId: listing.music_track_id || null,
        fulfillmentProvider,
      }
    })

    const needsShippingAddress = lineItems.some(item => item.fulfillmentProvider === "printful")
    const useStripeShipping = needsShippingAddress && !payload.shippingAddress

    // ── Fee calculation (live fee rules) ─────────────────────────────────────
    const svcClient = createServiceRoleClient()
    const listingKind = lineItems[0]?.listingKind ?? "native"
    const feeSnapshot = await loadActiveFeeSnapshot(svcClient, {
      accountType: undefined,       // not scoping by buyer account type at checkout
      listingKind,
    })

    const subtotalCents = Math.round(lineItems.reduce((sum, l) => sum + l.lineTotal, 0) * 100)
    const feeBreakdown = calculateFeeBreakdown(subtotalCents, feeSnapshot)

    // ── Seller payout readiness ───────────────────────────────────────────────
    const payoutReadiness = await getSellerPayoutReadiness({ supabase, sellerUserId })
    if (!payoutReadiness.ready || !payoutReadiness.accountId) {
      return jsonError({ status: 409, code: "seller_payouts_not_ready", message: "This seller is finishing payout setup and cannot accept purchases yet.", retryable: false, issues: payoutReadiness })
    }
    const sellerStripeAccountId = payoutReadiness.accountId

    // ── Guest token (if guest) ────────────────────────────────────────────────
    const isGuest = !buyer
    const guestAccessToken = isGuest ? randomBytes(32).toString("hex") : null
    const guestEmail = isGuest ? (payload.guestEmail ?? null) : null
    const guestTokenExpiresAt = isGuest ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() : null

    // ── Create order (service role — bypasses RLS for guest writes) ───────────
    const { data: order, error: orderError } = await svcClient
      .from("marketplace_orders")
      .insert({
        buyer_user_id: buyer?.id ?? null,
        seller_user_id: sellerUserId,
        status: "pending",
        payment_status: "processing",
        payment_provider: "stripe",
        currency,
        subtotal_amount: feeBreakdown.subtotalCents / 100,
        platform_fee_amount: feeBreakdown.platformFeeCents / 100,
        tax_amount: feeBreakdown.taxCents / 100,
        total_amount: feeBreakdown.totalCents / 100,
        shipping_address: payload.shippingAddress || null,
        applied_fee_snapshot: feeSnapshot,
        idempotency_key: idempotencyKey ?? null,
        guest_email: guestEmail,
        guest_access_token: guestAccessToken,
        guest_access_token_expires_at: guestTokenExpiresAt,
        metadata: {
          ...(payload.metadata || {}),
          sellerStripeAccountId,
          payoutProvider: "stripe_connect",
          needsShippingAddress,
          useStripeShipping,
        },
      })
      .select("*")
      .single()

    if (orderError || !order) {
      // Check unique violation on idempotency_key (race condition)
      if (orderError?.code === "23505") {
        return jsonError({ status: 409, code: "idempotency_conflict", message: "A checkout with this idempotency key is already in progress.", retryable: false })
      }
      console.error("Failed to create marketplace order", orderError)
      return jsonError({ status: 500, code: "order_create_failed", message: "Failed to create order", retryable: true })
    }

    // ── Order items ───────────────────────────────────────────────────────────
    const orderItemsPayload = lineItems.map(item => ({
      order_id: order.id,
      listing_id: item.listingId,
      variant_id: item.variantId,
      product_type: item.productType,
      title: item.title,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      line_total: item.lineTotal,
      fulfillment_status: item.productType === "digital_asset" ? "digital_ready" : "pending",
      fulfillment_provider: item.fulfillmentProvider || null,
      service_status: item.productType === "service" ? "pending" : null,
      metadata: item.listingMetadata,
      music_track_id: item.musicTrackId,
    }))

    const { error: orderItemsError } = await svcClient.from("marketplace_order_items").insert(orderItemsPayload)
    if (orderItemsError) {
      await svcClient.from("marketplace_orders").delete().eq("id", order.id)
      console.error("Failed to create order items", orderItemsError)
      return jsonError({ status: 500, code: "order_items_create_failed", message: "Failed to create order items", retryable: true })
    }

    // ── Payout ledger ─────────────────────────────────────────────────────────
    const { error: payoutError } = await svcClient.from("marketplace_payout_ledger").insert({
      order_id: order.id,
      seller_user_id: sellerUserId,
      gross_amount: feeBreakdown.subtotalCents / 100,
      platform_fee_amount: feeBreakdown.platformFeeCents / 100,
      net_amount: (feeBreakdown.subtotalCents - feeBreakdown.platformFeeCents) / 100,
      payout_status: "pending",
      payout_provider: "stripe_connect",
      available_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        taxAmount: feeBreakdown.taxCents / 100,
        buyerTotal: feeBreakdown.totalCents / 100,
        sellerStripeAccountId,
        feeSnapshotId: feeSnapshot.ruleId,
      },
    })
    if (payoutError) {
      console.error("Failed to create payout ledger entry", payoutError)
      await svcClient.from("marketplace_order_items").delete().eq("order_id", order.id)
      await svcClient.from("marketplace_orders").delete().eq("id", order.id)
      return jsonError({ status: 500, code: "payout_ledger_init_failed", message: "Failed to initialize payout ledger", retryable: true })
    }

    // ── Record checkout attempt for idempotency ───────────────────────────────
    if (idempotencyKey) {
      await svcClient.from("marketplace_checkout_attempts").upsert({
        idempotency_key: idempotencyKey,
        buyer_user_id: buyer?.id ?? null,
        guest_email: guestEmail,
        order_id: order.id,
        input_hash: inputHash,
        status: "pending",
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }, { onConflict: "idempotency_key", ignoreDuplicates: true })
    }

    // ── Stripe Checkout session ───────────────────────────────────────────────
    let session: Stripe.Checkout.Session
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

    try {
      const stripe = getStripeClient()

      const checkoutLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
        ...lineItems.map(item => ({
          quantity: item.quantity,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(item.unitPrice * 100),
            product_data: {
              name: item.title,
              images: item.coverImageUrl ? [item.coverImageUrl] : undefined,
            },
          },
        })),
      ]

      // Add platform fee as a line item if non-zero
      if (feeBreakdown.platformFeeCents > 0) {
        checkoutLineItems.push({
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: feeBreakdown.platformFeeCents,
            product_data: { name: `${feeSnapshot.description}` },
          },
        })
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card", "us_bank_account"],
        payment_method_options: {
          us_bank_account: {
            financial_connections: { permissions: ["payment_method"] },
          },
        },
        mode: "payment",
        line_items: checkoutLineItems,
        success_url: `${siteUrl}/marketplace/order/${guestAccessToken ?? "{CHECKOUT_SESSION_ID}"}?checkout=success`,
        cancel_url: `${siteUrl}/marketplace?checkout=cancelled&order_id=${order.id}`,
        metadata: {
          source: "marketplace_checkout",
          order_id: order.id,
          seller_user_id: sellerUserId,
          buyer_user_id: buyer?.id ?? "",
          is_guest: isGuest ? "1" : "0",
        },
        // Pre-fill email for both authenticated and guest buyers
        customer_email: buyer?.email ?? guestEmail ?? undefined,
      }

      if (useStripeShipping) {
        sessionParams.shipping_address_collection = {
          allowed_countries: ["US", "CA", "GB", "AU", "NZ", "IE", "DE", "FR", "NL", "ES", "IT", "SE", "NO", "DK", "FI", "MX", "JP"],
        }
      }

      if (sellerStripeAccountId) {
        sessionParams.payment_intent_data = {
          application_fee_amount: feeBreakdown.platformFeeCents,
          transfer_data: { destination: sellerStripeAccountId },
        }
      }

      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (sessionError) {
      console.error("Failed to create Stripe checkout session", sessionError)
      await svcClient.from("marketplace_payout_ledger").delete().eq("order_id", order.id)
      await svcClient.from("marketplace_order_items").delete().eq("order_id", order.id)
      await svcClient.from("marketplace_orders").delete().eq("id", order.id)
      return jsonError({ status: 500, code: "stripe_checkout_init_failed", message: "Unable to initialize checkout session", retryable: true })
    }

    // ── Persist session ID on order ───────────────────────────────────────────
    await svcClient
      .from("marketplace_orders")
      .update({
        stripe_checkout_session_id: session.id,
        payment_reference: session.id,
        metadata: { ...(order.metadata || {}), checkout_session_id: session.id },
      })
      .eq("id", order.id)

    return NextResponse.json({
      data: {
        orderId: order.id,
        orderNumber: order.order_number ?? null,
        checkoutUrl: session.url,
        // Return guest token to client so it can redirect to the confirmation page
        ...(isGuest && guestAccessToken ? { guestAccessToken } : {}),
      },
    })
  } catch (error) {
    const zodError = fromZodError(error, parseCheckoutErrorMessage(error))
    if (zodError) return zodError
    console.error("Unexpected marketplace checkout error", error)
    return jsonError({ status: 500, code: "internal_error", message: "Unexpected checkout error", retryable: true })
  }
}
