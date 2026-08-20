import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import { commerceErrorResponse, commerceJsonResponse } from "@/lib/admin/commerce/errors"

export const dynamic = "force-dynamic"

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
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.manage_listings",
  })
  if (commerce instanceof NextResponse) return commerce

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_json",
      message: "Could not parse request body.",
      correlationId: commerce.request.correlationId,
    })
  }

  const parsed = suspendSchema.safeParse(body)
  if (!parsed.success) {
    return commerceErrorResponse({
      status: 400,
      code: "invalid_request",
      message: "Invalid moderation payload.",
      issues: parsed.error.issues,
      correlationId: commerce.request.correlationId,
    })
  }
  const { action, reason, targetType, targetId } = parsed.data
  const svc = createServiceRoleClient()

  if (targetType === "listing") {
    // Listings use a text `status` column
    const newStatus = action === "suspend" ? "suspended" : "published"
    const { data: listing } = await svc.from("marketplace_listings").select("id, status").eq("id", targetId).maybeSingle()
    if (!listing) {
      return commerceErrorResponse({
        status: 404,
        code: "target_not_found",
        message: "Listing not found.",
        correlationId: commerce.request.correlationId,
      })
    }
    if (action === "suspend" && listing.status === "suspended") {
      return commerceErrorResponse({
        status: 409,
        code: "already_suspended",
        message: "Listing is already suspended.",
        correlationId: commerce.request.correlationId,
      })
    }
    if (action === "restore" && listing.status !== "suspended") {
      return commerceErrorResponse({
        status: 409,
        code: "not_suspended",
        message: "Listing is not currently suspended.",
        correlationId: commerce.request.correlationId,
      })
    }

    const { error: updateError } = await svc.from("marketplace_listings").update({ status: newStatus }).eq("id", targetId)
    if (updateError) {
      console.error("Marketplace admin listing moderation failed", updateError)
      return commerceErrorResponse({
        status: 500,
        code: "update_failed",
        message: `Failed to ${action} listing.`,
        retryable: true,
        correlationId: commerce.request.correlationId,
      })
    }

    await svc.from("marketplace_moderation_queue").insert({
      listing_id: targetId,
      reason,
      action,
      actor_user_id: commerce.actor.userId,
      previous_status: listing.status,
      new_status: newStatus,
      resolved_at: new Date().toISOString(),
    })

    return commerceJsonResponse({
      data: { targetId, targetType, action, previousStatus: listing.status, newStatus, reason },
    }, {
      correlationId: commerce.request.correlationId,
    })
  }

  // Storefronts use `is_active` boolean
  const newIsActive = action === "restore"
  const { data: storefront } = await svc.from("marketplace_storefronts").select("id, is_active").eq("id", targetId).maybeSingle()
  if (!storefront) {
    return commerceErrorResponse({
      status: 404,
      code: "target_not_found",
      message: "Storefront not found.",
      correlationId: commerce.request.correlationId,
    })
  }
  if (action === "suspend" && storefront.is_active === false) {
    return commerceErrorResponse({
      status: 409,
      code: "already_suspended",
      message: "Storefront is already suspended.",
      correlationId: commerce.request.correlationId,
    })
  }
  if (action === "restore" && storefront.is_active === true) {
    return commerceErrorResponse({
      status: 409,
      code: "not_suspended",
      message: "Storefront is not currently suspended.",
      correlationId: commerce.request.correlationId,
    })
  }

  const { error: sfUpdateError } = await svc.from("marketplace_storefronts").update({ is_active: newIsActive }).eq("id", targetId)
  if (sfUpdateError) {
    console.error("Marketplace admin storefront moderation failed", sfUpdateError)
    return commerceErrorResponse({
      status: 500,
      code: "update_failed",
      message: `Failed to ${action} storefront.`,
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  await svc.from("marketplace_moderation_queue").insert({
    storefront_id: targetId,
    reason,
    action,
    actor_user_id: commerce.actor.userId,
    previous_status: storefront.is_active ? "active" : "suspended",
    new_status: newIsActive ? "active" : "suspended",
    resolved_at: new Date().toISOString(),
  })

  return commerceJsonResponse({
    data: {
      targetId,
      targetType,
      action,
      previousStatus: storefront.is_active ? "active" : "suspended",
      newStatus: newIsActive ? "active" : "suspended",
      reason,
    },
  }, {
    correlationId: commerce.request.correlationId,
  })
}

/**
 * GET /api/marketplace/admin/moderation
 *
 * Admin lists moderation records with optional filters.
 */
export async function GET(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.manage_cases",
  })
  if (commerce instanceof NextResponse) return commerce

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
    return commerceErrorResponse({
      status: 500,
      code: "fetch_failed",
      message: "Failed to load moderation queue.",
      retryable: true,
      correlationId: commerce.request.correlationId,
    })
  }

  return commerceJsonResponse({
    data: data ?? [],
    pagination: { total: count ?? 0, page, limit },
  }, {
    correlationId: commerce.request.correlationId,
  })
}
