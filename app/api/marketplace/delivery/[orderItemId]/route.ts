import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api/route-helpers"
import {
  hasReachedDownloadLimit,
  resolveStorageTarget,
  shouldRefreshSignedUrl,
} from "@/lib/marketplace/entitlement-delivery"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderItemId: string }> }) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth

    const { orderItemId } = await params
    const { data: item, error: itemError } = await supabase
      .from("marketplace_order_items")
      .select("id, order_id")
      .eq("id", orderItemId)
      .single()
    if (itemError || !item) return NextResponse.json({ error: "Order item not found" }, { status: 404 })

    const { data: order } = await supabase
      .from("marketplace_orders")
      .select("buyer_user_id, seller_user_id")
      .eq("id", item.order_id)
      .single()
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
    if (order.buyer_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: entitlement, error } = await supabase
      .from("marketplace_entitlements")
      .select("*")
      .eq("order_item_id", orderItemId)
      .eq("buyer_user_id", user.id)
      .eq("status", "active")
      .maybeSingle()
    if (error) return NextResponse.json({ error: "Failed to load entitlement" }, { status: 500 })
    if (!entitlement) return NextResponse.json({ error: "No entitlement available" }, { status: 404 })

    const now = Date.now()
    const shouldRefresh = shouldRefreshSignedUrl({
      signedUrl: entitlement.signed_url,
      signedUrlExpiresAt: entitlement.signed_url_expires_at,
      nowMs: now,
    })
    const isAtDownloadLimit = hasReachedDownloadLimit({
      maxDownloads: entitlement.max_downloads,
      downloadCount: entitlement.download_count,
    })
    if (isAtDownloadLimit) {
      return NextResponse.json({ error: "Download limit reached for this entitlement" }, { status: 403 })
    }

    let refreshedSignedUrl = entitlement.signed_url || entitlement.asset_url || entitlement.watermarked_asset_url || ""
    let refreshedExpires = entitlement.signed_url_expires_at || null
    if (shouldRefresh) {
      const storageTarget = resolveStorageTarget({
        signedUrl: entitlement.signed_url,
        signedUrlExpiresAt: entitlement.signed_url_expires_at,
        maxDownloads: entitlement.max_downloads,
        downloadCount: entitlement.download_count,
        assetBucket: entitlement.asset_bucket,
        assetPath: entitlement.asset_path,
        assetUrl: entitlement.asset_url,
        watermarkedAssetUrl: entitlement.watermarked_asset_url,
      })

      if (storageTarget) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from(storageTarget.bucket)
          .createSignedUrl(storageTarget.path, 60 * 60)

        if (!signedError && signedData?.signedUrl) {
          refreshedSignedUrl = signedData.signedUrl
          refreshedExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        }
      }
    }
    if (!refreshedSignedUrl) {
      return NextResponse.json({ error: "Download asset is not available" }, { status: 409 })
    }

    const service = createServiceRoleClient()
    let updateQuery = service
      .from("marketplace_entitlements")
      .update({
        signed_url: refreshedSignedUrl,
        signed_url_expires_at: refreshedExpires,
        download_count: entitlement.download_count + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq("id", entitlement.id)
      .eq("buyer_user_id", user.id)
      .eq("status", "active")
      .eq("download_count", entitlement.download_count)

    if (entitlement.max_downloads > 0) {
      updateQuery = updateQuery.lt("download_count", entitlement.max_downloads)
    }

    const { data: updated, error: updateError } = await updateQuery
      .select("id, signed_url, signed_url_expires_at, max_downloads, download_count, last_downloaded_at")
      .maybeSingle()

    if (updateError) {
      console.error("Failed to refresh entitlement URL", updateError)
      return NextResponse.json({ error: "Failed to refresh download URL" }, { status: 500 })
    }
    if (!updated) {
      return NextResponse.json(
        { error: "Download was already claimed by another request. Please try again." },
        { status: 409 },
      )
    }

    return NextResponse.json({
      data: {
        entitlementId: updated.id,
        downloadUrl: updated.signed_url,
        signedUrlExpiresAt: updated.signed_url_expires_at,
        maxDownloads: updated.max_downloads,
        downloadCount: updated.download_count,
        lastDownloadedAt: updated.last_downloaded_at,
      },
    })
  } catch (error) {
    console.error("Unexpected marketplace delivery GET error", error)
    return NextResponse.json({ error: "Unexpected delivery error" }, { status: 500 })
  }
}
