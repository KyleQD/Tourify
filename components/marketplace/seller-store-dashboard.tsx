"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Store, ExternalLink, Trash2 } from "lucide-react"
import { extractApiError } from "@/lib/api/extract-error"
import { MARKETPLACE_CATEGORIES, MARKETPLACE_PRODUCT_TYPE } from "@/lib/marketplace/catalog"
import { StripeConnectSetup } from "@/components/marketplace/stripe-connect-setup"
import { StorefrontThemeEditor } from "@/components/marketplace/storefront-theme-editor"
import { DEFAULT_STOREFRONT_THEME, getStorefrontTheme, type StorefrontThemeConfig } from "@/lib/marketplace/storefront-themes"

interface MarketplaceListing {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  status: string
  currency: string
  base_price: number | null
  inventory_count: number | null
  music_track_id?: string | null
  created_at: string
}

interface MarketplaceOrder {
  id: string
  status: string
  payment_status: string
  total_amount: number
  currency: string
  created_at: string
}

interface MarketplacePayoutLedger {
  id: string
  net_amount: number
  payout_status: string
}

interface MarketplaceStorefront {
  display_name: string
  tagline: string | null
  sections: unknown[]
  external_links?: Array<{ label: string; url: string }>
  seller_type?: string | null
  accepted_seller_agreement_at?: string | null
}

interface ArtistTrack {
  id: string
  title: string
  genre: string | null
  cover_art_url: string | null
}

interface ExternalLinkEntry {
  label: string
  url: string
}

interface SellerStoreDashboardProps {
  storeTitle?: string
  storeDescription?: string
  showMusicFeatures?: boolean
}

function formatCurrency(amount: number, code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
  }).format(amount)
}

const categoryOptions = MARKETPLACE_CATEGORIES.map(c => ({ value: c.id, label: c.label }))
const productTypeEntries = Object.entries(MARKETPLACE_PRODUCT_TYPE).map(([, value]) => ({
  value,
  label: value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
}))

export function SellerStoreDashboard({
  storeTitle = "Marketplace",
  storeDescription = "Sell products, services, tickets, and more from your storefront",
  showMusicFeatures = false,
}: SellerStoreDashboardProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [payouts, setPayouts] = useState<MarketplacePayoutLedger[]>([])
  const [storefront, setStorefront] = useState<MarketplaceStorefront | null>(null)
  const [tracks, setTracks] = useState<ArtistTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingListing, setIsSavingListing] = useState(false)
  const [isSavingStorefront, setIsSavingStorefront] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    category: "merch",
    productType: "physical_merch" as string,
    status: "draft",
    basePrice: "9.99",
    trackId: "",
    rightsConfirmed: false,
  })

  const [storefrontForm, setStorefrontForm] = useState({
    displayName: "My Store",
    tagline: "",
    sections: "featured,services,digital",
  })

  const [externalLinks, setExternalLinks] = useState<ExternalLinkEntry[]>([])
  const [newLink, setNewLink] = useState({ label: "", url: "" })
  const [isAcceptingAgreement, setIsAcceptingAgreement] = useState(false)
  const [themeConfig, setThemeConfig] = useState<StorefrontThemeConfig>(DEFAULT_STOREFRONT_THEME)

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(input?.headers || {}),
      },
    }
  }

  async function loadData() {
    setIsLoading(true)
    try {
      const fetches: Promise<Response>[] = [
        fetch("/api/marketplace/listings?includeDrafts=true", buildNoStoreInit()),
        fetch("/api/marketplace/orders?role=seller", buildNoStoreInit()),
        fetch("/api/marketplace/storefront", buildNoStoreInit()),
        fetch("/api/marketplace/payouts", buildNoStoreInit()),
      ]
      if (showMusicFeatures) {
        fetches.push(fetch("/api/artist/music?limit=200", buildNoStoreInit()))
      }

      const responses = await Promise.all(fetches)
      const jsons = await Promise.all(responses.map(r => r.json()))

      const [listingsJson, sellerOrdersJson, storefrontJson, payoutsJson] = jsons
      const tracksJson = showMusicFeatures ? jsons[4] : { data: [] }

      setListings(Array.isArray(listingsJson.data) ? listingsJson.data : [])
      setOrders(Array.isArray(sellerOrdersJson.data) ? sellerOrdersJson.data : [])
      setPayouts(Array.isArray(payoutsJson.data) ? payoutsJson.data : [])
      setStorefront(storefrontJson.data || null)
      setTracks(Array.isArray(tracksJson.data) ? tracksJson.data : [])

      if (storefrontJson.data) {
        setStorefrontForm({
          displayName: storefrontJson.data.display_name || storefrontJson.data.displayName || "My Store",
          tagline: storefrontJson.data.tagline || "",
          sections: Array.isArray(storefrontJson.data.sections) ? storefrontJson.data.sections.join(",") : "featured",
        })
        setExternalLinks(Array.isArray(storefrontJson.data.external_links) ? storefrontJson.data.external_links : [])
        const rawTheme = storefrontJson.data.theme_config || storefrontJson.data.themeConfig || {}
        setThemeConfig(getStorefrontTheme(rawTheme))
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const analytics = useMemo(() => {
    const paidOrders = orders.filter(order => order.payment_status === "paid")
    const grossRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0)
    const pendingPayoutAmount = payouts
      .filter(row => row.payout_status === "pending" || row.payout_status === "scheduled")
      .reduce((sum, row) => sum + Number(row.net_amount || 0), 0)
    return {
      grossRevenue,
      totalOrders: orders.length,
      publishedListings: listings.filter(listing => listing.status === "published").length,
      pendingPayoutAmount,
    }
  }, [listings, orders, payouts])

  const hasAcceptedAgreement = Boolean(storefront?.accepted_seller_agreement_at)

  async function createListing() {
    if (!hasAcceptedAgreement && listingForm.status === "published") {
      setSyncMessage("You must accept the Marketplace Seller Agreement before publishing listings.")
      return
    }
    setIsSavingListing(true)
    try {
      const response = await fetch("/api/marketplace/listings", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({
          title: listingForm.title,
          description: listingForm.description,
          category: listingForm.category,
          productType: listingForm.productType,
          status: listingForm.status,
          basePrice: Number(listingForm.basePrice || 0),
          trackId: listingForm.trackId || undefined,
          rightsConfirmed: listingForm.rightsConfirmed,
          variants: [{ title: "Default", price: Number(listingForm.basePrice || 0), isDefault: true }],
        }),
      }))

      if (!response.ok) {
        const errorBody = await response.json()
        setSyncMessage(extractApiError(errorBody, "Failed to create listing"))
        return
      }

      setListingForm({
        title: "",
        description: "",
        category: "merch",
        productType: "physical_merch",
        status: "draft",
        basePrice: "9.99",
        trackId: "",
        rightsConfirmed: false,
      })
      await loadData()
    } finally {
      setIsSavingListing(false)
    }
  }

  async function updateStorefront() {
    setIsSavingStorefront(true)
    try {
      const response = await fetch("/api/marketplace/storefront", buildNoStoreInit({
        method: "PUT",
        body: JSON.stringify({
          displayName: storefrontForm.displayName,
          tagline: storefrontForm.tagline,
          slug: storefrontForm.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          sections: storefrontForm.sections
            .split(",")
            .map(s => s.trim())
            .filter(Boolean),
          externalLinks,
          themeConfig: themeConfig,
          isActive: true,
        }),
      }))
      if (!response.ok) {
        const errorBody = await response.json()
        setSyncMessage(extractApiError(errorBody, "Failed to save storefront"))
        return
      }
      await loadData()
    } finally {
      setIsSavingStorefront(false)
    }
  }

  function addExternalLink() {
    if (!newLink.label.trim() || !newLink.url.trim()) return
    setExternalLinks(prev => [...prev, { label: newLink.label.trim(), url: newLink.url.trim() }])
    setNewLink({ label: "", url: "" })
  }

  function removeExternalLink(index: number) {
    setExternalLinks(prev => prev.filter((_, i) => i !== index))
  }

  async function acceptSellerAgreement() {
    setIsAcceptingAgreement(true)
    try {
      const response = await fetch("/api/marketplace/seller-agreement", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({ version: "1.0" }),
      }))
      if (!response.ok) {
        const body = await response.json()
        setSyncMessage(body.error || "Failed to accept seller agreement")
        return
      }
      await loadData()
      setSyncMessage("Seller agreement accepted successfully.")
    } finally {
      setIsAcceptingAgreement(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="sticky top-0 z-10 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="space-y-1">
            <h1 className="flex items-center gap-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-3xl font-bold text-transparent">
              <Store className="h-7 w-7 text-purple-500" />
              {storeTitle}
            </h1>
            <p className="text-sm text-slate-400">{storeDescription}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 space-y-6">
        <StripeConnectSetup />

        {!hasAcceptedAgreement && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">
              Before publishing listings or connecting Stripe for payouts, you must accept the{" "}
              <Link href="/marketplace/seller-agreement" target="_blank" className="font-medium text-amber-100 underline">
                Marketplace Seller Agreement
              </Link>.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                size="sm"
                onClick={acceptSellerAgreement}
                disabled={isAcceptingAgreement}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isAcceptingAgreement ? "Accepting..." : "I have read and accept the Seller Agreement"}
              </Button>
              <Link
                href="/marketplace/seller-agreement"
                target="_blank"
                className="text-xs text-amber-300 underline"
              >
                Read agreement
              </Link>
            </div>
          </div>
        )}

        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="storefront">Storefront</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Current listings</h2>
                {isLoading ? (
                  <div className="text-sm text-slate-400">Loading listings...</div>
                ) : listings.length === 0 ? (
                  <div className="text-sm text-slate-400">No listings yet. Create one from the panel.</div>
                ) : (
                  <div className="grid gap-3">
                    {listings.map(listing => (
                      <div key={listing.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-medium">{listing.title}</div>
                            <div className="mt-1 text-xs text-slate-400">
                              {listing.category} &bull; {listing.product_type}
                            </div>
                            {listing.description ? <div className="mt-2 text-sm text-slate-300">{listing.description}</div> : null}
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="mb-2 bg-slate-800 text-slate-200">
                              {listing.status}
                            </Badge>
                            <div className="text-sm font-semibold">
                              {listing.base_price !== null ? formatCurrency(Number(listing.base_price), listing.currency || "USD") : "Custom"}
                            </div>
                            <div className="text-xs text-slate-400">{listing.inventory_count ?? "\u221E"} inventory</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="text-base font-semibold">Create listing</h3>
                <Input
                  value={listingForm.title}
                  onChange={e => setListingForm(c => ({ ...c, title: e.target.value }))}
                  placeholder="Product title"
                />
                <Textarea
                  value={listingForm.description}
                  onChange={e => setListingForm(c => ({ ...c, description: e.target.value }))}
                  placeholder="Describe your offer"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                    value={listingForm.category}
                    onChange={e => setListingForm(c => ({ ...c, category: e.target.value }))}
                  >
                    {categoryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                    value={listingForm.productType}
                    onChange={e => setListingForm(c => ({ ...c, productType: e.target.value }))}
                  >
                    {productTypeEntries.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                    value={listingForm.status}
                    onChange={e => setListingForm(c => ({ ...c, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <Input
                    value={listingForm.basePrice}
                    onChange={e => setListingForm(c => ({ ...c, basePrice: e.target.value }))}
                    placeholder="Price"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                </div>

                {showMusicFeatures && (
                  <>
                    <select
                      className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                      value={listingForm.trackId}
                      onChange={e => setListingForm(c => ({ ...c, trackId: e.target.value }))}
                    >
                      <option value="">Select track (optional)</option>
                      {tracks.map(track => (
                        <option key={track.id} value={track.id}>
                          {track.title}{track.genre ? ` (${track.genre})` : ""}
                        </option>
                      ))}
                    </select>
                    {listingForm.trackId && (
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={listingForm.rightsConfirmed}
                          onChange={e => setListingForm(c => ({ ...c, rightsConfirmed: e.target.checked }))}
                        />
                        I confirm I own all rights to this track
                      </label>
                    )}
                  </>
                )}

                <Button
                  onClick={createListing}
                  disabled={
                    isSavingListing
                    || !listingForm.title.trim()
                    || !!(showMusicFeatures && listingForm.category === "music" && listingForm.trackId && !listingForm.rightsConfirmed)
                  }
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSavingListing ? "Saving..." : "Create listing"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            {isLoading ? (
              <div className="text-sm text-slate-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-sm text-slate-400">No orders yet.</div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                        <div className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatCurrency(Number(order.total_amount || 0), order.currency || "USD")}</div>
                        <div className="text-xs text-slate-400">
                          {order.status} &bull; {order.payment_status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Storefront Tab */}
          <TabsContent value="storefront">
            <div className="space-y-6">
              <div className="max-w-xl space-y-4">
                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="text-base font-semibold">Store details</h3>
                  <Input
                    value={storefrontForm.displayName}
                    onChange={e => setStorefrontForm(c => ({ ...c, displayName: e.target.value }))}
                    placeholder="Store display name"
                  />
                  <Textarea
                    value={storefrontForm.tagline}
                    onChange={e => setStorefrontForm(c => ({ ...c, tagline: e.target.value }))}
                    rows={2}
                    placeholder="Store tagline"
                  />
                </div>

                <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                  <h3 className="text-base font-semibold">External links</h3>
                  <p className="text-xs text-slate-400">
                    Link to your own website, portfolio, or other platforms.
                  </p>
                  {externalLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-200">{link.label}</span>
                        <span className="mx-2 text-slate-500">&mdash;</span>
                        <span className="text-slate-400">{link.url}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeExternalLink(idx)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <Input
                      value={newLink.label}
                      onChange={e => setNewLink(c => ({ ...c, label: e.target.value }))}
                      placeholder="Label (e.g. My Website)"
                    />
                    <Input
                      value={newLink.url}
                      onChange={e => setNewLink(c => ({ ...c, url: e.target.value }))}
                      placeholder="https://..."
                    />
                    <Button variant="outline" size="sm" onClick={addExternalLink} disabled={!newLink.label.trim() || !newLink.url.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <StorefrontThemeEditor
                theme={themeConfig}
                displayName={storefrontForm.displayName}
                tagline={storefrontForm.tagline}
                onChange={setThemeConfig}
              />

              <Button onClick={updateStorefront} disabled={isSavingStorefront || !storefrontForm.displayName.trim()} size="lg">
                {isSavingStorefront ? "Saving storefront..." : "Save storefront"}
              </Button>
              {storefront ? (
                <div className="text-xs text-slate-400">
                  Live storefront: <span className="text-slate-200">{storefront.display_name}</span>
                </div>
              ) : null}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <div className="max-w-xl space-y-4">
              <StripeConnectSetup />
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                <h3 className="mb-2 font-semibold text-white">How payments work</h3>
                <ul className="list-disc space-y-1 pl-4 text-slate-400">
                  <li>Set your price &mdash; buyers pay your listed price plus a 10% Tourify service fee.</li>
                  <li>You receive 100% of your listed price via Stripe Connect.</li>
                  <li>Tourify collects the 10% service fee from the buyer.</li>
                  <li>Payouts are managed through your Stripe Express dashboard.</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Gross Revenue" value={formatCurrency(analytics.grossRevenue, "USD")} />
              <MetricCard label="Total Orders" value={String(analytics.totalOrders)} />
              <MetricCard label="Published Listings" value={String(analytics.publishedListings)} />
              <MetricCard label="Pending Payouts" value={formatCurrency(analytics.pendingPayoutAmount, "USD")} />
            </div>
          </TabsContent>
        </Tabs>

        {syncMessage ? (
          <div className="mt-4 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-100">
            {syncMessage}
            <button className="ml-3 text-xs underline opacity-70" onClick={() => setSyncMessage(null)}>dismiss</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  )
}
