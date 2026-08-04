import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import {
  getPublicStorefrontBySlug,
  queryPublicListings,
} from "@/lib/marketplace/public-listing-query"
import { listStorefrontTickets } from "@/lib/marketplace/ticket-source-adapter"
import { ListingCard } from "@/components/marketplace/listing-card"
import { STOREFRONT_SECTION_LABELS } from "@/lib/marketplace/storefront-curation"
import { requirePublicDiscoveryEnabled } from "@/lib/marketplace/require-marketplace-enabled"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ "store-slug": string }>
  searchParams: Promise<{ category?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { "store-slug": slug } = await params
  const sf = await getPublicStorefrontBySlug(slug)
  if (!sf) return { title: "Storefront not found" }
  return {
    title: `${sf.display_name} — Tourify Marketplace`,
    description: sf.tagline ?? `Browse listings from ${sf.display_name} on Tourify.`,
    openGraph: {
      title: sf.display_name,
      description: sf.tagline ?? undefined,
    },
  }
}

export default async function PublicStorefrontPage({ params, searchParams }: PageProps) {
  // Feature flag guard
  const guard = requirePublicDiscoveryEnabled()
  if (guard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <p className="text-slate-400 text-sm">Marketplace is not currently available.</p>
      </div>
    )
  }

  const { "store-slug": slug } = await params
  const { category: activeCategory } = await searchParams

  const sf = await getPublicStorefrontBySlug(slug)
  if (!sf) notFound()

  // Load seller profile for display
  const supabase = await createClient()
  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .eq("id", sf.seller_user_id)
    .maybeSingle()

  // Load listings
  const { data: listings } = await queryPublicListings({
    sellerUserId: sf.seller_user_id,
    category: activeCategory && activeCategory !== "all" ? activeCategory : undefined,
    limit: 60,
  })

  // Load ticket collections (org storefronts)
  const ticketListings = await listStorefrontTickets({
    supabase,
    storeId: sf.id,
    organizationUserId: sf.seller_user_id,
    limit: 20,
  })

  const allItems = [...listings, ...ticketListings]

  // Derive available category tabs from listings
  const presentCategories = Array.from(new Set(allItems.map(l => l.category)))
  const categoryTabs = [
    "all",
    ...["featured", "music", "photos-and-prints", "merch", "services", "tickets", "fine-art", "photography", "rentals", "support"]
      .filter(c => presentCategories.includes(c) || c === "all"),
  ]

  const displayItems = activeCategory && activeCategory !== "all"
    ? allItems.filter(l => l.category === activeCategory)
    : allItems

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      {/* Storefront header */}
      <header className="border-b border-slate-800 bg-slate-950/80 px-4 py-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {sellerProfile?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sellerProfile.avatar_url}
              alt={sf.display_name}
              className="h-16 w-16 rounded-full object-cover border-2 border-slate-700"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white">{sf.display_name}</h1>
            {sf.tagline && <p className="mt-1 text-sm text-slate-300">{sf.tagline}</p>}
            {sellerProfile?.bio && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{sellerProfile.bio}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              {sf.rating_count > 0 && (
                <span>★ {Number(sf.rating_average).toFixed(1)} ({sf.rating_count} reviews)</span>
              )}
              {sellerProfile?.username && (
                <Link href={`/artist/${sellerProfile.username}`} className="hover:text-white underline">
                  View profile
                </Link>
              )}
            </div>
          </div>
          <Link href="/marketplace" className="shrink-0 text-xs text-slate-400 hover:text-white">
            ← Marketplace
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Category tabs */}
        {categoryTabs.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Category filter">
            {categoryTabs.map(cat => (
              <Link
                key={cat}
                href={cat === "all" ? `/marketplace/store/${slug}` : `/marketplace/store/${slug}?category=${cat}`}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  (activeCategory ?? "all") === cat
                    ? "border-purple-500 bg-purple-500/20 text-purple-200"
                    : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white",
                ].join(" ")}
              >
                {STOREFRONT_SECTION_LABELS[cat] ?? cat.replace(/-/g, " ")}
              </Link>
            ))}
          </nav>
        )}

        {/* Listing grid */}
        {displayItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center">
            <p className="text-sm text-slate-400">
              {activeCategory && activeCategory !== "all"
                ? "No listings in this category yet."
                : "This storefront has no published listings yet."}
            </p>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Listings">
            {displayItems.map(item => (
              <ListingCard
                key={item.id}
                listing={item}
                variant="hub"
              />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
