import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { requireApiUser, fromZodError, jsonError } from "@/lib/api/route-helpers"
import { calculateMarketplaceFeeBreakdown } from "@/lib/marketplace/fees"
import { groupCartLinesBySeller, hasSingleSellerCart } from "@/lib/marketplace/cart"
import { getInsufficientInventoryItem } from "@/lib/marketplace/inventory"
import { getSchemaNotReadyMessage, isSchemaCacheMissingError } from "@/lib/marketplace/schema-readiness"
import { getSellerPayoutReadiness } from "@/lib/marketplace/seller-payout-readiness"
import { getStripeClient } from "@/lib/stripe"
import { marketplaceCheckoutRequestSchema } from "@tourify/api-contracts"

export const dynamic = "force-dynamic"

function parseCheckoutErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Invalid checkout payload"
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const payload = marketplaceCheckoutRequestSchema.parse(await request.json())
    const listingIds = payload.lines.map(line => line.listingId)

    const { data: listings, error: listingsError } = await supabase
      .from("marketplace_listings")
      .select("id, seller_user_id, title, status, product_type, currency, base_price, cover_image_url, metadata, music_track_id, integration_id, source_provider, external_product_id, fulfillment_provider, fulfillment_profile, inventory_count, has_unlimited_inventory")
      .in("id", listingIds)

    if (listingsError || !listings?.length) {
      if (isSchemaCacheMissingError(listingsError)) {
        return jsonError({
          status: 503,
          code: "schema_not_ready",
          message: getSchemaNotReadyMessage({ feature: "Marketplace checkout" }),
          retryable: true,
        })
      }
      console.error("Failed to fetch checkout listings", listingsError)
      return jsonError({
        status: 400,
        code: "checkout_listings_unavailable",
        message: "Unable to load items for checkout",
        retryable: false,
      })
    }

    const listingMap = new Map<string, any>(listings.map((listing: any) => [listing.id, listing]))
    const missingListing = payload.lines.find(line => !listingMap.has(line.listingId))
    if (missingListing)
      return jsonError({
        status: 400,
        code: "listing_missing",
        message: "One or more listings no longer exist",
        retryable: false,
      })

    const sellerScopedLines = payload.lines.map(line => ({
      ...line,
      sellerUserId: listingMap.get(line.listingId)?.seller_user_id as string,
    }))

    if (!hasSingleSellerCart(sellerScopedLines)) {
      return jsonError({
        status: 400,
        code: "single_seller_required",
        message: "MVP checkout supports one seller per order",
        retryable: false,
        issues: groupCartLinesBySeller(sellerScopedLines),
      })
    }

    const sellerUserId = sellerScopedLines[0].sellerUserId
    if (!sellerUserId)
      return jsonError({
        status: 400,
        code: "seller_missing",
        message: "Unable to determine seller",
        retryable: false,
      })
    if (sellerUserId === user.id)
      return jsonError({
        status: 400,
        code: "self_purchase_not_allowed",
        message: "You cannot purchase your own listing",
        retryable: false,
      })

    const variantIds = payload.lines.map(line => line.variantId).filter(Boolean) as string[]
    let variantMap = new Map<string, any>()
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from("marketplace_listing_variants")
        .select("id, listing_id, title, price, inventory_count, external_variant_id, external_product_id, fulfillment_provider, fulfillment_profile")
        .in("id", variantIds)
      variantMap = new Map<string, any>((variants || []).map((variant: any) => [variant.id, variant]))
    }

    const currency = listings[0].currency || "USD"
    const hasMixedCurrencies = listings.some((listing: any) => (listing.currency || "USD") !== currency)
    if (hasMixedCurrencies)
      return jsonError({
        status: 400,
        code: "mixed_currency_not_supported",
        message: "All checkout items must share one currency",
        retryable: false,
      })

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
      return jsonError({
        status: 409,
        code: "insufficient_inventory",
        message: "One or more items do not have enough inventory for this purchase.",
        retryable: false,
        issues: { listingId: insufficient.listingId, variantId: insufficient.variantId },
      })
    }

    const lineItems = payload.lines.map(line => {
      const listing = listingMap.get(line.listingId)
      if (!listing) throw new Error("Missing listing")
      if (listing.status !== "published") throw new Error("Listing is not available for purchase")

      const variant = line.variantId ? variantMap.get(line.variantId) : null
      if (line.variantId && (!variant || variant.listing_id !== listing.id)) throw new Error("Invalid variant selected")
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
    // Prefer Stripe-native shipping collection for POD; payload address remains an optional override.
    const useStripeShipping = needsShippingAddress && !payload.shippingAddress

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0)
    const feeBreakdown = calculateMarketplaceFeeBreakdown({ subtotal })

    const payoutReadiness = await getSellerPayoutReadiness({ supabase, sellerUserId })
    if (!payoutReadiness.ready || !payoutReadiness.accountId) {
      return jsonError({
        status: 409,
        code: "seller_payouts_not_ready",
        message: "This seller is finishing payout setup and cannot accept purchases yet.",
        retryable: false,
        issues: payoutReadiness,
      })
    }
    const sellerStripeAccountId = payoutReadiness.accountId

    const { data: order, error: orderError } = await supabase
      .from("marketplace_orders")
      .insert({
        buyer_user_id: user.id,
        seller_user_id: sellerUserId,
        status: "pending",
        payment_status: "processing",
        payment_provider: "stripe",
        currency,
        subtotal_amount: feeBreakdown.subtotal,
        platform_fee_amount: feeBreakdown.platformFee,
        tax_amount: feeBreakdown.taxAmount,
        total_amount: feeBreakdown.buyerTotal,
        shipping_address: payload.shippingAddress || null,
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
      console.error("Failed to create marketplace order", orderError)
      return jsonError({
        status: 500,
        code: "order_create_failed",
        message: "Failed to create order",
        retryable: true,
      })
    }

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
    const { error: orderItemsError } = await supabase.from("marketplace_order_items").insert(orderItemsPayload)
    if (orderItemsError) {
      await supabase.from("marketplace_orders").delete().eq("id", order.id)
      console.error("Failed to create order items", orderItemsError)
      return jsonError({
        status: 500,
        code: "order_items_create_failed",
        message: "Failed to create order items",
        retryable: true,
      })
    }

    const { error: payoutError } = await supabase.from("marketplace_payout_ledger").insert({
      order_id: order.id,
      seller_user_id: sellerUserId,
      gross_amount: feeBreakdown.subtotal,
      platform_fee_amount: feeBreakdown.platformFee,
      net_amount: feeBreakdown.sellerPayout,
      payout_status: "pending",
      payout_provider: "stripe_connect",
      available_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        taxAmount: feeBreakdown.taxAmount,
        buyerTotal: feeBreakdown.buyerTotal,
        sellerStripeAccountId,
      },
    })
    if (payoutError) {
      console.error("Failed to create payout ledger entry", payoutError)
      await supabase.from("marketplace_order_items").delete().eq("order_id", order.id)
      await supabase.from("marketplace_orders").delete().eq("id", order.id)
      return jsonError({
        status: 500,
        code: "payout_ledger_init_failed",
        message: "Failed to initialize payout ledger",
        retryable: true,
      })
    }

    let session: Stripe.Checkout.Session
    try {
      const stripe = getStripeClient()
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin

      const checkoutLineItems = [
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
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: Math.round(feeBreakdown.platformFee * 100),
            product_data: {
              name: "Tourify Service Fee (10%)",
            },
          },
        },
      ]

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card", "us_bank_account"],
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ["payment_method"],
            },
          },
        },
        mode: "payment",
        line_items: checkoutLineItems,
        success_url: `${siteUrl}/marketplace?checkout=success&order_id=${order.id}`,
        cancel_url: `${siteUrl}/marketplace?checkout=cancelled&order_id=${order.id}`,
        metadata: {
          source: "marketplace_checkout",
          order_id: order.id,
          seller_user_id: sellerUserId,
          buyer_user_id: user.id,
        },
        customer_email: user.email || undefined,
      }

      if (useStripeShipping) {
        sessionParams.shipping_address_collection = {
          allowed_countries: ["US", "CA", "GB", "AU", "NZ", "IE", "DE", "FR", "NL", "ES", "IT", "SE", "NO", "DK", "FI", "MX", "JP"],
        }
      }

      if (sellerStripeAccountId) {
        sessionParams.payment_intent_data = {
          application_fee_amount: Math.round(feeBreakdown.platformFee * 100),
          transfer_data: {
            destination: sellerStripeAccountId,
          },
        }
      }

      session = await stripe.checkout.sessions.create(sessionParams)
    } catch (sessionError) {
      console.error("Failed to create Stripe checkout session", sessionError)
      await supabase.from("marketplace_payout_ledger").delete().eq("order_id", order.id)
      await supabase.from("marketplace_order_items").delete().eq("order_id", order.id)
      await supabase.from("marketplace_orders").delete().eq("id", order.id)
      return jsonError({
        status: 500,
        code: "stripe_checkout_init_failed",
        message: "Unable to initialize checkout session",
        retryable: true,
      })
    }

    await supabase
      .from("marketplace_orders")
      .update({
        stripe_checkout_session_id: session.id,
        payment_reference: session.id,
        metadata: {
          ...(order.metadata || {}),
          checkout_session_id: session.id,
        },
      })
      .eq("id", order.id)

    return NextResponse.json({
      data: {
        orderId: order.id,
        checkoutUrl: session.url,
      },
    })
  } catch (error) {
    const zodError = fromZodError(error, parseCheckoutErrorMessage(error))
    if (zodError) return zodError
    console.error("Unexpected marketplace checkout error", error)
    return jsonError({
      status: 500,
      code: "internal_error",
      message: "Unexpected checkout error",
      retryable: true,
    })
  }
}
