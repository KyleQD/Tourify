"use client"

import { useEffect, useMemo, useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Store } from "lucide-react"
import { extractApiError } from "@/lib/api/extract-error"

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
}

interface ArtistTrack {
  id: string
  title: string
  genre: string | null
  cover_art_url: string | null
}

function currency(amount: number, code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
  }).format(amount)
}

export default function ArtistStorePage() {
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [payouts, setPayouts] = useState<MarketplacePayoutLedger[]>([])
  const [storefront, setStorefront] = useState<MarketplaceStorefront | null>(null)
  const [tracks, setTracks] = useState<ArtistTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingListing, setIsSavingListing] = useState(false)
  const [isSavingStorefront, setIsSavingStorefront] = useState(false)
  const [integrations, setIntegrations] = useState<{ status?: string } | null>(null)
  const [backfillPreview, setBackfillPreview] = useState<{
    totalLegacyItems: number
    alreadyMigrated: number
    pendingItems: number
  } | null>(null)
  const [musicBackfillPreview, setMusicBackfillPreview] = useState<{
    totalTracks: number
    alreadyListed: number
    pendingTracks: number
  } | null>(null)
  const [isImportingLegacy, setIsImportingLegacy] = useState(false)
  const [isImportingTracks, setIsImportingTracks] = useState(false)
  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    category: "music",
    productType: "digital_asset",
    status: "draft",
    basePrice: "9.99",
    trackId: "",
    rightsConfirmed: false,
  })
  const [storefrontForm, setStorefrontForm] = useState({
    displayName: "Artist Store",
    tagline: "",
    sections: "featured,services,digital",
  })
  const [integrationToken, setIntegrationToken] = useState("")
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

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
      const [listingsRes, sellerOrdersRes, storefrontRes, integrationRes, payoutsRes, tracksRes] = await Promise.all([
        fetch("/api/marketplace/listings?includeDrafts=true", buildNoStoreInit()),
        fetch("/api/marketplace/orders?role=seller", buildNoStoreInit()),
        fetch("/api/marketplace/storefront", buildNoStoreInit()),
        fetch("/api/marketplace/integrations/printful", buildNoStoreInit()),
        fetch("/api/marketplace/payouts", buildNoStoreInit()),
        fetch("/api/artist/music?limit=200", buildNoStoreInit()),
      ])
      const [previewRes, musicPreviewRes] = await Promise.all([
        fetch("/api/marketplace/migrations/backfill-artist-merch", buildNoStoreInit()),
        fetch("/api/marketplace/migrations/backfill-artist-music", buildNoStoreInit()),
      ])

      const listingsJson = await listingsRes.json()
      const sellerOrdersJson = await sellerOrdersRes.json()
      const storefrontJson = await storefrontRes.json()
      const integrationJson = await integrationRes.json()
      const payoutsJson = await payoutsRes.json()
      const tracksJson = await tracksRes.json()
      const previewJson = await previewRes.json()
      const musicPreviewJson = await musicPreviewRes.json()

      setListings(Array.isArray(listingsJson.data) ? listingsJson.data : [])
      setOrders(Array.isArray(sellerOrdersJson.data) ? sellerOrdersJson.data : [])
      setPayouts(Array.isArray(payoutsJson.data) ? payoutsJson.data : [])
      setStorefront(storefrontJson.data || null)
      setIntegrations(integrationJson.data || null)
      setBackfillPreview(previewJson.data || null)
      setMusicBackfillPreview(musicPreviewJson.data || null)
      setTracks(Array.isArray(tracksJson.data) ? tracksJson.data : [])

      if (storefrontJson.data) {
        setStorefrontForm({
          displayName: storefrontJson.data.display_name || storefrontJson.data.displayName || "Artist Store",
          tagline: storefrontJson.data.tagline || "",
          sections: Array.isArray(storefrontJson.data.sections) ? storefrontJson.data.sections.join(",") : "featured",
        })
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

  async function createListing() {
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
        category: "music",
        productType: "digital_asset",
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
            .map(section => section.trim())
            .filter(Boolean),
          themeConfig: { mode: "artist-dark" },
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

  async function connectPrintful() {
    if (!integrationToken) {
      setSyncMessage("Add a Printful token before connecting")
      return
    }
    const response = await fetch("/api/marketplace/integrations/printful", buildNoStoreInit({
      method: "POST",
      body: JSON.stringify({ accessToken: integrationToken }),
    }))
    const body = await response.json()
    if (!response.ok) {
      setSyncMessage(extractApiError(body, "Failed to connect Printful"))
      return
    }
    setIntegrations(body.data || null)
    setSyncMessage(`Printful connected (${body.sync?.status || "ok"})`)
    setIntegrationToken("")
  }

  async function importLegacyMerchandise() {
    setIsImportingLegacy(true)
    try {
      const response = await fetch("/api/marketplace/migrations/backfill-artist-merch", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({
          dryRun: false,
          publishActiveItems: true,
        }),
      }))
      const body = await response.json()
      if (!response.ok) {
        setSyncMessage(extractApiError(body, "Failed to import legacy merchandise"))
        return
      }

      setSyncMessage(`Imported ${body.data?.inserted || 0} legacy merchandise items`)
      await loadData()
    } finally {
      setIsImportingLegacy(false)
    }
  }

  async function importArtistTracks() {
    setIsImportingTracks(true)
    try {
      const response = await fetch("/api/marketplace/migrations/backfill-artist-music", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({
          dryRun: false,
          publishTracks: true,
          defaultPrice: Number(listingForm.basePrice || 1.99),
        }),
      }))
      const body = await response.json()
      if (!response.ok) {
        setSyncMessage(extractApiError(body, "Failed to import artist tracks"))
        return
      }

      setSyncMessage(`Imported ${body.data?.inserted || 0} artist tracks as listings`)
      await loadData()
    } finally {
      setIsImportingTracks(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="sticky top-0 z-10 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="space-y-1">
            <h1 className="flex items-center gap-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-3xl font-bold text-transparent">
              <Store className="h-7 w-7 text-purple-500" />
              Artist Marketplace
            </h1>
            <p className="text-sm text-slate-400">Sell digital work, prints, merch, and services from one storefront</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8">
        <Tabs defaultValue="products" className="w-full">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="storefront">Storefront</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

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
                              {listing.category} • {listing.product_type}
                            </div>
                            {listing.description ? <div className="mt-2 text-sm text-slate-300">{listing.description}</div> : null}
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="mb-2 bg-slate-800 text-slate-200">
                              {listing.status}
                            </Badge>
                            <div className="text-sm font-semibold">
                              {listing.base_price !== null ? currency(Number(listing.base_price), listing.currency || "USD") : "Custom"}
                            </div>
                            <div className="text-xs text-slate-400">{listing.inventory_count ?? "∞"} inventory</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="text-base font-semibold">Create listing</h3>
                {backfillPreview ? (
                  <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
                    Legacy merch detected: {backfillPreview.totalLegacyItems} total • {backfillPreview.pendingItems} pending import
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isImportingLegacy || backfillPreview.pendingItems === 0}
                        onClick={importLegacyMerchandise}
                      >
                        {isImportingLegacy ? "Importing..." : "Import legacy merch"}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {musicBackfillPreview ? (
                  <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-100">
                    Artist tracks: {musicBackfillPreview.totalTracks} total • {musicBackfillPreview.pendingTracks} pending listing
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isImportingTracks || musicBackfillPreview.pendingTracks === 0}
                        onClick={importArtistTracks}
                      >
                        {isImportingTracks ? "Importing..." : "Import tracks to listings"}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <Input
                  value={listingForm.title}
                  onChange={event => setListingForm(current => ({ ...current, title: event.target.value }))}
                  placeholder="Product title"
                />
                <Textarea
                  value={listingForm.description}
                  onChange={event => setListingForm(current => ({ ...current, description: event.target.value }))}
                  placeholder="Describe your offer"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={listingForm.category}
                    onChange={event => setListingForm(current => ({ ...current, category: event.target.value }))}
                    placeholder="Category"
                  />
                  <Input
                    value={listingForm.productType}
                    onChange={event => setListingForm(current => ({ ...current, productType: event.target.value }))}
                    placeholder="Type"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={listingForm.status}
                    onChange={event => setListingForm(current => ({ ...current, status: event.target.value }))}
                    placeholder="Status"
                  />
                  <Input
                    value={listingForm.basePrice}
                    onChange={event => setListingForm(current => ({ ...current, basePrice: event.target.value }))}
                    placeholder="Price"
                  />
                </div>
                <select
                  className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                  value={listingForm.trackId}
                  onChange={event => setListingForm(current => ({ ...current, trackId: event.target.value }))}
                >
                  <option value="">Select track</option>
                  {tracks.map(track => (
                    <option key={track.id} value={track.id}>
                      {track.title}{track.genre ? ` (${track.genre})` : ""}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={listingForm.rightsConfirmed}
                    onChange={event => setListingForm(current => ({ ...current, rightsConfirmed: event.target.checked }))}
                  />
                  I confirm I own all rights to this track
                </label>
                <Button
                  onClick={createListing}
                  disabled={
                    isSavingListing
                    || !listingForm.title.trim()
                    || (listingForm.category === "music" && (!listingForm.trackId || !listingForm.rightsConfirmed))
                  }
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSavingListing ? "Saving..." : "Create listing"}
                </Button>
              </div>
            </div>
          </TabsContent>

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
                        <div className="text-sm font-semibold">{currency(Number(order.total_amount || 0), order.currency || "USD")}</div>
                        <div className="text-xs text-slate-400">
                          {order.status} • {order.payment_status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="storefront">
            <div className="max-w-xl space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-base font-semibold">Customize storefront</h3>
              <Input
                value={storefrontForm.displayName}
                onChange={event => setStorefrontForm(current => ({ ...current, displayName: event.target.value }))}
                placeholder="Store display name"
              />
              <Textarea
                value={storefrontForm.tagline}
                onChange={event => setStorefrontForm(current => ({ ...current, tagline: event.target.value }))}
                rows={3}
                placeholder="Store tagline"
              />
              <Input
                value={storefrontForm.sections}
                onChange={event => setStorefrontForm(current => ({ ...current, sections: event.target.value }))}
                placeholder="featured,services,digital"
              />
              <Button onClick={updateStorefront} disabled={isSavingStorefront || !storefrontForm.displayName.trim()}>
                {isSavingStorefront ? "Saving storefront..." : "Save storefront"}
              </Button>
              {storefront ? (
                <div className="text-xs text-slate-400">
                  Live storefront: <span className="text-slate-200">{storefront.display_name}</span>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="max-w-xl space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="text-base font-semibold">Printful</h3>
              <div className="text-sm text-slate-300">
                Connect Printful to sync photographer prints and merch-on-demand catalog data.
              </div>
              <Input value={integrationToken} onChange={event => setIntegrationToken(event.target.value)} placeholder="Printful token" />
              <Button onClick={connectPrintful}>Connect & Sync</Button>
              <div className="text-xs text-slate-400">Current status: {integrations?.status || "inactive"}</div>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Gross Revenue" value={currency(analytics.grossRevenue, "USD")} />
              <MetricCard label="Total Orders" value={String(analytics.totalOrders)} />
              <MetricCard label="Published Listings" value={String(analytics.publishedListings)} />
              <MetricCard label="Pending Payouts" value={currency(analytics.pendingPayoutAmount, "USD")} />
            </div>
          </TabsContent>
        </Tabs>

        {syncMessage ? (
          <div className="mt-4 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-100">
            {syncMessage}
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