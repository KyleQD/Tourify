import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { userHasAdminSurfaceAccess } from "@/lib/auth/admin"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { jsonError } from "@/lib/api/route-helpers"

export const dynamic = "force-dynamic"

/** Shared admin auth guard for marketplace admin routes */
async function requireMarketplaceAdmin(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { admin: null, error: jsonError({ status: 401, code: "unauthorized", message: "Authentication required.", retryable: false }) }

  const isAdmin = await userHasAdminSurfaceAccess(auth.supabase, auth.user.id)
  if (!isAdmin) return { admin: null, error: jsonError({ status: 403, code: "forbidden", message: "Admin access required.", retryable: false }) }

  return { admin: auth.user, error: null }
}

const suspendSchema = z.object({
  action: z.enum(["suspend", "restore"]),
  reason: z.string().min(5).max(1000),
  targetType: z.enum(["listing", "storefront"]),
  targetId: z.string().uuid(),
})

/**
 * POST /api/marketplace/admin/moderation
 *
 * Admin suspends or restores a listing or storefront.
 * All actions are audited and non-destructive.
 */
export async function POST(request: NextRequest) {
  const { admin, error } = await requireMarketplaceAdmin(request)
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonError({ status: 400, code: "invalid_json", message: "Could not parse request body", retryable: false })
  }

  const parsed = suspendSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError({ status: 400, code: "invalid_request", message: "Invalid moderation payload", retryable: false, issues: parsed.error.issues })
  }
  const { action, reason, targetType, targetId } = parsed.data
  const svc = createServiceRoleClient()

  if (targetType === "listing") {
    // Listings use a text `status` column
    const newStatus = action === "suspend" ? "suspended" : "published"
    const { data: listing } = await svc.from("marketplace_listings").select("id, status").eq("id", targetId).maybeSingle()
    if (!listing) return jsonError({ status: 404, code: "target_not_found", message: "Listing not found.", retryable: false })
    if (action === "suspend" && listing.status === "suspended") return jsonError({ status: 409, code: "already_suspended", message: "Listing is already suspended.", retryable: false })
    if (action === "restore" && listing.status !== "suspended") return jsonError({ status: 409, code: "not_suspended", message: "Listing is not currently suspended.", retryable: false })

    const { error: updateError } = await svc.from("marketplace_listings").update({ status: newStatus }).eq("id", targetId)
    if (updateError) {
      console.error("Marketplace admin listing moderation failed", updateError)
      return jsonError({ status: 500, code: "update_failed", message: `Failed to ${action} listing.`, retryable: true })
    }

    await svc.from("marketplace_moderation_queue").insert({
      listing_id: targetId,
      reason,
      action,
      actor_user_id: admin!.id,
      previous_status: listing.status,
      new_status: newStatus,
      resolved_at: new Date().toISOString(),
    })

    return NextResponse.json({ data: { targetId, targetType, action, previousStatus: listing.status, newStatus, reason } })
  }

  // Storefronts use `is_active` boolean
  const newIsActive = action === "restore"
  const { data: storefront } = await svc.from("marketplace_storefronts").select("id, is_active").eq("id", targetId).maybeSingle()
  if (!storefront) return jsonError({ status: 404, code: "target_not_found", message: "Storefront not found.", retryable: false })
  if (action === "suspend" && storefront.is_active === false) return jsonError({ status: 409, code: "already_suspended", message: "Storefront is already suspended.", retryable: false })
  if (action === "restore" && storefront.is_active === true) return jsonError({ status: 409, code: "not_suspended", message: "Storefront is not currently suspended.", retryable: false })

  const { error: sfUpdateError } = await svc.from("marketplace_storefronts").update({ is_active: newIsActive }).eq("id", targetId)
  if (sfUpdateError) {
    console.error("Marketplace admin storefront moderation failed", sfUpdateError)
    return jsonError({ status: 500, code: "update_failed", message: `Failed to ${action} storefront.`, retryable: true })
  }

  await svc.from("marketplace_moderation_queue").insert({
    storefront_id: targetId,
    reason,
    action,
    actor_user_id: admin!.id,
    previous_status: storefront.is_active ? "active" : "suspended",
    new_status: newIsActive ? "active" : "suspended",
    resolved_at: new Date().toISOString(),
  })

  return NextResponse.json({ data: { targetId, targetType, action, previousStatus: storefront.is_active ? "active" : "suspended", newStatus: newIsActive ? "active" : "suspended", reason } })
}

/**
 * GET /api/marketplace/admin/moderation
 *
 * Admin lists moderation records with optional filters.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireMarketplaceAdmin(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 25
  const offset = (page - 1) * limit

  const svc = createServiceRoleClient()
  let query = svc
    .from("marketplace_moderation_queue")
    .select("id, listing_id, order_id, reason, details, status, created_at, resolved_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)

  const { data, count, error: fetchError } = await query
  if (fetchError) {
    return jsonError({ status: 500, code: "fetch_failed", message: "Failed to load moderation queue.", retryable: true })
  }

  return NextResponse.json({ data: data ?? [], pagination: { total: count ?? 0, page, limit } })
}
