"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ListingCard } from "@/components/marketplace/listing-card"
import { ListingQuickView } from "@/components/marketplace/listing-quick-view"
import type { ListingCardData } from "@/components/marketplace/listing-card"

interface ProfileMarketplaceModuleProps {
  storefront: {
    id: string
    slug: string | null
    display_name: string
  }
  featuredListings: ListingCardData[]
  totalCount: number
  /** Visibility state determines what the module shows */
  state?: "active" | "paused" | "no_listings" | "not_configured"
}

export function ProfileMarketplaceModule({
  storefront,
  featuredListings,
  totalCount,
  state = featuredListings.length > 0 ? "active" : "no_listings",
}: ProfileMarketplaceModuleProps) {
  const [quickViewListing, setQuickViewListing] = useState<ListingCardData | null>(null)
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null)

  const storefrontHref = storefront.slug
    ? `/marketplace/store/${storefront.slug}`
    : null

  async function handleCheckout(listing: ListingCardData) {
    setCheckoutLoadingId(listing.id)
    try {
      const variants = listing.marketplace_listing_variants ?? []
      const variantId = variants[0]?.id
      const res = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lines: [{ listingId: listing.id, variantId, quantity: 1 }],
        }),
      })
      const body = await res.json()
      if (res.ok && body.data?.checkoutUrl) {
        window.location.href = body.data.checkoutUrl
      }
    } finally {
      setCheckoutLoadingId(null)
    }
  }

  if (state === "not_configured" || state === "paused") {
    return null
  }

  return (
    <section className="space-y-4" aria-label="Marketplace">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{storefront.display_name}</h2>
          {totalCount > 0 && (
            <p className="text-xs text-slate-400">
              {totalCount} listing{totalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {storefrontHref && (
          <Button asChild variant="outline" size="sm" className="border-slate-700 text-white">
            <Link href={storefrontHref}>View marketplace</Link>
          </Button>
        )}
      </div>

      {/* No listings yet */}
      {state === "no_listings" || featuredListings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center">
          <p className="text-sm text-slate-400">No listings published yet.</p>
          {storefrontHref && (
            <Link href={storefrontHref} className="mt-2 block text-xs text-slate-500 hover:text-white underline">
              Browse storefront
            </Link>
          )}
        </div>
      ) : (
        /* Listings grid — up to 6 */
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
          {featuredListings.slice(0, 6).map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="profile"
              isCheckoutLoading={checkoutLoadingId === listing.id}
              onCheckout={() => void handleCheckout(listing)}
              onQuickView={() => setQuickViewListing(listing)}
            />
          ))}
        </div>
      )}

      {/* Quick view modal / bottom sheet */}
      <ListingQuickView
        listing={quickViewListing}
        isOpen={quickViewListing !== null}
        onClose={() => setQuickViewListing(null)}
        isCheckoutLoading={quickViewListing ? checkoutLoadingId === quickViewListing.id : false}
        onCheckout={quickViewListing ? () => void handleCheckout(quickViewListing) : undefined}
      />
    </section>
  )
}
