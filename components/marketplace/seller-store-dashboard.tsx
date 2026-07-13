"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Circle,
  CreditCard,
  Edit,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Music2,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Ticket,
  Trash2,
  Upload,
  Users,
} from "lucide-react"
import { extractApiError } from "@/lib/api/extract-error"
import { MARKETPLACE_PRODUCT_TYPE } from "@/lib/marketplace/catalog"
import { StripeConnectSetup } from "@/components/marketplace/stripe-connect-setup"
import { StorefrontThemeEditor } from "@/components/marketplace/storefront-theme-editor"
import { AnimatedProductCard } from "@/components/marketplace/animated-product-card"
import {
  DEFAULT_STOREFRONT_THEME,
  getStorefrontTheme,
  type StorefrontThemeConfig,
} from "@/lib/marketplace/storefront-themes"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import { supabase } from "@/lib/supabase/client"
import {
  DEFAULT_STOREFRONT_SECTIONS,
  STOREFRONT_SECTION_LABELS,
  normalizeStorefrontSections,
} from "@/lib/marketplace/storefront-curation"
import type { SellerAnalyticsSummary } from "@/lib/marketplace/seller-analytics"

interface MarketplaceListing {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  status: string
  currency: string
  base_price: number | null
  compare_at_price?: number | null
  inventory_count: number | null
  has_unlimited_inventory?: boolean | null
  cover_image_url?: string | null
  featured_rank?: number | null
  music_track_id?: string | null
  license_type?: "personal_use" | "commercial_use" | "exclusive" | null
  rights_confirmed?: boolean | null
  source_provider?: string | null
  sync_status?: string | null
  fulfillment_provider?: string | null
  created_at: string
  metadata?: Record<string, unknown> | null
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number; inventory_count?: number | null }>
}

interface MarketplaceOrder {
  id: string
  status: string
  payment_status: string
  total_amount: number
  currency: string
  created_at: string
  shipping_address?: Record<string, unknown> | null
  marketplace_order_items?: Array<{
    id: string
    listing_id?: string | null
    title: string
    quantity: number
    unit_price?: number
    line_total?: number
    product_type?: string
    fulfillment_status?: string | null
    fulfillment_provider?: string | null
  }>
}

interface MarketplacePayoutLedger {
  id: string
  net_amount: number
  payout_status: string
  available_at?: string | null
  paid_at?: string | null
  payout_provider?: string | null
}

interface MarketplaceIntegration {
  id: string
  provider: "printful" | "shopify" | string
  status: string
  external_account_id?: string | null
  external_shop_domain?: string | null
  hasToken?: boolean
  last_synced_at?: string | null
  last_sync_status?: string | null
  last_sync_error?: string | null
  last_error?: string | null
}

interface MarketplaceIntegrationProduct {
  id: string
  provider: string
  external_product_id: string
  title: string
  status: string
  sync_status: string
  image_url?: string | null
  variants_count?: number | null
  imported_listing_id?: string | null
  updated_at?: string
}

interface MarketplaceSyncRun {
  id: string
  provider: string
  status: string
  imported_count: number
  updated_count: number
  skipped_count: number
  error_message?: string | null
  started_at: string
}

interface MarketplaceFulfillmentRequest {
  id: string
  provider: string
  status: string
  external_order_id?: string | null
  error_message?: string | null
  created_at: string
}

interface MarketplaceStorefront {
  display_name: string
  tagline: string | null
  sections: unknown[]
  external_links?: Array<{ label: string; url: string }>
  theme_config?: StorefrontThemeConfig
  themeConfig?: StorefrontThemeConfig
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

interface StripeConnectStatus {
  connected: boolean
  accountId: string | null
  connectKind?: "v1_express" | "v2" | null
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}

interface SellerStoreDashboardProps {
  storeTitle?: string
  storeDescription?: string
  showMusicFeatures?: boolean
}

type OfferType = "music" | "merch" | "service" | "ticket" | "tip"

const OFFER_CONFIG: Record<
  OfferType,
  {
    label: string
    description: string
    category: string
    productType: string
    icon: typeof Music2
    defaultPrice: string
  }
> = {
  music: {
    label: "Music",
    description: "Sell a track download or license from your music library.",
    category: "music",
    productType: MARKETPLACE_PRODUCT_TYPE.digitalAsset,
    icon: Music2,
    defaultPrice: "1.99",
  },
  merch: {
    label: "Merch",
    description: "Sell physical merch, bundles, or print-on-demand items.",
    category: "merch",
    productType: MARKETPLACE_PRODUCT_TYPE.physicalMerch,
    icon: ShoppingBag,
    defaultPrice: "24.99",
  },
  service: {
    label: "Service",
    description: "Offer sessions, production work, lessons, or booking packages.",
    category: "services",
    productType: MARKETPLACE_PRODUCT_TYPE.service,
    icon: Users,
    defaultPrice: "99.00",
  },
  ticket: {
    label: "Ticket",
    description: "Sell a ticket or access pass through your storefront.",
    category: "tickets",
    productType: MARKETPLACE_PRODUCT_TYPE.ticket,
    icon: Ticket,
    defaultPrice: "25.00",
  },
  tip: {
    label: "Tip",
    description: "Let fans send direct support from your public profile.",
    category: "support",
    productType: MARKETPLACE_PRODUCT_TYPE.tip,
    icon: Heart,
    defaultPrice: "5.00",
  },
}

const EMPTY_CONNECT_STATUS: StripeConnectStatus = {
  connected: false,
  accountId: null,
  connectKind: null,
  chargesEnabled: false,
  payoutsEnabled: false,
  detailsSubmitted: false,
}

function formatCurrency(amount: number, code: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
  }).format(amount)
}

function formatDateTime(value?: string | null) {
  if (!value) return "Never"
  return new Date(value).toLocaleString()
}

function providerLabel(provider?: string | null) {
  if (provider === "printful") return "Printful"
  if (provider === "shopify") return "Shopify"
  return provider || "Tourify"
}

function inferOfferType(listing: MarketplaceListing): OfferType {
  if (listing.category === "music") return "music"
  if (listing.category === "tickets") return "ticket"
  if (listing.category === "services") return "service"
  if (listing.category === "support") return "tip"
  return "merch"
}

function getListingActionLabel(listing: Pick<MarketplaceListing, "category" | "product_type">) {
  if (listing.category === "music" || listing.product_type === MARKETPLACE_PRODUCT_TYPE.digitalAsset) return "Download"
  if (listing.category === "services" || listing.product_type === MARKETPLACE_PRODUCT_TYPE.service) return "Book"
  if (listing.category === "tickets" || listing.product_type === MARKETPLACE_PRODUCT_TYPE.ticket) return "Get Tickets"
  if (listing.category === "support" || listing.product_type === MARKETPLACE_PRODUCT_TYPE.tip) return "Tip"
  return "Buy"
}

export function SellerStoreDashboard({
  storeTitle = "Marketplace",
  storeDescription = "Sell products, services, tickets, and more from your storefront",
  showMusicFeatures = false,
}: SellerStoreDashboardProps) {
  const { currentAccount } = useMultiAccount()
  const [listings, setListings] = useState<MarketplaceListing[]>([])
  const [orders, setOrders] = useState<MarketplaceOrder[]>([])
  const [payouts, setPayouts] = useState<MarketplacePayoutLedger[]>([])
  const [storefront, setStorefront] = useState<MarketplaceStorefront | null>(null)
  const [tracks, setTracks] = useState<ArtistTrack[]>([])
  const [integrations, setIntegrations] = useState<MarketplaceIntegration[]>([])
  const [integrationProducts, setIntegrationProducts] = useState<MarketplaceIntegrationProduct[]>([])
  const [syncRuns, setSyncRuns] = useState<MarketplaceSyncRun[]>([])
  const [fulfillmentRequests, setFulfillmentRequests] = useState<MarketplaceFulfillmentRequest[]>([])
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus>(EMPTY_CONNECT_STATUS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingListing, setIsSavingListing] = useState(false)
  const [isDeletingListingId, setIsDeletingListingId] = useState<string | null>(null)
  const [isSavingStorefront, setIsSavingStorefront] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedOfferType, setSelectedOfferType] = useState<OfferType>("merch")
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null)
  const [isImportingLegacy, setIsImportingLegacy] = useState(false)
  const [isSavingIntegration, setIsSavingIntegration] = useState<string | null>(null)
  const [printfulForm, setPrintfulForm] = useState({ accessToken: "", externalAccountId: "" })
  const [shopifyForm, setShopifyForm] = useState({ shopDomain: "" })
  const [backfillPreview, setBackfillPreview] = useState<{
    totalLegacyItems: number
    alreadyMigrated: number
    pendingItems: number
  } | null>(null)

  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    status: "draft",
    basePrice: OFFER_CONFIG.merch.defaultPrice,
    currency: "USD",
    coverImageUrl: "",
    inventoryCount: "25",
    hasUnlimitedInventory: false,
    featured: false,
    trackId: "",
    rightsConfirmed: false,
    licenseType: "personal_use" as "personal_use" | "commercial_use" | "exclusive",
  })

  const [storefrontForm, setStorefrontForm] = useState({
    displayName: "My Store",
    tagline: "",
  })
  const [storefrontSections, setStorefrontSections] = useState<string[]>([...DEFAULT_STOREFRONT_SECTIONS])
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [announceOnPublish, setAnnounceOnPublish] = useState(false)
  const [marketplaceAnalytics, setMarketplaceAnalytics] = useState<SellerAnalyticsSummary | null>(null)

  const [externalLinks, setExternalLinks] = useState<ExternalLinkEntry[]>([])
  const [newLink, setNewLink] = useState({ label: "", url: "" })
  const [isAcceptingAgreement, setIsAcceptingAgreement] = useState(false)
  const [themeConfig, setThemeConfig] = useState<StorefrontThemeConfig>(DEFAULT_STOREFRONT_THEME)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [publicPreviewListings, setPublicPreviewListings] = useState<MarketplaceListing[]>([])
  const [lastPublishedPath, setLastPublishedPath] = useState<string | null>(null)
  const didAutoImportLegacy = useRef(false)

  const artistPublicPath = useMemo(() => {
    const profileData = currentAccount?.profile_data as Record<string, unknown> | undefined
    const artistName =
      (typeof profileData?.artist_name === "string" && profileData.artist_name) ||
      (typeof profileData?.stage_name === "string" && profileData.stage_name) ||
      (typeof profileData?.display_name === "string" && profileData.display_name) ||
      null
    return getArtistPublicProfilePath(artistName)
  }, [currentAccount?.profile_data])

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

  function resetListingForm(nextOfferType: OfferType = selectedOfferType) {
    const config = OFFER_CONFIG[nextOfferType]
    setSelectedOfferType(nextOfferType)
    setEditingListing(null)
    setListingForm({
      title: "",
      description: "",
      status: "draft",
      basePrice: config.defaultPrice,
      currency: "USD",
      coverImageUrl: "",
      inventoryCount: nextOfferType === "music" || nextOfferType === "tip" ? "" : "25",
      hasUnlimitedInventory: nextOfferType === "music" || nextOfferType === "tip" || nextOfferType === "service",
      featured: false,
      trackId: "",
      rightsConfirmed: false,
      licenseType: "personal_use",
    })
  }

  async function loadConnectStatus() {
    try {
      const res = await fetch("/api/stripe/connect", { credentials: "include", cache: "no-store" })
      if (res.ok) setConnectStatus(await res.json())
    } catch {
      setConnectStatus(EMPTY_CONNECT_STATUS)
    }
  }

  async function loadBackfillPreview() {
    try {
      const response = await fetch("/api/marketplace/migrations/backfill-artist-merch", buildNoStoreInit())
      const body = await response.json()
      if (response.ok) setBackfillPreview(body.data || null)
      return body.data as { pendingItems?: number } | null
    } catch {
      return null
    }
  }

  async function loadPublicStorefrontPreview(sellerUserId?: string | null) {
    if (!sellerUserId) {
      setPublicPreviewListings([])
      return
    }
    try {
      const response = await fetch(
        `/api/marketplace/discover?sellerUserId=${encodeURIComponent(sellerUserId)}&limit=6`,
        buildNoStoreInit()
      )
      const body = await response.json()
      if (response.ok) setPublicPreviewListings(Array.isArray(body.data) ? body.data : [])
    } catch {
      setPublicPreviewListings([])
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
        fetch("/api/marketplace/integrations", buildNoStoreInit()),
      ]
      if (showMusicFeatures) fetches.push(fetch("/api/artist/music?limit=200", buildNoStoreInit()))

      const responses = await Promise.all(fetches)
      const jsons = await Promise.all(responses.map(r => r.json().catch(() => ({ data: [] }))))

      const [listingsJson, sellerOrdersJson, storefrontJson, payoutsJson, integrationsJson] = jsons
      const tracksJson = showMusicFeatures ? jsons[5] : { data: [] }

      setListings(Array.isArray(listingsJson.data) ? listingsJson.data : [])
      setOrders(Array.isArray(sellerOrdersJson.data) ? sellerOrdersJson.data : [])
      setPayouts(Array.isArray(payoutsJson.data) ? payoutsJson.data : [])
      setStorefront(storefrontJson.data || null)
      setTracks(Array.isArray(tracksJson.data) ? tracksJson.data : [])
      setIntegrations(Array.isArray(integrationsJson.data?.integrations) ? integrationsJson.data.integrations : [])
      setIntegrationProducts(Array.isArray(integrationsJson.data?.products) ? integrationsJson.data.products : [])
      setSyncRuns(Array.isArray(integrationsJson.data?.syncRuns) ? integrationsJson.data.syncRuns : [])
      setFulfillmentRequests(Array.isArray(integrationsJson.data?.fulfillmentRequests) ? integrationsJson.data.fulfillmentRequests : [])

      if (storefrontJson.data) {
        setStorefrontForm({
          displayName: storefrontJson.data.display_name || storefrontJson.data.displayName || "My Store",
          tagline: storefrontJson.data.tagline || "",
        })
        setExternalLinks(Array.isArray(storefrontJson.data.external_links) ? storefrontJson.data.external_links : [])
        const rawTheme = storefrontJson.data.theme_config || storefrontJson.data.themeConfig || {}
        setThemeConfig(getStorefrontTheme(rawTheme))
        setStorefrontSections(normalizeStorefrontSections(storefrontJson.data.sections))
      }

      const sellerUserId =
        storefrontJson.data?.seller_user_id ||
        (Array.isArray(listingsJson.data) && listingsJson.data[0]?.seller_user_id) ||
        null
      await loadPublicStorefrontPreview(sellerUserId)

      try {
        const analyticsResponse = await fetch("/api/marketplace/analytics?range=30d", buildNoStoreInit())
        const analyticsBody = await analyticsResponse.json().catch(() => ({}))
        if (analyticsResponse.ok) setMarketplaceAnalytics(analyticsBody.data || null)
      } catch {
        setMarketplaceAnalytics(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    void loadConnectStatus()
    void (async () => {
      const preview = await loadBackfillPreview()
      if (!didAutoImportLegacy.current && preview && Number(preview.pendingItems || 0) > 0) {
        didAutoImportLegacy.current = true
        await handleImportLegacyMerchandise({ auto: true })
      }
    })()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const tab = params.get("tab")
    const type = params.get("type") as OfferType | null
    const trackId = params.get("trackId")
    if (tab) setActiveTab(tab === "products" ? "listings" : tab)
    if (type && type in OFFER_CONFIG) resetListingForm(type)
    if (trackId) {
      setSelectedOfferType("music")
      setListingForm(prev => ({
        ...prev,
        trackId,
        title: tracks.find(track => track.id === trackId)?.title || prev.title,
        basePrice: OFFER_CONFIG.music.defaultPrice,
        hasUnlimitedInventory: true,
      }))
    }
  }, [tracks])

  useEffect(() => {
    if (typeof window === "undefined" || listings.length === 0) return
    const id = new URLSearchParams(window.location.search).get("listing")
    const listing = id ? listings.find(item => item.id === id) : null
    if (listing) {
      startEditingListing(listing)
      setActiveTab("listings")
    }
  }, [listings])

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
      draftListings: listings.filter(listing => listing.status === "draft").length,
      missingImages: listings.filter(listing => !listing.cover_image_url).length,
      lowInventory: listings.filter(listing => !listing.has_unlimited_inventory && listing.inventory_count !== null && listing.inventory_count <= 3).length,
      importedProducts: integrationProducts.length,
      connectedIntegrations: integrations.filter(integration => integration.status === "active").length,
      failedFulfillments: fulfillmentRequests.filter(request => request.status === "failed").length,
      pendingPayoutAmount,
    }
  }, [listings, orders, payouts, integrations, integrationProducts, fulfillmentRequests])

  const hasAcceptedAgreement = Boolean(storefront?.accepted_seller_agreement_at)
  const hasPublishedListing = listings.some(listing => listing.status === "published")
  const hasStorefront = Boolean(storefront?.display_name)
  const printfulIntegration = integrations.find(integration => integration.provider === "printful")
  const shopifyIntegration = integrations.find(integration => integration.provider === "shopify")
  const hasConnectedStore = integrations.some(integration => integration.status === "active")
  const blockedPaidListings = listings.filter(listing => listing.status === "published" && Number(listing.base_price || 0) > 0 && !connectStatus.chargesEnabled)
  const selectedTrack = tracks.find(track => track.id === listingForm.trackId)
  const selectedConfig = OFFER_CONFIG[selectedOfferType]
  const previewImageUrl = listingForm.coverImageUrl || selectedTrack?.cover_art_url || null

  const checklist = [
    {
      label: "1. Accept seller agreement",
      done: hasAcceptedAgreement,
      action: "Accept",
      onClick: acceptSellerAgreement,
      loading: isAcceptingAgreement,
    },
    {
      label: "2. Connect Stripe payouts",
      done: connectStatus.chargesEnabled,
      href: "#payments",
      onClick: () => setActiveTab("payments"),
    },
    {
      label: "3. Create first listing",
      done: listings.length > 0,
      href: "#listings",
      onClick: () => setActiveTab("listings"),
    },
    {
      label: "4. Publish storefront item",
      done: hasPublishedListing,
      href: "#listings",
      onClick: () => {
        if (!hasAcceptedAgreement) {
          setSyncMessage("Accept the seller agreement before publishing.")
          return
        }
        if (!connectStatus.chargesEnabled) {
          setSyncMessage("Complete Stripe setup before publishing paid listings.")
          setActiveTab("payments")
          return
        }
        setActiveTab("listings")
      },
    },
    {
      label: "5. Preview public storefront",
      done: hasPublishedListing && Boolean(artistPublicPath),
      href: artistPublicPath ? `${artistPublicPath}#public-artist-storefront` : undefined,
    },
  ]

  function startEditingListing(listing: MarketplaceListing) {
    const offerType = inferOfferType(listing)
    setSelectedOfferType(offerType)
    setEditingListing(listing)
    setListingForm({
      title: listing.title || "",
      description: listing.description || "",
      status: listing.status || "draft",
      basePrice: listing.base_price != null ? String(listing.base_price) : OFFER_CONFIG[offerType].defaultPrice,
      currency: listing.currency || "USD",
      coverImageUrl: listing.cover_image_url || "",
      inventoryCount: listing.inventory_count != null ? String(listing.inventory_count) : "",
      hasUnlimitedInventory: Boolean(listing.has_unlimited_inventory ?? listing.inventory_count === null),
      featured: listing.featured_rank != null,
      trackId: listing.music_track_id || "",
      rightsConfirmed: Boolean(listing.rights_confirmed),
      licenseType: listing.license_type || "personal_use",
    })
  }

  async function uploadCoverImage(file: File) {
    setIsUploadingCover(true)
    setSyncMessage(null)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSyncMessage("Sign in to upload a product image.")
        return
      }
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_")
      const path = `${user.id}/marketplace/${Date.now()}-${safeName}`
      const { error } = await supabase.storage.from("artist-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      })
      if (error) {
        setSyncMessage(error.message || "Failed to upload image")
        return
      }
      const { data } = supabase.storage.from("artist-photos").getPublicUrl(path)
      setListingForm(current => ({ ...current, coverImageUrl: data.publicUrl }))
      setSyncMessage("Product image uploaded.")
    } catch (error) {
      console.error("Cover upload failed", error)
      setSyncMessage("Unable to upload product image right now.")
    } finally {
      setIsUploadingCover(false)
    }
  }

  async function saveListing() {
    const price = Number(listingForm.basePrice || 0)
    const inventoryCount = listingForm.hasUnlimitedInventory || !listingForm.inventoryCount ? null : Number(listingForm.inventoryCount)
    if (!listingForm.title.trim()) {
      setSyncMessage("Add a title before saving this listing.")
      return
    }
    if (price <= 0) {
      setSyncMessage("Set a price greater than $0 before saving.")
      return
    }
    if (selectedOfferType === "music" && listingForm.status === "published" && !listingForm.rightsConfirmed) {
      setSyncMessage("Confirm you own the rights before publishing a music listing.")
      return
    }
    if (listingForm.status === "published" && !hasAcceptedAgreement) {
      setSyncMessage("Accept the Marketplace Seller Agreement before publishing listings.")
      return
    }
    if (listingForm.status === "published" && !connectStatus.chargesEnabled) {
      setSyncMessage("Complete Stripe setup before publishing paid marketplace listings.")
      setActiveTab("payments")
      return
    }

    setIsSavingListing(true)
    setSyncMessage(null)
    setLastPublishedPath(null)
    try {
      const payload = {
        title: listingForm.title.trim(),
        description: listingForm.description.trim() || null,
        category: selectedConfig.category,
        productType: selectedConfig.productType,
        status: listingForm.status,
        currency: listingForm.currency.toUpperCase(),
        basePrice: price,
        coverImageUrl: listingForm.coverImageUrl.trim() || undefined,
        inventoryCount,
        hasUnlimitedInventory: listingForm.hasUnlimitedInventory,
        featuredRank: listingForm.featured ? (editingListing?.featured_rank ?? 1) : null,
        trackId: selectedOfferType === "music" ? listingForm.trackId || undefined : undefined,
        licenseType: selectedOfferType === "music" ? listingForm.licenseType : undefined,
        rightsConfirmed: selectedOfferType === "music" ? listingForm.rightsConfirmed : undefined,
        metadata: {
          offerType: selectedOfferType,
          allowDownloads: selectedOfferType === "music",
          storefrontSource: "artist_store_dashboard",
        },
        variants: [
          {
            title: "Default",
            price,
            inventoryCount,
            isDefault: true,
          },
        ],
      }
      const response = await fetch(
        editingListing ? `/api/marketplace/listings/${editingListing.id}` : "/api/marketplace/listings",
        buildNoStoreInit({
          method: editingListing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        })
      )
      const body = await response.json()
      if (!response.ok) {
        const code = body?.error?.code || body?.code
        if (code === "seller_agreement_required") {
          setSyncMessage("Accept the seller agreement before publishing.")
          return
        }
        if (code === "stripe_connect_required") {
          setSyncMessage("Complete Stripe Connect before publishing paid listings.")
          setActiveTab("payments")
          return
        }
        setSyncMessage(extractApiError(body, "Failed to save listing"))
        return
      }
      if (listingForm.status === "published" && artistPublicPath) {
        const path = `${artistPublicPath}#public-artist-storefront`
        setLastPublishedPath(path)
        setSyncMessage("Listing published. It is live on your public storefront.")
        const publishedId = body.data?.id || editingListing?.id
        if (announceOnPublish && publishedId) {
          await shareListingToFeed(publishedId, listingForm.title.trim())
        }
      } else {
        setSyncMessage(editingListing ? "Listing updated." : "Draft saved. Publish when you are ready to sell.")
      }
      resetListingForm(selectedOfferType)
      await loadData()
    } finally {
      setIsSavingListing(false)
    }
  }

  async function toggleFeaturedListing(listing: MarketplaceListing) {
    const nextRank = listing.featured_rank == null ? 1 : null
    setSyncMessage(null)
    const response = await fetch(`/api/marketplace/listings/${listing.id}`, buildNoStoreInit({
      method: "PATCH",
      body: JSON.stringify({ featuredRank: nextRank }),
    }))
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setSyncMessage(extractApiError(body, "Failed to update featured status"))
      return
    }
    setSyncMessage(nextRank == null ? "Removed from Featured." : "Added to Featured.")
    await loadData()
  }

  async function restockListing(listing: MarketplaceListing, inventoryCount: number) {
    const response = await fetch(`/api/marketplace/listings/${listing.id}`, buildNoStoreInit({
      method: "PATCH",
      body: JSON.stringify({ inventoryCount, hasUnlimitedInventory: false, status: listing.status === "archived" ? "published" : listing.status }),
    }))
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setSyncMessage(extractApiError(body, "Failed to restock listing"))
      return
    }
    setSyncMessage(`Restocked ${listing.title} to ${inventoryCount}.`)
    await loadData()
  }

  async function shareListingToFeed(listingId: string, title?: string) {
    const response = await fetch("/api/posts/share", buildNoStoreInit({
      method: "POST",
      body: JSON.stringify({
        shared_content_type: "listing",
        shared_content_id: listingId,
        content: title ? `Check out my new drop: ${title}` : "Check out my storefront drop",
        visibility: "public",
      }),
    }))
    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
      setSyncMessage(extractApiError(body, "Failed to share listing to feed"))
      return
    }
    setSyncMessage("Listing shared to your feed.")
  }

  async function deleteListing(listing: MarketplaceListing) {
    setIsDeletingListingId(listing.id)
    setSyncMessage(null)
    try {
      const response = await fetch(`/api/marketplace/listings/${listing.id}`, buildNoStoreInit({ method: "DELETE" }))
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSyncMessage(extractApiError(body, "Failed to delete listing"))
        return
      }
      setSyncMessage("Listing deleted.")
      if (editingListing?.id === listing.id) resetListingForm()
      await loadData()
    } finally {
      setIsDeletingListingId(null)
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
          sections: storefrontSections,
          externalLinks,
          themeConfig,
          isActive: true,
        }),
      }))
      if (!response.ok) {
        const errorBody = await response.json()
        setSyncMessage(extractApiError(errorBody, "Failed to save storefront"))
        return
      }
      await loadData()
      setSyncMessage("Storefront saved.")
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
      setSyncMessage("Seller agreement accepted.")
    } finally {
      setIsAcceptingAgreement(false)
    }
  }

  async function handleImportLegacyMerchandise(options?: { auto?: boolean }) {
    setIsImportingLegacy(true)
    try {
      const response = await fetch("/api/marketplace/migrations/backfill-artist-merch", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({ dryRun: false, publishActiveItems: false }),
      }))
      const body = await response.json()
      if (!response.ok) {
        if (!options?.auto) setSyncMessage(extractApiError(body, "Failed to import legacy merch"))
        return
      }
      const insertedCount = Number(body.data?.inserted || 0)
      const drafted = Number(body.data?.drafted || insertedCount)
      if (insertedCount > 0) {
        setSyncMessage(
          options?.auto
            ? `Imported ${drafted} legacy products as drafts. Publish after Stripe setup.`
            : `Imported ${insertedCount} legacy products as drafts. Publish after seller agreement and Stripe setup.`
        )
      } else if (!options?.auto) {
        setSyncMessage("No legacy merch needed migration.")
      }
      await Promise.all([loadData(), loadBackfillPreview()])
    } finally {
      setIsImportingLegacy(false)
    }
  }

  async function connectPrintful() {
    if (!printfulForm.accessToken.trim()) {
      setSyncMessage("Paste a Printful private token before connecting.")
      return
    }
    setIsSavingIntegration("printful")
    setSyncMessage(null)
    try {
      const response = await fetch("/api/marketplace/integrations/printful", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({
          action: "connect",
          accessToken: printfulForm.accessToken.trim(),
          externalAccountId: printfulForm.externalAccountId.trim() || null,
        }),
      }))
      const body = await response.json()
      if (!response.ok) {
        setSyncMessage(extractApiError(body, "Failed to connect Printful"))
        return
      }
      setPrintfulForm({ accessToken: "", externalAccountId: "" })
      setSyncMessage(`Printful connected. Imported ${body.sync?.import?.importedCount ?? 0} new draft listings.`)
      await loadData()
    } finally {
      setIsSavingIntegration(null)
    }
  }

  async function connectShopify() {
    if (!shopifyForm.shopDomain.trim()) {
      setSyncMessage("Enter your Shopify .myshopify.com domain before connecting.")
      return
    }
    setIsSavingIntegration("shopify")
    setSyncMessage(null)
    try {
      const response = await fetch("/api/marketplace/integrations/shopify", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({
          action: "connect",
          shopDomain: shopifyForm.shopDomain.trim(),
        }),
      }))
      const body = await response.json()
      if (!response.ok || !body.authorizationUrl) {
        setSyncMessage(extractApiError(body, "Failed to start Shopify connection"))
        return
      }
      window.location.href = body.authorizationUrl
    } finally {
      setIsSavingIntegration(null)
    }
  }

  async function syncProvider(provider: "printful" | "shopify") {
    setIsSavingIntegration(provider)
    setSyncMessage(null)
    try {
      const response = await fetch(`/api/marketplace/integrations/${provider}`, buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({ action: "sync" }),
      }))
      const body = await response.json()
      if (!response.ok) {
        setSyncMessage(extractApiError(body, `Failed to sync ${provider}`))
        return
      }
      setSyncMessage(`${provider === "printful" ? "Printful" : "Shopify"} synced. ${body.sync?.import?.importedCount ?? 0} new drafts, ${body.sync?.import?.updatedCount ?? 0} updated.`)
      await loadData()
    } finally {
      setIsSavingIntegration(null)
    }
  }

  async function disconnectProvider(provider: "printful" | "shopify") {
    setIsSavingIntegration(provider)
    setSyncMessage(null)
    try {
      const response = await fetch(`/api/marketplace/integrations/${provider}`, buildNoStoreInit({ method: "DELETE" }))
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        setSyncMessage(extractApiError(body, `Failed to disconnect ${provider}`))
        return
      }
      setSyncMessage(`${provider === "printful" ? "Printful" : "Shopify"} disconnected.`)
      await loadData()
    } finally {
      setIsSavingIntegration(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="sticky top-0 z-10 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-3 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-3xl font-bold text-transparent">
                <Store className="h-7 w-7 text-purple-500" />
                {storeTitle}
              </h1>
              <p className="text-sm text-slate-400">{storeDescription}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {artistPublicPath ? (
                <Button asChild variant="outline" className="border-slate-700 text-white">
                  <Link href={`${artistPublicPath}#public-artist-storefront`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View storefront
                  </Link>
                </Button>
              ) : null}
              <Button onClick={() => setActiveTab("listings")} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="mr-2 h-4 w-4" />
                Add Listing
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto space-y-6 py-8">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-purple-300" />
              Commerce setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {checklist.map(item => {
                const Icon = item.done ? CheckCircle2 : Circle
                const content = (
                  <div className="flex h-full items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                    <Icon className={item.done ? "mt-0.5 h-5 w-5 text-green-400" : "mt-0.5 h-5 w-5 text-slate-500"} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.done ? "Complete" : "Needs attention"}</div>
                    </div>
                  </div>
                )
                if (item.onClick) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      disabled={item.loading}
                      onClick={item.onClick}
                      className="text-left"
                    >
                      {content}
                    </button>
                  )
                }
                if (item.href) {
                  return (
                    <Link key={item.label} href={item.href} className="block">
                      {content}
                    </Link>
                  )
                }
                return <div key={item.label}>{content}</div>
              })}
            </div>
          </CardContent>
        </Card>

        {syncMessage ? (
          <div className="rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm text-purple-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>{syncMessage}</span>
              <div className="flex items-center gap-3">
                {lastPublishedPath ? (
                  <Button asChild size="sm" variant="outline" className="border-purple-400/40 text-purple-100">
                    <Link href={lastPublishedPath}>View on your storefront</Link>
                  </Button>
                ) : null}
                <button className="text-xs underline opacity-70" onClick={() => setSyncMessage(null)}>dismiss</button>
              </div>
            </div>
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-slate-900/70 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="storefront">Storefront</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Gross revenue" value={formatCurrency(analytics.grossRevenue, "USD")} icon={BarChart3} />
              <MetricCard label="Published listings" value={String(analytics.publishedListings)} icon={Store} />
              <MetricCard label="Draft listings" value={String(analytics.draftListings)} icon={Edit} />
              <MetricCard label="Pending payouts" value={formatCurrency(analytics.pendingPayoutAmount, "USD")} icon={CreditCard} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Commerce health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthRow ok={connectStatus.chargesEnabled} label="Stripe payouts are connected" action="Set up payments" onClick={() => setActiveTab("payments")} />
                  <HealthRow ok={hasAcceptedAgreement} label="Seller agreement is accepted" action="Accept agreement" onClick={acceptSellerAgreement} />
                  <HealthRow ok={hasConnectedStore} label={`${analytics.connectedIntegrations} connected sales channels`} action="Connect store" onClick={() => setActiveTab("integrations")} />
                  <HealthRow ok={analytics.failedFulfillments === 0} label={`${analytics.failedFulfillments} fulfillment requests need review`} action="Review" onClick={() => setActiveTab("integrations")} />
                  <HealthRow ok={analytics.missingImages === 0} label={`${analytics.missingImages} listings need product images`} action="Review listings" onClick={() => setActiveTab("listings")} />
                  <HealthRow ok={analytics.lowInventory === 0} label={`${analytics.lowInventory} listings are low inventory`} action="Review listings" onClick={() => setActiveTab("listings")} />
                  <HealthRow ok={hasPublishedListing} label="At least one listing is public" action="Publish listing" onClick={() => setActiveTab("listings")} />
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Public storefront preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {publicPreviewListings.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-700 p-5 text-sm text-slate-400">
                      Published listings appear here exactly as fans see them on your profile.
                    </div>
                  ) : (
                    publicPreviewListings.slice(0, 3).map((listing, index) => (
                      <AnimatedProductCard
                        key={listing.id}
                        id={listing.id}
                        title={listing.title}
                        description={listing.description}
                        imageUrl={listing.cover_image_url}
                        productType={listing.product_type}
                        category={listing.category}
                        price={listing.base_price}
                        currency={listing.currency}
                        index={index}
                        theme={themeConfig}
                      />
                    ))
                  )}
                  {artistPublicPath ? (
                    <Button asChild variant="outline" size="sm" className="border-slate-700 text-white">
                      <Link href={`${artistPublicPath}#public-artist-storefront`}>Open public storefront</Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            {backfillPreview ? (
              <Card className="border-amber-500/20 bg-amber-500/10">
                <CardContent className="flex flex-col gap-3 p-4 text-sm text-amber-100 md:flex-row md:items-center md:justify-between">
                  <div>
                    Legacy merch migration: {backfillPreview.totalLegacyItems} legacy items, {backfillPreview.pendingItems} pending import, {backfillPreview.alreadyMigrated} already migrated.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isImportingLegacy || backfillPreview.pendingItems === 0}
                    onClick={() => void handleImportLegacyMerchandise()}
                    className="border-amber-400/40 text-amber-100 hover:bg-amber-500/10"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isImportingLegacy ? "Importing..." : "Import legacy merch"}
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-white">Current listings</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => resetListingForm("merch")} className="border-slate-700 text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      New
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-sm text-slate-400">Loading listings...</div>
                  ) : listings.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
                      No listings yet. Use the guided panel to create your first storefront item.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {listings.map(listing => (
                        <div key={listing.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                          <div className="flex items-start gap-4">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
                              {listing.cover_image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={listing.cover_image_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-slate-500" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="truncate font-medium text-white">{listing.title}</div>
                                <Badge variant="secondary" className={listing.status === "published" ? "bg-green-500/15 text-green-300" : "bg-slate-800 text-slate-200"}>
                                  {listing.status}
                                </Badge>
                                {listing.featured_rank != null ? (
                                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-200">Featured</Badge>
                                ) : null}
                                {listing.source_provider ? (
                                  <Badge variant="outline" className="border-blue-400/40 bg-blue-500/10 text-blue-200">
                                    {listing.source_provider}
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {listing.category} · {listing.product_type?.replace(/_/g, " ")} · {getListingActionLabel(listing)}
                                {listing.inventory_count != null && !listing.has_unlimited_inventory
                                  ? ` · stock ${listing.inventory_count}`
                                  : ""}
                              </div>
                              {listing.description ? <div className="mt-2 line-clamp-2 text-sm text-slate-300">{listing.description}</div> : null}
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                              <div className="text-sm font-semibold text-white">
                                {listing.base_price !== null ? formatCurrency(Number(listing.base_price), listing.currency || "USD") : "Custom"}
                              </div>
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => void toggleFeaturedListing(listing)}
                                  className="text-amber-200 hover:text-amber-100"
                                  title={listing.featured_rank != null ? "Unfeature" : "Feature"}
                                >
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                                {listing.status === "published" ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void shareListingToFeed(listing.id, listing.title)}
                                    className="text-slate-300 hover:text-white"
                                    title="Share to feed"
                                  >
                                    <Users className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                {!listing.has_unlimited_inventory && listing.inventory_count != null && listing.inventory_count <= 3 ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => void restockListing(listing, Math.max(25, Number(listing.inventory_count || 0) + 25))}
                                    className="text-emerald-300 hover:text-emerald-200"
                                    title="Restock +25"
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                ) : null}
                                <Button variant="ghost" size="sm" onClick={() => startEditingListing(listing)} className="text-slate-300 hover:text-white">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isDeletingListingId === listing.id}
                                  onClick={() => void deleteListing(listing)}
                                  className="text-red-300 hover:text-red-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">{editingListing ? "Edit listing" : "Create listing"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(OFFER_CONFIG) as OfferType[]).map(type => {
                      const config = OFFER_CONFIG[type]
                      const Icon = config.icon
                      const isActive = selectedOfferType === type
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => resetListingForm(type)}
                          className={[
                            "rounded-lg border p-3 text-left transition",
                            isActive ? "border-purple-500/60 bg-purple-500/15" : "border-slate-800 bg-slate-950/40 hover:border-slate-700",
                          ].join(" ")}
                        >
                          <Icon className={isActive ? "mb-2 h-5 w-5 text-purple-300" : "mb-2 h-5 w-5 text-slate-400"} />
                          <div className="text-sm font-medium text-white">{config.label}</div>
                          <div className="mt-1 text-xs text-slate-400">{config.description}</div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-3">
                    <Input value={listingForm.title} onChange={e => setListingForm(c => ({ ...c, title: e.target.value }))} placeholder="Listing title" />
                    <Textarea value={listingForm.description} onChange={e => setListingForm(c => ({ ...c, description: e.target.value }))} placeholder="Describe what fans are buying" rows={3} />
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 hover:border-slate-500">
                          <Upload className="h-3.5 w-3.5" />
                          {isUploadingCover ? "Uploading..." : "Upload product image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingCover}
                            onChange={event => {
                              const file = event.target.files?.[0]
                              if (file) void uploadCoverImage(file)
                              event.currentTarget.value = ""
                            }}
                          />
                        </label>
                        {listingForm.coverImageUrl ? (
                          <span className="text-xs text-emerald-300">Image ready</span>
                        ) : null}
                      </div>
                      <Input
                        value={listingForm.coverImageUrl}
                        onChange={e => setListingForm(c => ({ ...c, coverImageUrl: e.target.value }))}
                        placeholder="Or paste an image URL"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" value={listingForm.status} onChange={e => setListingForm(c => ({ ...c, status: e.target.value }))}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                      <Input value={listingForm.basePrice} onChange={e => setListingForm(c => ({ ...c, basePrice: e.target.value }))} placeholder="Price" type="number" step="0.01" min="0" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={listingForm.currency} onChange={e => setListingForm(c => ({ ...c, currency: e.target.value.toUpperCase().slice(0, 3) }))} placeholder="USD" maxLength={3} />
                      <Input
                        value={listingForm.inventoryCount}
                        onChange={e => setListingForm(c => ({ ...c, inventoryCount: e.target.value }))}
                        placeholder="Inventory"
                        type="number"
                        min="0"
                        disabled={listingForm.hasUnlimitedInventory}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={listingForm.hasUnlimitedInventory}
                        onChange={e => setListingForm(c => ({ ...c, hasUnlimitedInventory: e.target.checked }))}
                      />
                      Unlimited inventory or delivered manually
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={listingForm.featured}
                        onChange={e => setListingForm(c => ({ ...c, featured: e.target.checked }))}
                      />
                      Feature on storefront
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={announceOnPublish}
                        onChange={e => setAnnounceOnPublish(e.target.checked)}
                      />
                      Announce on feed when publishing
                    </label>

                    {selectedOfferType === "music" ? (
                      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <select
                          className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                          value={listingForm.trackId}
                          onChange={e => {
                            const track = tracks.find(item => item.id === e.target.value)
                            setListingForm(c => ({
                              ...c,
                              trackId: e.target.value,
                              title: c.title || track?.title || "",
                              coverImageUrl: c.coverImageUrl || track?.cover_art_url || "",
                            }))
                          }}
                        >
                          <option value="">Select track</option>
                          {tracks.map(track => (
                            <option key={track.id} value={track.id}>
                              {track.title}{track.genre ? ` (${track.genre})` : ""}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm"
                          value={listingForm.licenseType}
                          onChange={e => setListingForm(c => ({ ...c, licenseType: e.target.value as typeof listingForm.licenseType }))}
                        >
                          <option value="personal_use">Personal use download</option>
                          <option value="commercial_use">Commercial license</option>
                          <option value="exclusive">Exclusive license</option>
                        </select>
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                          <input
                            type="checkbox"
                            checked={listingForm.rightsConfirmed}
                            onChange={e => setListingForm(c => ({ ...c, rightsConfirmed: e.target.checked }))}
                          />
                          I confirm I own all rights to sell this track
                        </label>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">Live public card preview</div>
                    <AnimatedProductCard
                      id={editingListing?.id || "preview"}
                      title={listingForm.title || `${selectedConfig.label} listing`}
                      description={listingForm.description || selectedConfig.description}
                      imageUrl={previewImageUrl}
                      productType={selectedConfig.productType}
                      category={selectedConfig.category}
                      price={Number(listingForm.basePrice || 0) || null}
                      currency={listingForm.currency || "USD"}
                      theme={themeConfig}
                      onCheckout={() => {}}
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingListing ? (
                      <Button variant="outline" onClick={() => resetListingForm(selectedOfferType)} className="flex-1 border-slate-700 text-white">
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => void saveListing()}
                      disabled={isSavingListing || !listingForm.title.trim() || (selectedOfferType === "music" && listingForm.status === "published" && !listingForm.rightsConfirmed)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {isSavingListing ? "Saving..." : editingListing ? "Save changes" : listingForm.status === "published" ? "Publish listing" : "Save draft"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            {isLoading ? (
              <div className="text-sm text-slate-400">Loading orders...</div>
            ) : orders.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/60">
                <CardContent className="p-10 text-center text-sm text-slate-400">No orders yet.</CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const isOpen = selectedOrderId === order.id
                  const shipping = order.shipping_address || null
                  return (
                    <div key={order.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between text-left"
                        onClick={() => setSelectedOrderId(isOpen ? null : order.id)}
                      >
                        <div>
                          <div className="font-medium">Order #{order.id.slice(0, 8)}</div>
                          <div className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(Number(order.total_amount || 0), order.currency || "USD")}</div>
                          <div className="text-xs text-slate-400">
                            {order.status} · {order.payment_status}
                          </div>
                        </div>
                      </button>
                      {isOpen ? (
                        <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
                          <div className="space-y-2">
                            {(order.marketplace_order_items || []).map(item => (
                              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
                                <div>
                                  <div className="text-white">{item.title} × {item.quantity}</div>
                                  <div className="text-xs text-slate-400">
                                    {item.product_type || "item"} · {item.fulfillment_status || "pending"}
                                    {item.fulfillment_provider ? ` · ${item.fulfillment_provider}` : ""}
                                  </div>
                                </div>
                                <div className="text-sm text-slate-200">
                                  {formatCurrency(Number(item.line_total || item.unit_price || 0), order.currency || "USD")}
                                </div>
                              </div>
                            ))}
                          </div>
                          {shipping ? (
                            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
                              <div className="mb-1 font-medium text-slate-200">Shipping</div>
                              <div>{String(shipping.name || "")}</div>
                              <div>{String(shipping.line1 || "")} {String(shipping.line2 || "")}</div>
                              <div>
                                {[shipping.city, shipping.state, shipping.postal_code, shipping.country]
                                  .filter(Boolean)
                                  .map(String)
                                  .join(", ")}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-500">No shipping address on this order.</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="storefront">
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="space-y-4">
                  <Card className="border-slate-800 bg-slate-900/60">
                    <CardHeader>
                      <CardTitle className="text-white">Store details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input value={storefrontForm.displayName} onChange={e => setStorefrontForm(c => ({ ...c, displayName: e.target.value }))} placeholder="Store display name" />
                      <Textarea value={storefrontForm.tagline} onChange={e => setStorefrontForm(c => ({ ...c, tagline: e.target.value }))} rows={2} placeholder="Store tagline" />
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/60">
                    <CardHeader>
                      <CardTitle className="text-white">Storefront sections</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-slate-400">Choose which tabs appear on your public storefront. Featured stays first.</p>
                      {DEFAULT_STOREFRONT_SECTIONS.map(section => {
                        const checked = storefrontSections.includes(section)
                        return (
                          <label key={section} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-200">
                            <span>{STOREFRONT_SECTION_LABELS[section] || section}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={section === "featured"}
                              onChange={e => {
                                setStorefrontSections(current => {
                                  if (e.target.checked) return normalizeStorefrontSections([...current, section])
                                  return normalizeStorefrontSections(current.filter(item => item !== section))
                                })
                              }}
                            />
                          </label>
                        )
                      })}
                    </CardContent>
                  </Card>

                  <Card className="border-slate-800 bg-slate-900/60">
                    <CardHeader>
                      <CardTitle className="text-white">External links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {externalLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm">
                            <span className="font-medium text-slate-200">{link.label}</span>
                            <span className="mx-2 text-slate-500">-</span>
                            <span className="text-slate-400">{link.url}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => removeExternalLink(idx)}>
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      ))}
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <Input value={newLink.label} onChange={e => setNewLink(c => ({ ...c, label: e.target.value }))} placeholder="Label" />
                        <Input value={newLink.url} onChange={e => setNewLink(c => ({ ...c, url: e.target.value }))} placeholder="https://..." />
                        <Button variant="outline" size="sm" onClick={addExternalLink} disabled={!newLink.label.trim() || !newLink.url.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <StorefrontThemeEditor
                  theme={themeConfig}
                  displayName={storefrontForm.displayName}
                  tagline={storefrontForm.tagline}
                  onChange={setThemeConfig}
                />
              </div>

              <Button onClick={updateStorefront} disabled={isSavingStorefront || !storefrontForm.displayName.trim()} size="lg">
                {isSavingStorefront ? "Saving storefront..." : "Save storefront"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-white">Printful</CardTitle>
                      <p className="mt-1 text-sm text-slate-400">Import print-on-demand products and submit fulfillment after paid checkout.</p>
                    </div>
                    <IntegrationStatusBadge integration={printfulIntegration} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                    Last sync: {formatDateTime(printfulIntegration?.last_synced_at)}
                    {printfulIntegration?.last_sync_error ? <div className="mt-1 text-red-300">{printfulIntegration.last_sync_error}</div> : null}
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="password"
                      value={printfulForm.accessToken}
                      onChange={event => setPrintfulForm(current => ({ ...current, accessToken: event.target.value }))}
                      placeholder={printfulIntegration?.hasToken ? "Paste a new token to reconnect" : "Printful private token"}
                    />
                    <Input
                      value={printfulForm.externalAccountId}
                      onChange={event => setPrintfulForm(current => ({ ...current, externalAccountId: event.target.value }))}
                      placeholder="Printful store id (optional)"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void connectPrintful()} disabled={isSavingIntegration === "printful"} className="bg-purple-600 hover:bg-purple-700">
                      {isSavingIntegration === "printful" ? "Working..." : printfulIntegration?.hasToken ? "Reconnect" : "Connect"}
                    </Button>
                    <Button variant="outline" onClick={() => void syncProvider("printful")} disabled={!printfulIntegration?.hasToken || isSavingIntegration === "printful"} className="border-slate-700 text-white">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync
                    </Button>
                    <Button variant="ghost" onClick={() => void disconnectProvider("printful")} disabled={!printfulIntegration || isSavingIntegration === "printful"} className="text-red-300 hover:text-red-200">
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-white">Shopify</CardTitle>
                      <p className="mt-1 text-sm text-slate-400">Import products and inventory from an existing Shopify store. Tourify still handles checkout.</p>
                    </div>
                    <IntegrationStatusBadge integration={shopifyIntegration} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                    Shop: {shopifyIntegration?.external_shop_domain || shopifyIntegration?.external_account_id || "Not connected"}
                    <div>Last sync: {formatDateTime(shopifyIntegration?.last_synced_at)}</div>
                    {shopifyIntegration?.last_sync_error ? <div className="mt-1 text-red-300">{shopifyIntegration.last_sync_error}</div> : null}
                  </div>
                  <Input
                    value={shopifyForm.shopDomain}
                    onChange={event => setShopifyForm({ shopDomain: event.target.value })}
                    placeholder="your-store.myshopify.com"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void connectShopify()} disabled={isSavingIntegration === "shopify"} className="bg-purple-600 hover:bg-purple-700">
                      {isSavingIntegration === "shopify" ? "Working..." : shopifyIntegration?.hasToken ? "Reconnect" : "Connect"}
                    </Button>
                    <Button variant="outline" onClick={() => void syncProvider("shopify")} disabled={!shopifyIntegration?.hasToken || isSavingIntegration === "shopify"} className="border-slate-700 text-white">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync
                    </Button>
                    <Button variant="ghost" onClick={() => void disconnectProvider("shopify")} disabled={!shopifyIntegration || isSavingIntegration === "shopify"} className="text-red-300 hover:text-red-200">
                      Disconnect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-800 bg-slate-900/60">
              <CardHeader>
                <CardTitle className="text-white">Imported product review</CardTitle>
              </CardHeader>
              <CardContent>
                {integrationProducts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
                    No imported products yet. Connect Printful or Shopify, then sync to create draft marketplace listings.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {integrationProducts.slice(0, 12).map(product => {
                      const listing = listings.find(item => item.id === product.imported_listing_id)
                      return (
                        <div key={product.id} className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                          <div className="h-14 w-14 overflow-hidden rounded-md bg-slate-800">
                            {product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package className="h-5 w-5 text-slate-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="truncate text-sm font-medium text-white">{product.title}</div>
                              <Badge variant="outline" className="border-blue-400/40 bg-blue-500/10 text-blue-200">{providerLabel(product.provider)}</Badge>
                              <Badge variant="secondary" className="bg-slate-800 text-slate-200">{product.sync_status}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {product.variants_count || 0} variants · {product.status}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!listing}
                            onClick={() => {
                              if (!listing) return
                              startEditingListing(listing)
                              setActiveTab("listings")
                            }}
                            className="border-slate-700 text-white"
                          >
                            Review draft
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Sync history</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {syncRuns.length === 0 ? (
                    <div className="text-sm text-slate-400">No syncs yet.</div>
                  ) : syncRuns.slice(0, 6).map(run => (
                    <div key={run.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">{providerLabel(run.provider)}</div>
                        <Badge variant="secondary" className={run.status === "completed" ? "bg-green-500/15 text-green-300" : run.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-slate-800 text-slate-200"}>
                          {run.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {run.imported_count} new · {run.updated_count} updated · {run.skipped_count} skipped · {formatDateTime(run.started_at)}
                      </div>
                      {run.error_message ? <div className="mt-1 text-xs text-red-300">{run.error_message}</div> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Fulfillment requests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fulfillmentRequests.length === 0 ? (
                    <div className="text-sm text-slate-400">No provider fulfillment requests yet.</div>
                  ) : fulfillmentRequests.slice(0, 6).map(request => (
                    <div key={request.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-white">{providerLabel(request.provider)}</div>
                        <Badge variant="secondary" className={request.status === "failed" ? "bg-red-500/15 text-red-300" : "bg-slate-800 text-slate-200"}>
                          {request.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {request.external_order_id || "Awaiting provider id"} · {formatDateTime(request.created_at)}
                      </div>
                      {request.error_message ? <div className="mt-1 text-xs text-red-300">{request.error_message}</div> : null}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
              <StripeConnectSetup />
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                <h3 className="mb-2 font-semibold text-white">How payments work</h3>
                <ul className="list-disc space-y-1 pl-4 text-slate-400">
                  <li>Set your price. Buyers pay your listed price plus a 10% Tourify service fee.</li>
                  <li>You receive your listed subtotal through Stripe Connect destination charges.</li>
                  <li>Stripe controls bank payout timing and shows the final payout schedule in your Stripe dashboard.</li>
                </ul>
              </div>
              {!connectStatus.chargesEnabled && listings.some(listing => Number(listing.base_price || 0) > 0) ? (
                <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Paid listings cannot publish or checkout until Stripe setup is complete.
                </div>
              ) : null}
              </div>

              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Payout ledger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {blockedPaidListings.length > 0 ? (
                    <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                      {blockedPaidListings.length} paid public listings need Stripe readiness before buyers can check out.
                    </div>
                  ) : null}
                  {payouts.length === 0 ? (
                    <div className="text-sm text-slate-400">No payout ledger entries yet.</div>
                  ) : payouts.slice(0, 8).map(row => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                      <div>
                        <div className="text-sm font-medium text-white">{formatCurrency(Number(row.net_amount || 0), "USD")}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {row.payout_provider || "stripe_connect"} · available {formatDateTime(row.available_at)}
                        </div>
                      </div>
                      <Badge variant="secondary" className={row.payout_status === "scheduled" || row.payout_status === "paid" ? "bg-green-500/15 text-green-300" : row.payout_status === "failed" || row.payout_status === "on_hold" ? "bg-red-500/15 text-red-300" : "bg-slate-800 text-slate-200"}>
                        {row.payout_status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Gross revenue (30d)"
                value={formatCurrency(marketplaceAnalytics?.grossRevenue ?? analytics.grossRevenue, "USD")}
                icon={BarChart3}
              />
              <MetricCard
                label="Paid orders (30d)"
                value={String(marketplaceAnalytics?.paidOrders ?? analytics.totalOrders)}
                icon={Package}
              />
              <MetricCard
                label="Units sold (30d)"
                value={String(marketplaceAnalytics?.unitsSold ?? 0)}
                icon={ShoppingBag}
              />
              <MetricCard
                label="Pending payouts"
                value={formatCurrency(marketplaceAnalytics?.pendingPayouts ?? analytics.pendingPayoutAmount, "USD")}
                icon={CreditCard}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Top products</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(marketplaceAnalytics?.topListings || []).length === 0 ? (
                    <div className="text-sm text-slate-400">No paid sales in this range yet.</div>
                  ) : (
                    marketplaceAnalytics?.topListings.map(item => (
                      <div key={item.listingId} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate text-white">{item.title}</div>
                          <div className="text-xs text-slate-400">{item.unitsSold} sold</div>
                        </div>
                        <div className="font-semibold text-white">{formatCurrency(item.revenue, "USD")}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="border-slate-800 bg-slate-900/60">
                <CardHeader>
                  <CardTitle className="text-white">Daily revenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-72 overflow-auto">
                  {(marketplaceAnalytics?.dailySeries || []).slice(-14).map(point => (
                    <div key={point.date} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{point.date}</span>
                      <span className="text-white">
                        {formatCurrency(point.revenue, "USD")} · {point.orders} orders
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Store }) {
  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-2 text-xl font-semibold text-white">{value}</div>
          </div>
          <Icon className="h-5 w-5 text-purple-300" />
        </div>
      </CardContent>
    </Card>
  )
}

function HealthRow({ ok, label, action, onClick }: { ok: boolean; label: string; action: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex min-w-0 items-center gap-3">
        {ok ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />}
        <span className={ok ? "text-sm text-slate-300" : "text-sm text-white"}>{label}</span>
      </div>
      {!ok ? (
        <Button variant="ghost" size="sm" onClick={onClick} className="text-purple-200 hover:text-white">
          {action}
        </Button>
      ) : null}
    </div>
  )
}

function IntegrationStatusBadge({ integration }: { integration?: MarketplaceIntegration }) {
  if (!integration) {
    return <Badge variant="secondary" className="bg-slate-800 text-slate-300">Not connected</Badge>
  }
  if (integration.status === "active") {
    return <Badge variant="secondary" className="bg-green-500/15 text-green-300">Connected</Badge>
  }
  if (integration.status === "error") {
    return <Badge variant="secondary" className="bg-red-500/15 text-red-300">Needs attention</Badge>
  }
  return <Badge variant="secondary" className="bg-slate-800 text-slate-300">{integration.status}</Badge>
}

function ListingCompactRow({ listing, onEdit }: { listing: MarketplaceListing; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-left transition hover:border-slate-700"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{listing.title}</div>
        <div className="mt-1 text-xs text-slate-400">{listing.category} · {listing.status}</div>
      </div>
      <div className="text-sm font-semibold text-white">
        {listing.base_price !== null ? formatCurrency(Number(listing.base_price), listing.currency || "USD") : "Custom"}
      </div>
    </button>
  )
}
