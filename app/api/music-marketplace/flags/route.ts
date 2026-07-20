import { NextRequest, NextResponse } from "next/server"
import { requireApiUser } from "@/lib/api/route-helpers"
import { resolveMusicMarketplaceFlags } from "@/lib/music/marketplace/music-marketplace-flags"

export const dynamic = "force-dynamic"

/**
 * Lightweight marketplace flag resolution for artist UI discoverability.
 * Does not enable product surfaces — callers must still hit gated APIs.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicMarketplaceFlags(supabase, user.id)
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
