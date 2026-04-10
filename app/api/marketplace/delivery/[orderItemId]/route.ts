import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

function getStoragePathFromUrl(input: string | null): { bucket: string; path: string } | null {
  if (!input) return null
  try {
    const url = new URL(input)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const objectIndex = pathParts.findIndex(part => part === "object")
    if (objectIndex === -1) return null
    const maybeVisibility = pathParts[objectIndex + 1]
    const bucketIndex = maybeVisibility === "public" || maybeVisibility === "sign" ? objectIndex + 2 : objectIndex + 1
    const bucket = pathParts[bucketIndex]
    const objectPath = pathParts.slice(bucketIndex + 1).join("/")
    if (!bucket || !objectPath) return null
    return { bucket, path: objectPath }
  } catch {
    return null
  }
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ orderItemId: string }> }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
    if (order.buyer_user_id !== user.id && order.seller_user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: entitlement, error } = await supabase
      .from("marketplace_entitlements")
      .select("*")
      .eq("order_item_id", orderItemId)
      .maybeSingle()
    if (error) return NextResponse.json({ error: "Failed to load entitlement" }, { status: 500 })
    if (!entitlement) return NextResponse.json({ error: "No entitlement available" }, { status: 404 })

    const now = Date.now()
    const expiresAt = entitlement.signed_url_expires_at ? new Date(entitlement.signed_url_expires_at).getTime() : 0
    const shouldRefreshSignedUrl = !entitlement.signed_url || !expiresAt || expiresAt <= now
    const hasReachedDownloadLimit = entitlement.max_downloads > 0 && entitlement.download_count >= entitlement.max_downloads
    if (hasReachedDownloadLimit) {
      return NextResponse.json({ error: "Download limit reached for this entitlement" }, { status: 403 })
    }

    let refreshedSignedUrl = entitlement.signed_url || entitlement.asset_url || entitlement.watermarked_asset_url || ""
    let refreshedExpires = entitlement.signed_url_expires_at || null
    if (shouldRefreshSignedUrl) {
      const storageTarget =
        entitlement.asset_bucket && entitlement.asset_path
          ? { bucket: entitlement.asset_bucket, path: entitlement.asset_path }
          : getStoragePathFromUrl(entitlement.asset_url || entitlement.watermarked_asset_url || null)

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

    const { data: updated, error: updateError } = await supabase
      .from("marketplace_entitlements")
      .update({
        signed_url: refreshedSignedUrl,
        signed_url_expires_at: refreshedExpires,
        download_count: entitlement.download_count + 1,
        last_downloaded_at: new Date().toISOString(),
      })
      .eq("id", entitlement.id)
      .select("*")
      .single()

    if (updateError) {
      console.error("Failed to refresh entitlement URL", updateError)
      return NextResponse.json({ error: "Failed to refresh download URL" }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error("Unexpected marketplace delivery GET error", error)
    return NextResponse.json({ error: "Unexpected delivery error" }, { status: 500 })
  }
}
