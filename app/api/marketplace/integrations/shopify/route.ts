import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  resolveIntegrationAccessToken,
  sanitizeMarketplaceIntegration,
} from "@/lib/marketplace/integration-credentials"
import { syncExternalProductsToMarketplace } from "@/lib/marketplace/integration-sync"
import {
  buildShopifyAuthorizationUrl,
  getShopifyScopes,
  normalizeShopifyDomain,
  syncShopifyCatalog,
} from "@/lib/marketplace/shopify-adapter"
import {
  auditFeatureUnavailable,
  isAuditFeatureApproved,
} from "@/lib/config/audit-feature-gates"

const shopifySchema = z.object({
  action: z.enum(["connect", "sync", "disconnect"]).optional(),
  shopDomain: z.string().min(3).optional(),
})

export const dynamic = "force-dynamic"

export async function GET() {
  if (!isAuditFeatureApproved("marketplace_integrations"))
    return auditFeatureUnavailable("marketplace_integrations")
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("marketplace_integrations")
      .select("*")
      .eq("seller_user_id", user.id)
      .eq("provider", "shopify")
      .maybeSingle()

    if (error) return NextResponse.json({ error: "Failed to fetch Shopify integration" }, { status: 500 })
    return NextResponse.json({ data: sanitizeMarketplaceIntegration(data) })
  } catch (error) {
    console.error("Unexpected Shopify integration GET error", error)
    return NextResponse.json({ error: "Unexpected Shopify integration error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isAuditFeatureApproved("marketplace_integrations"))
    return auditFeatureUnavailable("marketplace_integrations")
  let integrationId: string | null = null
  try {
    const authClient = await createClient()
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = shopifySchema.parse(await request.json())
    const action = payload.action || "connect"
    const serviceSupabase = createServiceRoleClient()

    const { data: existing } = await serviceSupabase
      .from("marketplace_integrations")
      .select("*")
      .eq("seller_user_id", user.id)
      .eq("provider", "shopify")
      .maybeSingle()

    if (action === "disconnect") {
      if (!existing) return NextResponse.json({ data: null, disconnected: true })
      const { data, error } = await serviceSupabase
        .from("marketplace_integrations")
        .update({
          status: "inactive",
          token_envelope: null,
          refresh_token_envelope: null,
          access_token: null,
          refresh_token: null,
          disconnected_at: new Date().toISOString(),
          last_sync_status: "skipped",
        })
        .eq("id", existing.id)
        .select("*")
        .single()
      if (error) return NextResponse.json({ error: "Failed to disconnect Shopify" }, { status: 500 })
      return NextResponse.json({ data: sanitizeMarketplaceIntegration(data), disconnected: true })
    }

    if (action === "connect") {
      if (!payload.shopDomain) return NextResponse.json({ error: "Shopify shop domain is required" }, { status: 400 })
      const shopDomain = normalizeShopifyDomain(payload.shopDomain)
      const state = randomBytes(18).toString("hex")
      const origin = request.nextUrl.origin
      const redirectUri = `${origin}/api/marketplace/integrations/shopify/callback`
      const authorizationUrl = buildShopifyAuthorizationUrl({ shopDomain, redirectUri, state })

      const { data, error } = await serviceSupabase
        .from("marketplace_integrations")
        .upsert(
          {
            seller_user_id: user.id,
            provider: "shopify",
            external_account_id: shopDomain,
            external_shop_domain: shopDomain,
            provider_scopes: getShopifyScopes(),
            status: existing?.status === "active" ? "active" : "inactive",
            metadata: {
              ...(existing?.metadata && typeof existing.metadata === "object" ? existing.metadata : {}),
              oauthState: state,
              oauthStartedAt: new Date().toISOString(),
              redirectUri,
            },
          },
          { onConflict: "seller_user_id,provider" }
        )
        .select("*")
        .single()
      if (error) return NextResponse.json({ error: "Failed to start Shopify connection" }, { status: 500 })

      return NextResponse.json({
        data: sanitizeMarketplaceIntegration(data),
        authorizationUrl,
      })
    }

    const accessToken = resolveIntegrationAccessToken(existing)
    const shopDomain = existing?.external_shop_domain || existing?.external_account_id
    if (!existing || !accessToken || typeof shopDomain !== "string") {
      return NextResponse.json({ error: "Connect Shopify before syncing products" }, { status: 400 })
    }
    integrationId = existing.id

    const syncResult = await syncShopifyCatalog({ shopDomain, accessToken })
    const importResult = await syncExternalProductsToMarketplace({
      supabase: serviceSupabase,
      sellerUserId: user.id,
      integration: { id: existing.id, provider: "shopify" },
      products: syncResult.products,
    })

    const { data: updated } = await serviceSupabase
      .from("marketplace_integrations")
      .update({
        status: "active",
        last_synced_at: new Date().toISOString(),
        last_sync_status: "completed",
        last_sync_error: null,
        last_error: null,
        last_error_at: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single()

    return NextResponse.json({
      data: sanitizeMarketplaceIntegration(updated || existing),
      sync: {
        provider: "shopify",
        status: syncResult.status,
        syncedCount: syncResult.syncedCount,
        import: importResult,
      },
    })
  } catch (error) {
    if (integrationId) {
      try {
        await createServiceRoleClient()
          .from("marketplace_integrations")
          .update({
            status: "error",
            last_sync_status: "failed",
            last_sync_error: error instanceof Error ? error.message : "Shopify sync failed",
            last_error: error instanceof Error ? error.message : "Shopify sync failed",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", integrationId)
      } catch {}
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Shopify payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected Shopify integration POST error", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected Shopify error" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await createServiceRoleClient()
      .from("marketplace_integrations")
      .update({
        status: "inactive",
        token_envelope: null,
        refresh_token_envelope: null,
        access_token: null,
        refresh_token: null,
        disconnected_at: new Date().toISOString(),
        last_sync_status: "skipped",
      })
      .eq("seller_user_id", user.id)
      .eq("provider", "shopify")
      .select("*")
      .maybeSingle()

    if (error) return NextResponse.json({ error: "Failed to disconnect Shopify" }, { status: 500 })
    return NextResponse.json({ data: sanitizeMarketplaceIntegration(data), disconnected: true })
  } catch (error) {
    console.error("Unexpected Shopify integration DELETE error", error)
    return NextResponse.json({ error: "Unexpected Shopify integration error" }, { status: 500 })
  }
}
