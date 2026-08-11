"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { extractApiError } from "@/lib/api/extract-error"

interface MarketplaceListing {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  currency: string
  base_price: number | null
  cover_image_url: string | null
  status: string
  seller_user_id: string
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number }>
}

export default function MarketplaceListingDetailPage() {
  const params = useParams<{ id: string }>()
  const listingId = params?.id
  const [listing, setListing] = useState<MarketplaceListing | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<string>("")

  useEffect(() => {
    if (!listingId) return
    void loadListing(listingId)
  }, [listingId])

  async function loadListing(id: string) {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/marketplace/listings/${id}`, { cache: "no-store" })
      const body = await response.json()
      if (!response.ok) {
        setErrorMessage(extractApiError(body, "Listing not found"))
        setListing(null)
        return
      }
      const data = body.data as MarketplaceListing
      if (data.status !== "published") {
        setErrorMessage("This listing is not available for purchase.")
        setListing(null)
        return
      }
      setListing(data)
      setSelectedVariantId(data.marketplace_listing_variants?.[0]?.id || "")
    } catch {
      setErrorMessage("Unable to load listing.")
    } finally {
      setIsLoading(false)
    }
  }

  async function checkout() {
    if (!listing) return
    setIsCheckoutLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [{ listingId: listing.id, variantId: selectedVariantId || undefined, quantity: 1 }],
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent(`/marketplace/listings/${listing.id}`)}`
          return
        }
        setErrorMessage(extractApiError(body, "Checkout failed"))
        return
      }
      if (body.data?.checkoutUrl) window.location.href = body.data.checkoutUrl
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" className="border-slate-700 text-white">
            <Link href="/marketplace">Back to marketplace</Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-700 text-white">
            <Link href="/marketplace/purchases">My purchases</Link>
          </Button>
        </div>

        {isLoading ? <div className="text-sm text-slate-300">Loading listing...</div> : null}
        {errorMessage ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div>
        ) : null}

        {listing ? (
          <article className="grid gap-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 md:grid-cols-[1.1fr_0.9fr]">
            <div className="aspect-square bg-black/30">
              {listing.cover_image_url ? (

                <img src={listing.cover_image_url} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
              )}
            </div>
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-slate-800 text-slate-200">{listing.category}</Badge>
                <Badge variant="secondary" className="bg-slate-800 text-slate-200">{listing.product_type}</Badge>
              </div>
              <h1 className="text-3xl font-bold">{listing.title}</h1>
              <p className="text-sm text-slate-300">{listing.description || "Creator listing"}</p>
              <div className="text-2xl font-semibold">
                {listing.base_price != null
                  ? `${listing.currency || "USD"} ${Number(listing.base_price).toFixed(2)}`
                  : "Custom pricing"}
              </div>
              {(listing.marketplace_listing_variants || []).length > 1 ? (
                <select
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm"
                  value={selectedVariantId}
                  onChange={event => setSelectedVariantId(event.target.value)}
                >
                  {listing.marketplace_listing_variants?.map(variant => (
                    <option key={variant.id} value={variant.id}>
                      {variant.title} — {listing.currency || "USD"} {Number(variant.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              ) : null}
              <Button className="w-full" size="lg" disabled={isCheckoutLoading} onClick={() => void checkout()}>
                {isCheckoutLoading ? "Starting checkout..." : "Buy now"}
              </Button>
            </div>
          </article>
        ) : null}
      </div>
    </main>
  )
}
