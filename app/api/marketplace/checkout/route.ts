import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { requireApiUser, fromZodError, jsonError } from "@/lib/api/route-helpers"
import { calculateMarketplaceFeeBreakdown } from "@/lib/marketplace/fees"
import { groupCartLinesBySeller, hasSingleSellerCart } from "@/lib/marketplace/cart"
import { getSchemaNotReadyMessage, isSchemaCacheMissingError } from "@/lib/marketplace/schema-readiness"
import { getMarketplaceStripe } from "@/lib/marketplace/stripe-server"
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
      .select("id, seller_user_id, title, status, product_type, currency, base_price, cover_image_url, metadata, music_track_id")
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
        .select("id, listing_id, title, price")
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

    const lineItems = payload.lines.map(line => {
      const listing = listingMap.get(line.listingId)
      if (!listing) throw new Error("Missing listing")
      if (listing.status !== "published") throw new Error("Listing is not available for purchase")

      const variant = line.variantId ? variantMap.get(line.variantId) : null
      if (line.variantId && (!variant || variant.listing_id !== listing.id)) throw new Error("Invalid variant selected")
      const resolvedPrice = Number(variant?.price ?? listing.base_price ?? 0)
      if (resolvedPrice <= 0) throw new Error("Invalid listing price")

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
        listingMetadata: listing.metadata || {},
        musicTrackId: listing.music_track_id || null,
      }
    })

    const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0)
    const feeBreakdown = calculateMarketplaceFeeBreakdown({ subtotal })

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
        total_amount: feeBreakdown.total,
        shipping_address: payload.shippingAddress || null,
        metadata: payload.metadata || {},
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
      payout_provider: "manual",
      available_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        taxAmount: feeBreakdown.taxAmount,
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
      const stripe = getMarketplaceStripe()
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card", "us_bank_account"],
        payment_method_options: {
          us_bank_account: {
            financial_connections: {
              permissions: ["payment_method"],
            },
          },
        },
        mode: "payment",
        line_items: lineItems.map(item => ({
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
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/artist/store?checkout=success&order_id=${order.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/artist/store?checkout=cancelled&order_id=${order.id}`,
        metadata: {
          source: "marketplace_checkout",
          order_id: order.id,
          seller_user_id: sellerUserId,
          buyer_user_id: user.id,
        },
        customer_email: user.email || undefined,
      })
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
