import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  encryptIntegrationSecret,
  resolveIntegrationAccessToken,
  sanitizeMarketplaceIntegration,
} from "@/lib/marketplace/integration-credentials"
import { syncExternalProductsToMarketplace } from "@/lib/marketplace/integration-sync"
import { syncPrintfulCatalog } from "@/lib/marketplace/printful-adapter"
import {
  auditFeatureUnavailable,
  isAuditFeatureApproved,
} from "@/lib/config/audit-feature-gates"

const printfulSchema = z.object({
  action: z.enum(["connect", "sync", "disconnect"]).optional(),
  accessToken: z.string().min(8).optional(),
  externalAccountId: z.string().min(2).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
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
      .eq("provider", "printful")
      .maybeSingle()

    if (error) {
      console.error("Failed to fetch Printful integration", error)
      return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 })
    }

    return NextResponse.json({ data: sanitizeMarketplaceIntegration(data) })
  } catch (error) {
    console.error("Unexpected Printful integration GET error", error)
    return NextResponse.json({ error: "Unexpected integration error" }, { status: 500 })
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

    const payload = printfulSchema.parse(await request.json())
    const action = payload.action || (payload.accessToken ? "connect" : "sync")
    const serviceSupabase = createServiceRoleClient()

    const { data: existing } = await serviceSupabase
      .from("marketplace_integrations")
      .select("*")
      .eq("seller_user_id", user.id)
      .eq("provider", "printful")
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
      if (error) return NextResponse.json({ error: "Failed to disconnect Printful" }, { status: 500 })
      return NextResponse.json({ data: sanitizeMarketplaceIntegration(data), disconnected: true })
    }

    const accessToken = payload.accessToken || resolveIntegrationAccessToken(existing)
    if (!accessToken) {
      return NextResponse.json({ error: "Connect Printful before syncing products" }, { status: 400 })
    }

    const integrationPayload = {
      seller_user_id: user.id,
      provider: "printful",
      external_account_id: payload.externalAccountId || existing?.external_account_id || null,
      access_token: null,
      refresh_token: null,
      token_envelope: payload.accessToken ? encryptIntegrationSecret(payload.accessToken) : existing?.token_envelope || null,
      provider_scopes: existing?.provider_scopes || [],
      settings: payload.settings || existing?.settings || {},
      status: "active",
      connected_at: existing?.connected_at || new Date().toISOString(),
      disconnected_at: null,
      last_sync_status: "started",
      last_sync_error: null,
      last_error: null,
      last_error_at: null,
    }

    const { data: row, error } = await serviceSupabase
      .from("marketplace_integrations")
      .upsert(integrationPayload, { onConflict: "seller_user_id,provider" })
      .select("*")
      .single()

    if (error || !row) {
      console.error("Failed to save Printful integration", error)
      return NextResponse.json({ error: "Failed to save integration" }, { status: 500 })
    }
    integrationId = row.id

    const syncResult = await syncPrintfulCatalog({
      accessToken,
      externalAccountId: row.external_account_id,
    })
    const importResult = await syncExternalProductsToMarketplace({
      supabase: serviceSupabase,
      sellerUserId: user.id,
      integration: { id: row.id, provider: "printful" },
      products: syncResult.products,
    })

    const { data: updated } = await serviceSupabase
      .from("marketplace_integrations")
      .update({
        status: "active",
        last_synced_at: new Date().toISOString(),
        last_sync_status: "completed",
        last_sync_error: null,
      })
      .eq("id", row.id)
      .select("*")
      .single()

    return NextResponse.json({
      data: sanitizeMarketplaceIntegration(updated || row),
      sync: {
        ...syncResult,
        products: undefined,
        import: importResult,
      },
    })
  } catch (error) {
    if (integrationId) {
      try {
        const serviceSupabase = createServiceRoleClient()
        await serviceSupabase
          .from("marketplace_integrations")
          .update({
            status: "error",
            last_sync_status: "failed",
            last_sync_error: error instanceof Error ? error.message : "Printful sync failed",
            last_error: error instanceof Error ? error.message : "Printful sync failed",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", integrationId)
      } catch {}
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid integration payload", issues: error.issues }, { status: 400 })
    }
    console.error("Unexpected Printful integration POST error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected integration error" },
      { status: 500 }
    )
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

    const serviceSupabase = createServiceRoleClient()
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
      .eq("seller_user_id", user.id)
      .eq("provider", "printful")
      .select("*")
      .maybeSingle()

    if (error) return NextResponse.json({ error: "Failed to disconnect Printful" }, { status: 500 })
    return NextResponse.json({ data: sanitizeMarketplaceIntegration(data), disconnected: true })
  } catch (error) {
    console.error("Unexpected Printful integration DELETE error", error)
    return NextResponse.json({ error: "Unexpected integration error" }, { status: 500 })
  }
}
