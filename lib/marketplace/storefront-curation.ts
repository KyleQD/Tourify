export const MAX_FEATURED_LISTINGS = 12

export const DEFAULT_STOREFRONT_SECTIONS = [
  "featured",
  "music",
  "photos-and-prints",
  "merch",
  "fine-art",
  "services",
  "tickets",
] as const

export type StorefrontSectionId = (typeof DEFAULT_STOREFRONT_SECTIONS)[number]

export const STOREFRONT_SECTION_LABELS: Record<string, string> = {
  featured: "Featured",
  music: "Music",
  "photos-and-prints": "Photos & Prints",
  merch: "Merch",
  "fine-art": "Fine Art",
  services: "Services",
  tickets: "Tickets",
  support: "Tips",
  photography: "Photography",
  rentals: "Rentals",
}

export function normalizeStorefrontSections(input: unknown): string[] {
  if (!Array.isArray(input) || input.length === 0) return [...DEFAULT_STOREFRONT_SECTIONS]
  const cleaned = input
    .map(value => String(value || "").trim())
    .filter(Boolean)
  const unique = Array.from(new Set(cleaned))
  if (!unique.includes("featured")) unique.unshift("featured")
  return unique.length ? unique : [...DEFAULT_STOREFRONT_SECTIONS]
}

export function isFeaturedListing(listing: { featured_rank?: number | null }) {
  return listing.featured_rank != null && Number(listing.featured_rank) >= 0
}

export async function enforceFeaturedRankCap({
  supabase,
  sellerUserId,
  listingId,
  nextFeaturedRank,
}: {
  supabase: any
  sellerUserId: string
  listingId?: string | null
  nextFeaturedRank: number | null | undefined
}): Promise<{ ok: true; featuredRank: number | null } | { ok: false; message: string }> {
  if (nextFeaturedRank == null) return { ok: true, featuredRank: null }

  const { data: featuredRows } = await supabase
    .from("marketplace_listings")
    .select("id")
    .eq("seller_user_id", sellerUserId)
    .not("featured_rank", "is", null)
    .limit(MAX_FEATURED_LISTINGS + 5)

  const others = (featuredRows || []).filter((row: { id: string }) => row.id !== listingId)
  if (others.length >= MAX_FEATURED_LISTINGS) {
    return {
      ok: false,
      message: `You can feature up to ${MAX_FEATURED_LISTINGS} listings. Unfeature another item first.`,
    }
  }

  return { ok: true, featuredRank: Math.max(0, Math.floor(nextFeaturedRank)) }
}
