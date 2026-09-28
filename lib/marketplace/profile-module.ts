/**
 * Profile marketplace module — server-only data helper.
 *
 * Loads the seller's storefront + up to 6 featured listings for
 * embedding in artist/venue/general public profile pages.
 * Returns null when the storefront is inactive, disabled, or not found.
 */

import "server-only"
import { createClient } from "@/lib/supabase/server"
import { isMarketplaceEnabled } from "@/lib/marketplace/feature-flags"
import type { PublicListingRow, PublicStorefrontRow } from "@/lib/marketplace/public-listing-query"

export interface ProfileMarketplaceModuleData {
  storefront: PublicStorefrontRow
  featuredListings: PublicListingRow[]
  /** Total published listing count (for "View all" badge) */
  totalCount: number
}

const FEATURED_SELECT = `
  id, seller_user_id, storefront_id, title, description,
  category, product_type, listing_kind, service_mode, public_slug,
  currency, base_price, cover_image_url, tags, featured_rank, created_at,
  marketplace_listing_variants (id, title, price, inventory_count)
`.trim()

/**
 * Load the marketplace module data for a seller's profile.
 * Returns null when the seller has no active storefront or when the
 * global marketplace flag is off.
 */
export async function getProfileMarketplaceModule(
  sellerUserId: string
): Promise<ProfileMarketplaceModuleData | null> {
  if (!isMarketplaceEnabled()) return null

  const supabase = await createClient()

  // 1. Load storefront
  const { data: sf } = await supabase
    .from("marketplace_storefronts")
    .select(`
      id, seller_user_id, slug, display_name, tagline,
      theme_config, sections, rating_average, rating_count,
      external_links, seller_type, is_active
    `)
    .eq("seller_user_id", sellerUserId)
    .eq("is_active", true)
    .maybeSingle()

  if (!sf) return null

  // 2. Load up to 6 featured published listings (featured_rank not null first, then recents)
  const { data: listings } = await supabase
    .from("marketplace_listings")
    .select(FEATURED_SELECT)
    .eq("seller_user_id", sellerUserId)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(6)

  // 3. Total published count for "View all X listings" label
  const { count } = await supabase
    .from("marketplace_listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_user_id", sellerUserId)
    .eq("status", "published")
    .eq("moderation_status", "approved")

  return {
    storefront: sf as PublicStorefrontRow,
    featuredListings: (listings ?? []) as PublicListingRow[],
    totalCount: count ?? 0,
  }
}
