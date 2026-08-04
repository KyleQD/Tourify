import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getPublicListingBySlug } from "@/lib/marketplace/public-listing-query"
import { requirePublicDiscoveryEnabled } from "@/lib/marketplace/require-marketplace-enabled"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ "listing-slug": string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { "listing-slug": slug } = await params
  const listing = await getPublicListingBySlug(slug)
  if (!listing) return { title: "Listing not found" }
  return {
    title: `${listing.title} — Tourify Marketplace`,
    description: listing.description ?? `Buy ${listing.title} on Tourify Marketplace.`,
    openGraph: {
      title: listing.title,
      description: listing.description ?? undefined,
      images: listing.cover_image_url ? [{ url: listing.cover_image_url }] : [],
    },
  }
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "Price on request"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(price)
}

export default async function PublicListingPage({ params }: PageProps) {
  const guard = requirePublicDiscoveryEnabled()
  if (guard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
        <p className="text-slate-400 text-sm">Marketplace is not currently available.</p>
      </div>
    )
  }

  const { "listing-slug": slug } = await params
  const listing = await getPublicListingBySlug(slug)
  if (!listing) notFound()

  // Load seller profile
  const supabase = await createClient()
  const { data: seller } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", listing.seller_user_id)
    .maybeSingle()

  // Load storefront for back-link
  const { data: storefront } = await supabase
    .from("marketplace_storefronts")
    .select("id, slug, display_name")
    .eq("seller_user_id", listing.seller_user_id)
    .eq("is_active", true)
    .maybeSingle()

  const isExternal = listing.listing_kind === "external"
  const isService = listing.listing_kind === "service"
  const redirectHref = isExternal ? `/api/marketplace/listings/${listing.id}/redirect?from=listing` : null

  // For services: determine CTA copy
  let serviceModeLabel = ""
  let serviceCta = "Buy now"
  if (isService) {
    if (listing.service_mode === "booking_request") {
      serviceModeLabel = "Booking request — submit your request and the seller will review it."
      serviceCta = "Request booking"
    } else if (listing.service_mode === "quote_request") {
      serviceModeLabel = "Custom quote — describe your project and receive a tailored offer."
      serviceCta = "Request a quote"
    } else {
      serviceModeLabel = "Fixed-price service — purchase directly."
      serviceCta = "Book now"
    }
  }

  const storefrontHref = storefront?.slug
    ? `/marketplace/store/${storefront.slug}`
    : null

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
          <Link href="/marketplace" className="hover:text-white">Marketplace</Link>
          {storefrontHref && storefront && (
            <>
              <span>/</span>
              <Link href={storefrontHref} className="hover:text-white">{storefront.display_name}</Link>
            </>
          )}
          <span>/</span>
          <span className="text-slate-300 truncate max-w-xs">{listing.title}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Media */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-2xl bg-slate-800">
              {listing.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={listing.cover_image_url} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No image</div>
              )}
            </div>
            {listing.marketplace_listing_variants.length > 1 && (
              <div className="space-y-1">
                {listing.marketplace_listing_variants.map(v => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-700 px-3 py-2 text-sm">
                    <span className="text-slate-200">{v.title}</span>
                    <span className="font-semibold text-white">{formatPrice(v.price, listing.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details + CTA */}
          <div className="flex flex-col gap-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                {listing.category.replace(/-/g, " ")}
              </Badge>
              {isExternal && (
                <Badge variant="secondary" className="bg-amber-900/40 text-amber-300 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> External checkout
                </Badge>
              )}
              {isService && (
                <Badge variant="secondary" className="bg-sky-900/40 text-sky-300">Service</Badge>
              )}
            </div>

            {/* Title + price */}
            <div>
              <h1 className="text-2xl font-bold text-white leading-snug">{listing.title}</h1>
              <div className="mt-2 text-3xl font-bold text-white">
                {formatPrice(listing.base_price, listing.currency)}
              </div>
            </div>

            {/* Service mode disclosure — above the fold */}
            {isService && serviceModeLabel && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-sm text-sky-200">
                {serviceModeLabel}
              </div>
            )}

            {/* External disclosure */}
            {isExternal && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200 space-y-1">
                <p className="font-medium">External checkout</p>
                <p className="text-xs text-amber-300/80">
                  Clicking "Continue" will take you to the seller's external store. Checkout and fulfilment are
                  handled by that provider, not Tourify.
                </p>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{listing.description}</p>
            )}

            {/* Seller */}
            {seller && (
              <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                {seller.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={seller.avatar_url} alt={seller.full_name ?? ""} className="h-9 w-9 rounded-full object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{seller.full_name ?? seller.username}</div>
                  {seller.username && (
                    <Link href={`/artist/${seller.username}`} className="text-xs text-slate-400 hover:text-white">
                      @{seller.username}
                    </Link>
                  )}
                </div>
                {storefrontHref && (
                  <Link href={storefrontHref} className="text-xs text-slate-400 hover:text-white shrink-0">
                    View store
                  </Link>
                )}
              </div>
            )}

            {/* Sticky CTA */}
            <div className="sticky bottom-4 mt-auto space-y-2">
              {isExternal && redirectHref ? (
                <a href={redirectHref} rel="noopener noreferrer">
                  <Button className="w-full gap-2" size="lg">
                    <ExternalLink className="h-4 w-4" />
                    Continue to {listing.product_type === "ticket" ? "tickets" : "provider"}
                  </Button>
                </a>
              ) : (
                <Link href={`/marketplace?listing=${listing.id}`}>
                  <Button className="w-full" size="lg">
                    {isService ? serviceCta : "Buy now"}
                  </Button>
                </Link>
              )}
              <p className="text-center text-xs text-slate-500">
                {isExternal
                  ? "You will be redirected to the seller's external store."
                  : "Secure checkout powered by Stripe."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
