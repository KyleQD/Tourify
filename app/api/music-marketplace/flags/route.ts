import { NextRequest, NextResponse } from "next/server"
import { requireMarketplaceAccount } from "@/lib/marketplace/music-commerce-auth"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

/**
 * Lightweight marketplace flag resolution for artist UI discoverability.
 * Does not enable product surfaces — callers must still hit gated APIs.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireMarketplaceAccount(request)
  if (!authResult.success) return authResult.response
  const { userId, supabase } = authResult.account
  const flags = await resolveMusicMarketplaceFlags(supabase, userId)
  const offeringsEnabled = flags.music_marketplace_offerings_enabled
  const investorPortalEnabled = flags.music_marketplace_investor_portal_enabled

  return NextResponse.json({
    data: {
      ...flags,
      discoverable: offeringsEnabled || investorPortalEnabled,
      offeringsEnabled,
      investorPortalEnabled,
    },
  })
}
