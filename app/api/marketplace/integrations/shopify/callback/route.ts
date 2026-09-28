import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { encryptIntegrationSecret } from "@/lib/marketplace/integration-credentials"
import { syncExternalProductsToMarketplace } from "@/lib/marketplace/integration-sync"
import {
  exchangeShopifyAuthorizationCode,
  normalizeShopifyDomain,
  syncShopifyCatalog,
  verifyShopifyOAuthHmac,
} from "@/lib/marketplace/shopify-adapter"
import {
  auditFeatureUnavailable,
  isAuditFeatureApproved,
} from "@/lib/config/audit-feature-gates"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (!isAuditFeatureApproved("marketplace_integrations"))
    return auditFeatureUnavailable("marketplace_integrations")
  const redirectBase = `${request.nextUrl.origin}/artist/store?tab=integrations`
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.redirect(`${request.nextUrl.origin}/login?redirectTo=/artist/store%3Ftab%3Dintegrations`)
    }

    const searchParams = request.nextUrl.searchParams
    if (!verifyShopifyOAuthHmac(searchParams)) {
      return NextResponse.redirect(`${redirectBase}&shopify=invalid_signature`)
    }

    const shopDomain = normalizeShopifyDomain(searchParams.get("shop") || "")
    const state = searchParams.get("state")
    const code = searchParams.get("code")
    if (!state || !code) return NextResponse.redirect(`${redirectBase}&shopify=missing_code`)

    const serviceSupabase = createServiceRoleClient()
    const { data: existing } = await serviceSupabase
      .from("marketplace_integrations")
      .select("*")
      .eq("seller_user_id", user.id)
      .eq("provider", "shopify")
      .eq("external_shop_domain", shopDomain)
      .maybeSingle()

    const metadata = existing?.metadata && typeof existing.metadata === "object" ? existing.metadata as Record<string, unknown> : {}
    if (!existing || metadata.oauthState !== state) {
      return NextResponse.redirect(`${redirectBase}&shopify=invalid_state`)
    }

    const token = await exchangeShopifyAuthorizationCode({ shopDomain, code })
    const { data: integration, error } = await serviceSupabase
      .from("marketplace_integrations")
      .update({
        status: "active",
        access_token: null,
        refresh_token: null,
        token_envelope: encryptIntegrationSecret(token.accessToken),
        provider_scopes: token.scope,
        external_account_id: shopDomain,
        external_shop_domain: shopDomain,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        last_error: null,
        last_error_at: null,
        metadata: {
          ...metadata,
          oauthState: null,
          oauthCompletedAt: new Date().toISOString(),
          tokenPayload: { scope: token.scope },
        },
      })
      .eq("id", existing.id)
      .select("*")
      .single()

    if (error || !integration) return NextResponse.redirect(`${redirectBase}&shopify=save_failed`)

    try {
      const syncResult = await syncShopifyCatalog({ shopDomain, accessToken: token.accessToken })
      await syncExternalProductsToMarketplace({
        supabase: serviceSupabase,
        sellerUserId: user.id,
        integration: { id: integration.id, provider: "shopify" },
        products: syncResult.products,
      })
      await serviceSupabase
        .from("marketplace_integrations")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_status: "completed",
          last_sync_error: null,
        })
        .eq("id", integration.id)
    } catch (syncError) {
      await serviceSupabase
        .from("marketplace_integrations")
        .update({
          last_sync_status: "failed",
          last_sync_error: syncError instanceof Error ? syncError.message : "Shopify initial sync failed",
        })
        .eq("id", integration.id)
    }

    return NextResponse.redirect(`${redirectBase}&shopify=connected`)
  } catch (error) {
    console.error("Unexpected Shopify callback error", error)
    return NextResponse.redirect(`${redirectBase}&shopify=error`)
  }
}
