"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export interface ListingCardData {
  id: string
  title: string
  description: string | null
  category: string
  product_type: string
  listing_kind?: string | null
  service_mode?: string | null
  public_slug?: string | null
  currency: string
  base_price: number | null
  cover_image_url?: string | null
  status?: string
  marketplace_listing_variants?: Array<{ id: string; title: string; price: number }>
}

type CardVariant = "hub" | "profile" | "feed" | "compact"

interface ListingCardProps {
  listing: ListingCardData
  variant?: CardVariant
  isCheckoutLoading?: boolean
  onCheckout?: () => void
  onQuickView?: () => void
  /** Buyer-facing CTA label override */
  ctaLabel?: string
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "Price on request"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(price)
}

function inferCtaLabel(listing: ListingCardData): string {
  if (listing.listing_kind === "external") return "View product"
  if (listing.listing_kind === "service") {
    if (listing.service_mode === "booking_request") return "Request booking"
    if (listing.service_mode === "quote_request") return "Get a quote"
    return "Book now"
  }
  if (listing.category === "music" || listing.product_type === "digital_asset") return "Download"
  if (listing.category === "tickets" || listing.product_type === "ticket") return "Get tickets"
  if (listing.category === "support" || listing.product_type === "tip") return "Tip"
  return "Buy now"
}

function inferHref(listing: ListingCardData): string | null {
  if (listing.public_slug) return `/marketplace/listing/${listing.public_slug}`
  return `/marketplace/listing/${listing.id}`
}

export function ListingCard({
  listing,
  variant = "hub",
  isCheckoutLoading,
  onCheckout,
  onQuickView,
  ctaLabel,
}: ListingCardProps) {
  const label = ctaLabel ?? inferCtaLabel(listing)
  const href = inferHref(listing)
  const isExternal = listing.listing_kind === "external"
  const isSoldOut = listing.status === "sold_out"
  const isPaused = listing.status === "paused"
  const unavailable = isSoldOut || isPaused

  if (variant === "compact") {
    return (
      <article className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        {listing.cover_image_url ? (

          <img src={listing.cover_image_url} alt={listing.title} className="h-12 w-12 rounded-md object-cover flex-shrink-0" loading="lazy" />
        ) : (
          <div className="h-12 w-12 flex-shrink-0 rounded-md bg-slate-800 flex items-center justify-center text-xs text-slate-500">—</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{listing.title}</div>
          <div className="text-xs text-slate-400">{formatPrice(listing.base_price, listing.currency)}</div>
        </div>
        {href && (
          <Link href={href} className="text-xs text-slate-400 hover:text-white shrink-0">View</Link>
        )}
      </article>
    )
  }

  if (variant === "feed") {
    return (
      <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 max-w-sm">
        {listing.cover_image_url && (
          <div className="aspect-video overflow-hidden bg-black/30">
            <img src={listing.cover_image_url} alt={listing.title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-sm text-white line-clamp-1">{listing.title}</div>
            {isExternal && <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />}
          </div>
          <div className="text-sm font-semibold text-white">{formatPrice(listing.base_price, listing.currency)}</div>
          {href && (
            <Link href={href} className="block">
              <Button size="sm" variant="outline" className="w-full border-slate-700 text-white text-xs">{label}</Button>
            </Link>
          )}
        </div>
      </article>
    )
  }

  // hub + profile variants
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 flex flex-col">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-black/30">
        {listing.cover_image_url ? (

          <img
            src={listing.cover_image_url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-500">No image</div>
        )}
        {/* Status overlays */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">Sold out</span>
          </div>
        )}
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-slate-400">Unavailable</span>
          </div>
        )}
        {isExternal && (
          <div className="absolute right-2 top-2 rounded-md border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 flex items-center gap-1">
            <ExternalLink className="h-2.5 w-2.5" /> External
          </div>
        )}
        {listing.listing_kind === "service" && (
          <div className="absolute right-2 top-2 rounded-md border border-sky-500/40 bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300">
            Service
          </div>
        )}
        {/* Quick-view hover overlay — desktop only */}
        {onQuickView && !unavailable && (
          <button
            type="button"
            onClick={onQuickView}
            className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/40 group-hover:opacity-100"
            aria-label={`Quick view ${listing.title}`}
          >
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm border border-white/20">
              Quick view
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 gap-2 p-3">
        <div className="flex items-start justify-between gap-1">
          <div className="line-clamp-1 text-sm font-medium text-white leading-snug">{listing.title}</div>
          <Badge variant="secondary" className="shrink-0 bg-slate-800 text-slate-300 text-[10px] py-0">
            {listing.category.replace(/-/g, " ")}
          </Badge>
        </div>

        {variant === "hub" && listing.description && (
          <p className="line-clamp-2 text-xs text-slate-400">{listing.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-bold text-white">
            {formatPrice(listing.base_price, listing.currency)}
          </span>
          {!unavailable && (
            href ? (
              <Link href={href}>
                <Button size="sm" variant="outline" className="border-slate-700 text-white text-xs">
                  {label}
                </Button>
              </Link>
            ) : onCheckout ? (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-white text-xs"
                disabled={isCheckoutLoading}
                onClick={onCheckout}
              >
                {isCheckoutLoading ? "…" : label}
              </Button>
            ) : null
          )}
        </div>
      </div>
    </article>
  )
}
