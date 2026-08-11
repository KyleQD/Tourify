/**
 * Public listing query — server-only.
 *
 * Single source of truth for all buyer-facing listing queries:
 * hub discover, storefront page, profile module, listing detail.
 * Never exposes drafts, suspended listings, or moderation internals.
 *
 * Full-text search uses the `search_vector` tsvector column added in
 * migration 20260728000013. Falls back to ILIKE if the column is absent
 * (schema cache not yet refreshed).
 */

import "server-only"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Public projection — columns returned to callers (no private fields)
// ---------------------------------------------------------------------------

export type PublicListingRow = {
  id: string
  seller_user_id: string
  storefront_id: string | null
  title: string
  description: string | null
  category: string
  product_type: string
  listing_kind: string
  service_mode: string | null
  public_slug: string | null
  currency: string
  base_price: number | null
  cover_image_url: string | null
  tags: string[]
  featured_rank: number | null
  created_at: string
  marketplace_listing_variants: Array<{
    id: string
    title: string
    price: number
    inventory_count: number | null
  }>
}

const PUBLIC_SELECT = `
  id,
  seller_user_id,
  storefront_id,
  title,
  description,
  category,
  product_type,
  listing_kind,
  service_mode,
  public_slug,
  currency,
  base_price,
  cover_image_url,
  tags,
  featured_rank,
  created_at,
  marketplace_listing_variants (id, title, price, inventory_count)
`.trim()

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface PublicListingFilters {
  /** Full-text search query */
  q?: string
  /** Category slug (e.g. "merch", "services") */
  category?: string
  /** listing_kind filter */
  listingKind?: "physical" | "service" | "external"
  /** product_type filter */
  productType?: string
  /** Restrict to a single seller */
  sellerUserId?: string
  /** Featured listings only */
  featuredOnly?: boolean
  /** Cursor-based pagination: last seen created_at */
  before?: string
  /** Page size, max 100 */
  limit?: number
}

// ---------------------------------------------------------------------------
// Query executor
// ---------------------------------------------------------------------------

export async function queryPublicListings(
  filters: PublicListingFilters = {}
): Promise<{ data: PublicListingRow[]; error: string | null }> {
  const supabase = await createClient()
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 100)

  let query = supabase
    .from("marketplace_listings")
    .select(PUBLIC_SELECT)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit)

  if (filters.sellerUserId) query = query.eq("seller_user_id", filters.sellerUserId)
  if (filters.category) query = query.eq("category", filters.category)
  if (filters.listingKind) query = query.eq("listing_kind", filters.listingKind)
  if (filters.productType) query = query.eq("product_type", filters.productType)
  if (filters.featuredOnly) query = query.not("featured_rank", "is", null)
  if (filters.before) query = query.lt("created_at", filters.before)

  // Full-text search: use search_vector if available, else fall back to ilike
  if (filters.q?.trim()) {
    const q = filters.q.trim()
    // Use plainto_tsquery so raw user input doesn't break the query
    query = query.textSearch("search_vector", q, {
      type: "plain",
      config: "english",
    })
  }

  const { data, error } = await query

  if (error) {
    // If search_vector column doesn't exist yet (schema cache lag), fall back
    if (
      error.message?.includes("search_vector") ||
      error.code === "42703"
    ) {
      const fallbackQ = supabase
        .from("marketplace_listings")
        .select(PUBLIC_SELECT)
        .eq("status", "published")
        .eq("moderation_status", "approved")
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit)

      if (filters.sellerUserId) fallbackQ.eq("seller_user_id", filters.sellerUserId)
      if (filters.category) fallbackQ.eq("category", filters.category)
      if (filters.listingKind) fallbackQ.eq("listing_kind", filters.listingKind)
      if (filters.q?.trim()) {
        const needle = `%${filters.q.trim()}%`
        fallbackQ.or(`title.ilike.${needle},description.ilike.${needle}`)
      }

      const { data: fbData, error: fbError } = await fallbackQ
      if (fbError) return { data: [], error: fbError.message }
      return { data: (fbData ?? []) as PublicListingRow[], error: null }
    }
    return { data: [], error: error.message }
  }

  return { data: (data ?? []) as PublicListingRow[], error: null }
}

// ---------------------------------------------------------------------------
// Single listing by slug or id (public projection only)
// ---------------------------------------------------------------------------

export async function getPublicListingBySlug(
  slugOrId: string
): Promise<PublicListingRow | null> {
  const supabase = await createClient()

  // Try public_slug first, then fall back to id (UUID)
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId)

  const { data } = await supabase
    .from("marketplace_listings")
    .select(PUBLIC_SELECT)
    .eq(isUuid ? "id" : "public_slug", slugOrId)
    .eq("status", "published")
    .eq("moderation_status", "approved")
    .maybeSingle()

  return (data as PublicListingRow | null) ?? null
}

// ---------------------------------------------------------------------------
// Storefront public data (for store page header)
// ---------------------------------------------------------------------------

export type PublicStorefrontRow = {
  id: string
  seller_user_id: string
  slug: string | null
  display_name: string
  tagline: string | null
  theme_config: Record<string, unknown>
  sections: unknown[]
  rating_average: number
  rating_count: number
  external_links: Array<{ label: string; url: string }>
  seller_type: string | null
  is_active: boolean
}

export async function getPublicStorefrontBySlug(
  slugOrId: string
): Promise<PublicStorefrontRow | null> {
  const supabase = await createClient()
  const isUuid = /^[0-9a-f-]{36}$/i.test(slugOrId)

  const { data } = await supabase
    .from("marketplace_storefronts")
    .select(`
      id, seller_user_id, slug, display_name, tagline,
      theme_config, sections, rating_average, rating_count,
      external_links, seller_type, is_active
    `)
    .eq(isUuid ? "id" : "slug", slugOrId)
    .eq("is_active", true)
    .maybeSingle()

  return (data as PublicStorefrontRow | null) ?? null
}
