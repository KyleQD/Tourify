"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StorefrontBanner } from "@/components/marketplace/storefront-banner"
import { AnimatedProductCard } from "@/components/marketplace/animated-product-card"
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { normalizeUsername } from "@/lib/auth/tourify-auth-helpers"
import {
  STOREFRONT_SECTION_LABELS,
  isFeaturedListing,
} from "@/lib/marketplace/storefront-curation"
import {
  DEFAULT_STOREFRONT_THEME,
  getLayoutClasses,
  getStorefrontTheme,
  type StorefrontThemeConfig,
} from "@/lib/marketplace/storefront-themes"
import { getGeneralPublicProfilePath } from "@/lib/utils/public-profile-routes"

interface MarketplaceDiscoverItem {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  currency: string
  base_price: number | null
  cover_image_url: string | null
  featured_rank?: number | null
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number }>
}

interface SellerProfile {
  id: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  fullName: string | null
}

const GLOBAL_CATEGORIES = [
  "all",
  "music",
  "photos-and-prints",
  "merch",
  "services",
  "tickets",
  "fine-art",
  "photography",
  "rentals",
  "support",
]

function getApiErrorMessage(payload: any, fallback: string) {
  if (typeof payload?.error === "string") return payload.error
  if (typeof payload?.error?.message === "string") return payload.error.message
  return fallback
}

function getCategoryLabel(category: string) {
  if (category === "all") return "All"
  return STOREFRONT_SECTION_LABELS[category] || category.replace(/-/g, " ")
}

function getManageStoreHref(accountType?: string | null) {
  if (accountType === "artist" || accountType === "service") return "/artist/store"
  if (accountType === "venue") return "/venue/dashboard/store"
  return "/dashboard/store"
}

export default function MarketplacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { currentAccount } = useMultiAccount()
  const sellerUsername = searchParams.get("seller")?.trim() || ""
  const checkoutStatus = searchParams.get("checkout")
  const orderId = searchParams.get("order_id")
  const isSellerMode = Boolean(sellerUsername)

  const [items, setItems] = useState<MarketplaceDiscoverItem[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sellerNotFound, setSellerNotFound] = useState(false)
  const [selectedVariantByListing, setSelectedVariantByListing] = useState<Record<string, string>>({})
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null)
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontThemeConfig>(DEFAULT_STOREFRONT_THEME)
  const [storefrontDisplayName, setStorefrontDisplayName] = useState<string | null>(null)
  const [storefrontTagline, setStorefrontTagline] = useState<string | null>(null)
  const [ratingAverage, setRatingAverage] = useState<number | null>(null)
  const [ratingCount, setRatingCount] = useState<number | null>(null)
  const [sellerUserId, setSellerUserId] = useState<string | null>(null)

  useEffect(() => {
    setCategory("all")
    setQuery("")
    void loadPageData({ q: "", category: "all", sellerUsername })
  }, [sellerUsername])

  const sellerCategories = useMemo(() => {
    const present = new Set(items.map(item => item.category).filter(Boolean))
    const hasFeatured = items.some(isFeaturedListing)
    const next = ["all"]
    if (hasFeatured) next.push("featured")
    for (const option of GLOBAL_CATEGORIES) {
      if (option === "all") continue
      if (present.has(option)) next.push(option)
    }
    return next
  }, [items])

  const visibleItems = useMemo(() => {
    let next = items
    if (isSellerMode && query.trim()) {
      const needle = query.trim().toLowerCase()
      next = next.filter(item =>
        `${item.title || ""} ${item.description || ""}`.toLowerCase().includes(needle)
      )
    }
    if (category === "all") return next
    if (category === "featured") return next.filter(isFeaturedListing)
    return next.filter(item => item.category === category)
  }, [category, isSellerMode, items, query])

  const categoryOptions = isSellerMode ? sellerCategories : GLOBAL_CATEGORIES
  const isOwner = Boolean(user?.id && sellerUserId && user.id === sellerUserId)
  const resolvedUsername = sellerProfile?.username || normalizeUsername(sellerUsername) || sellerUsername
  const profileHref = resolvedUsername
    ? getGeneralPublicProfilePath({ username: resolvedUsername })
    : null
  const manageHref = isOwner ? getManageStoreHref(currentAccount?.account_type) : null

  async function loadPageData({
    q,
    category: nextCategory,
    sellerUsername: nextSellerUsername,
  }: {
    q: string
    category: string
    sellerUsername?: string
  }) {
    setLoading(true)
    setErrorMessage(null)
    setSellerNotFound(false)

    try {
      const discoverParams = new URLSearchParams()
      discoverParams.set("limit", "60")
      const isScopedSeller = Boolean(nextSellerUsername?.trim())
      // Seller storefront filters categories client-side so chips stay complete.
      if (!isScopedSeller && q.trim()) discoverParams.set("q", q.trim())
      if (!isScopedSeller && nextCategory !== "all" && nextCategory !== "featured") {
        discoverParams.set("category", nextCategory)
      }
      if (isScopedSeller) discoverParams.set("sellerUsername", nextSellerUsername!.trim())

      const discoverPromise = fetch(`/api/marketplace/discover?${discoverParams.toString()}`)
      const storefrontPromise = nextSellerUsername?.trim()
        ? fetch(`/api/marketplace/storefront?username=${encodeURIComponent(nextSellerUsername.trim())}`)
        : null

      const [discoverResponse, storefrontResponse] = await Promise.all([
        discoverPromise,
        storefrontPromise,
      ])

      const discoverBody = await discoverResponse.json()
      if (!discoverResponse.ok) {
        const code = discoverBody?.error?.code
        if (code === "seller_not_found" || discoverResponse.status === 404) {
          setSellerNotFound(true)
          setItems([])
          setSellerProfile(null)
          setSellerUserId(null)
          setErrorMessage("This seller could not be found.")
          return
        }
        setErrorMessage(getApiErrorMessage(discoverBody, "Failed to load listings"))
        setItems([])
        return
      }

      const nextItems = Array.isArray(discoverBody.data) ? discoverBody.data : []
      setItems(nextItems)
      if (discoverBody.seller?.id) setSellerUserId(discoverBody.seller.id)
      setSelectedVariantByListing(prev => {
        const next = { ...prev }
        for (const item of nextItems as MarketplaceDiscoverItem[]) {
          if (next[item.id]) continue
          const first = item.marketplace_listing_variants?.[0]
          if (first?.id) next[item.id] = first.id
        }
        return next
      })

      if (!storefrontResponse) {
        setSellerProfile(null)
        setSellerUserId(null)
        setStorefrontTheme(DEFAULT_STOREFRONT_THEME)
        setStorefrontDisplayName(null)
        setStorefrontTagline(null)
        setRatingAverage(null)
        setRatingCount(null)
        return
      }

      const storefrontBody = await storefrontResponse.json()
      if (!storefrontResponse.ok) {
        if (storefrontBody?.error?.code === "seller_not_found" || storefrontResponse.status === 404) {
          setSellerNotFound(true)
          setErrorMessage("This seller could not be found.")
          setSellerProfile(null)
          setSellerUserId(null)
          return
        }
        return
      }

      const storefront = storefrontBody.data || {}
      const seller = storefrontBody.seller as SellerProfile | null
      setSellerProfile(seller)
      setSellerUserId(storefront.seller_user_id || storefront.sellerUserId || seller?.id || discoverBody.seller?.id || null)
      setStorefrontDisplayName(
        storefront.display_name || storefront.displayName || seller?.fullName || seller?.username || nextSellerUsername || null
      )
      setStorefrontTagline(storefront.tagline || null)
      setStorefrontTheme(getStorefrontTheme(storefront.theme_config || storefront.themeConfig || {}))
      setRatingAverage(typeof storefront.rating_average === "number" ? storefront.rating_average : null)
      setRatingCount(typeof storefront.rating_count === "number" ? storefront.rating_count : null)
    } finally {
      setLoading(false)
    }
  }

  async function checkout(item: MarketplaceDiscoverItem) {
    setErrorMessage(null)
    setCheckoutLoadingId(item.id)
    const variants = item.marketplace_listing_variants || []
    const selectedVariantId = selectedVariantByListing[item.id] || variants[0]?.id
    try {
      const response = await fetch("/api/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: [{ listingId: item.id, variantId: selectedVariantId, quantity: 1 }],
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (response.status === 401) {
          const redirectTo = `${window.location.pathname}${window.location.search}`
          window.location.href = `/login?tab=signin&redirectTo=${encodeURIComponent(redirectTo)}`
          return
        }
        if (body?.error?.code === "seller_payouts_not_ready") {
          setErrorMessage("This seller is finishing payout setup and cannot accept purchases yet.")
          return
        }
        setErrorMessage(getApiErrorMessage(body, "Checkout failed"))
        return
      }
      if (body.data?.checkoutUrl) window.location.href = body.data.checkoutUrl
    } finally {
      setCheckoutLoadingId(null)
    }
  }

  function clearSellerFilter() {
    router.push("/marketplace")
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-bold">
              {isSellerMode ? "Creator Storefront" : "Creator Marketplace"}
            </h1>
            <Button asChild variant="outline" size="sm" className="border-slate-700 text-white">
              <Link href="/marketplace/purchases">My purchases</Link>
            </Button>
          </div>
          {!isSellerMode ? (
            <p className="text-sm text-slate-300">
              Discover music, art, photography, tickets, merch, rentals, and creative services from creators and venues.
            </p>
          ) : null}
        </header>

        {isSellerMode && !sellerNotFound ? (
          <StorefrontBanner
            displayName={storefrontDisplayName || `@${resolvedUsername}`}
            tagline={storefrontTagline}
            theme={storefrontTheme}
            avatarUrl={sellerProfile?.avatarUrl}
            bio={sellerProfile?.bio}
            username={resolvedUsername}
            profileHref={profileHref}
            ratingAverage={ratingAverage}
            ratingCount={ratingCount}
            manageHref={manageHref}
            onClearSeller={clearSellerFilter}
          />
        ) : null}

        {checkoutStatus === "success" ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Payment successful{orderId ? ` for order ${orderId}` : ""}.{" "}
            <Link href="/marketplace/purchases" className="underline">
              View your purchases
            </Link>
          </div>
        ) : null}
        {checkoutStatus === "cancelled" ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Checkout was cancelled. Your card was not charged.
          </div>
        ) : null}

        {!sellerNotFound ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {categoryOptions.map(option => (
                <Button
                  key={option}
                  variant={category === option ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCategory(option)
                    if (isSellerMode) return
                    void loadPageData({ q: query, category: option, sellerUsername })
                  }}
                >
                  {getCategoryLabel(option)}
                </Button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={isSellerMode ? "Search this storefront..." : "Search products, services, styles..."}
                onKeyDown={event => {
                  if (event.key !== "Enter" || isSellerMode) return
                  void loadPageData({ q: query, category, sellerUsername })
                }}
              />
              {!isSellerMode ? (
                <Button onClick={() => void loadPageData({ q: query, category, sellerUsername })}>
                  Search
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{errorMessage}</span>
              {sellerNotFound ? (
                <Button asChild size="sm" variant="outline" className="border-rose-400/40 text-rose-100">
                  <Link href="/marketplace">Browse marketplace</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-slate-300">Loading marketplace listings...</div>
        ) : sellerNotFound ? null : visibleItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center">
            <p className="text-sm text-slate-300">
              {isSellerMode
                ? `@${resolvedUsername} has no published listings yet.`
                : "No listings found for this filter."}
            </p>
            {isSellerMode && profileHref ? (
              <Button asChild variant="outline" size="sm" className="mt-4 border-slate-700 text-white">
                <Link href={profileHref}>View profile</Link>
              </Button>
            ) : null}
          </div>
        ) : isSellerMode ? (
          <section className={getLayoutClasses(storefrontTheme.layout)}>
            {visibleItems.map((item, index) => {
              const variants = item.marketplace_listing_variants || []
              return (
                <div key={item.id} className="space-y-2">
                  <AnimatedProductCard
                    id={item.id}
                    title={item.title}
                    description={item.description}
                    imageUrl={item.cover_image_url}
                    productType={item.product_type}
                    category={item.category}
                    price={item.base_price}
                    currency={item.currency || "USD"}
                    index={index}
                    theme={storefrontTheme}
                    layout={storefrontTheme.layout}
                    isCheckoutLoading={checkoutLoadingId === item.id}
                    onCheckout={() => void checkout(item)}
                  />
                  {variants.length > 1 ? (
                    <select
                      className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs"
                      value={selectedVariantByListing[item.id] || variants[0]?.id || ""}
                      onChange={event =>
                        setSelectedVariantByListing(prev => ({ ...prev, [item.id]: event.target.value }))
                      }
                    >
                      {variants.map(variant => (
                        <option key={variant.id} value={variant.id}>
                          {variant.title} — {item.currency || "USD"} {Number(variant.price).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              )
            })}
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleItems.map(item => {
              const variants = item.marketplace_listing_variants || []
              return (
                <article key={item.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
                  <div className="aspect-square bg-black/30">
                    {item.cover_image_url ? (

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
                        {getCategoryLabel(item.category)}
                      </Badge>
                      <div className="text-sm font-semibold">
                        {item.base_price !== null ? `${item.currency || "USD"} ${Number(item.base_price).toFixed(2)}` : "Custom"}
                      </div>
                    </div>
                    {variants.length > 1 ? (
                      <select
                        className="h-9 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs"
                        value={selectedVariantByListing[item.id] || variants[0]?.id || ""}
                        onChange={event =>
                          setSelectedVariantByListing(prev => ({ ...prev, [item.id]: event.target.value }))
                        }
                      >
                        {variants.map(variant => (
                          <option key={variant.id} value={variant.id}>
                            {variant.title} — {item.currency || "USD"} {Number(variant.price).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <Button className="w-full" size="sm" onClick={() => void checkout(item)}>
                      Buy now
                    </Button>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
