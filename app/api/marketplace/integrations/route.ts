import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sanitizeMarketplaceIntegration } from "@/lib/marketplace/integration-credentials"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [integrationsResult, productsResult, syncRunsResult, fulfillmentResult] = await Promise.all([
      supabase
        .from("marketplace_integrations")
        .select("*")
        .eq("seller_user_id", user.id)
        .order("provider", { ascending: true }),
      supabase
        .from("marketplace_integration_products")
        .select("*")
        .eq("seller_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("marketplace_integration_sync_runs")
        .select("*")
        .eq("seller_user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("marketplace_fulfillment_requests")
        .select("*")
        .eq("seller_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ])

    if (integrationsResult.error) {
      console.error("Failed to load marketplace integrations", integrationsResult.error)
      return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        integrations: (integrationsResult.data || []).map(row => sanitizeMarketplaceIntegration(row)),
        products: productsResult.data || [],
        syncRuns: syncRunsResult.data || [],
        fulfillmentRequests: fulfillmentResult.data || [],
      },
    })
  } catch (error) {
    console.error("Unexpected marketplace integrations GET error", error)
    return NextResponse.json({ error: "Unexpected integration error" }, { status: 500 })
  }
}
