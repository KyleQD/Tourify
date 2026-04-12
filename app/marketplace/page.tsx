"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface MarketplaceDiscoverItem {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  currency: string
  base_price: number | null
  cover_image_url: string | null
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number }>
}

const categories = ["all", "music", "photos-and-prints", "merch", "services", "support"]

function getApiErrorMessage(payload: any, fallback: string) {
  if (typeof payload?.error === "string") return payload.error
  if (typeof payload?.error?.message === "string") return payload.error.message
  return fallback
}

export default function MarketplacePage() {
  const searchParams = useSearchParams()
  const sellerUsername = searchParams.get("seller")?.trim() || ""
  const [items, setItems] = useState<MarketplaceDiscoverItem[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    void loadListings({ q: "", category: "all", sellerUsername })
  }, [sellerUsername])

  async function loadListings({
    q,
    category: nextCategory,
    sellerUsername,
  }: {
    q: string
    category: string
    sellerUsername?: string
  }) {
    setLoading(true)
    setErrorMessage(null)
    try {
      const searchParams = new URLSearchParams()
      searchParams.set("limit", "60")
      if (q.trim()) searchParams.set("q", q.trim())
      if (nextCategory !== "all") searchParams.set("category", nextCategory)
      if (sellerUsername?.trim()) searchParams.set("sellerUsername", sellerUsername.trim())

      const response = await fetch(`/api/marketplace/discover?${searchParams.toString()}`)
      const body = await response.json()
      if (!response.ok) {
        setErrorMessage(getApiErrorMessage(body, "Failed to load listings"))
        setItems([])
        return
      }
      setItems(Array.isArray(body.data) ? body.data : [])
    } finally {
      setLoading(false)
    }
  }

  async function checkout(item: MarketplaceDiscoverItem) {
    setErrorMessage(null)
    const defaultVariant = item.marketplace_listing_variants?.[0]
    const response = await fetch("/api/marketplace/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lines: [{ listingId: item.id, variantId: defaultVariant?.id, quantity: 1 }],
      }),
    })
    const body = await response.json()
    if (!response.ok) {
      if (response.status === 401) {
        const redirectTo = `${window.location.pathname}${window.location.search}`
        window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent(redirectTo)}`
        return
      }
      setErrorMessage(getApiErrorMessage(body, "Checkout failed"))
      return
    }
    if (body.data?.checkoutUrl) window.location.href = body.data.checkoutUrl
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Creator Marketplace</h1>
          {sellerUsername ? (
            <p className="text-xs text-emerald-300">Showing storefront for @{sellerUsername}</p>
          ) : null}
          <p className="text-sm text-slate-300">
            Discover music, stems, beats, prints, photo downloads, merch, and creative services from artists.
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map(option => (
              <Button
                key={option}
                variant={category === option ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCategory(option)
                  void loadListings({ q: query, category: option, sellerUsername })
                }}
              >
                {option}
              </Button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products, services, styles..." />
            <Button onClick={() => void loadListings({ q: query, category, sellerUsername })}>Search</Button>
          </div>
        </section>

        {errorMessage ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{errorMessage}</div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-300">Loading marketplace listings...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-300">No listings found for this filter.</div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {items.map(item => (
              <article key={item.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
                <div className="aspect-square bg-black/30">
                  {item.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>
                  )}
                </div>
                <div className="space-y-2 p-3">
                  <div className="line-clamp-1 font-medium">{item.title}</div>
                  <div className="line-clamp-2 text-xs text-slate-300">{item.description || "Creator listing"}</div>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-200">
                      {item.category}
                    </Badge>
                    <div className="text-sm font-semibold">
                      {item.base_price !== null ? `${item.currency || "USD"} ${Number(item.base_price).toFixed(2)}` : "Custom"}
                    </div>
                  </div>
                  <Button className="w-full" size="sm" onClick={() => void checkout(item)}>
                    Buy now
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
