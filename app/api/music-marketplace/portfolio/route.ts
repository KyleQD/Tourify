import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LIQUIDITY_DISCLAIMER } from "@/lib/music/marketplace/marketplace-domain"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
  if (!flags.music_marketplace_investor_portal_enabled)
    return jsonError({
      status: 404,
      code: "feature_disabled",
      message: "Investor portfolio is not available.",
      retryable: false,
    })

  const { data: positions, error: positionsError } = await supabase
    .from("music_marketplace_positions")
    .select("id, security_class_id, official_position_id, quantity_minor, restriction_status, reconciliation_status, observed_at")
    .eq("investor_user_id", user.id)
    .order("observed_at", { ascending: false })
    .limit(200)

  if (positionsError)
    return jsonError({ status: 500, code: "portfolio_query_failed", message: "Unable to load positions.", retryable: true })

  const { data: distributions } = await supabase
    .from("music_marketplace_distribution_lots")
    .select("id, distribution_id, amount_minor, status, created_at")
    .eq("investor_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  const { data: taxDocs } = await supabase
    .from("music_marketplace_tax_document_links")
    .select("id, tax_year, document_type, partner_id, partner_document_ref, access_url_expires_at, created_at")
    .eq("investor_user_id", user.id)
    .order("tax_year", { ascending: false })
    .limit(50)

  return NextResponse.json({
    data: {
      positions: positions || [],
      distributions: distributions || [],
      taxDocumentLinks: taxDocs || [],
    },
    ownershipNote: "Official ownership is the transfer agent / approved partner ledger. Tourify positions are synchronized read models.",
    disclaimer: LIQUIDITY_DISCLAIMER,
    enabled: true,
  })
}
