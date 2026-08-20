import { NextRequest, NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { resolveCommerceContext } from "@/lib/admin/commerce/resolve-context"
import { commerceJsonResponse } from "@/lib/admin/commerce/errors"

export const dynamic = "force-dynamic"

/**
 * GET /api/marketplace/admin/overview
 *
 * Admin health dashboard: open moderation reports, failed webhooks,
 * stuck orders, fee rule count, active listings.
 */
export async function GET(request: NextRequest) {
  const commerce = await resolveCommerceContext(request, {
    requiredPermission: "commerce.view",
  })
  if (commerce instanceof NextResponse) return commerce

  const svc = createServiceRoleClient()

  const [
    moderationResult,
    webhookResult,
    stuckOrdersResult,
    activeListingsResult,
    feeRulesResult,
  ] = await Promise.all([
    // Open moderation reports
    svc
      .from("marketplace_moderation_queue")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
    // Failed webhook events
    svc
      .from("marketplace_payment_events")
      .select("id", { count: "exact", head: true })
      .eq("processing_status", "failed"),
    // Stuck orders: payment_status=processing AND created > 2h ago
    svc
      .from("marketplace_orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "processing")
      .lt("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()),
    // Active published listings
    svc
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
    // Active fee rules
    svc
      .from("marketplace_fee_rules")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ])

  return commerceJsonResponse({
    data: {
      openModerationReports: moderationResult.count ?? 0,
      failedWebhookEvents: webhookResult.count ?? 0,
      stuckOrders: stuckOrdersResult.count ?? 0,
      activeListings: activeListingsResult.count ?? 0,
      activeFeeRules: feeRulesResult.count ?? 0,
    },
  }, {
    correlationId: commerce.request.correlationId,
  })
}
