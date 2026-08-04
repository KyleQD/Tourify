"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, X } from "lucide-react"
import type { ListingCardData } from "@/components/marketplace/listing-card"
import Link from "next/link"

interface ListingQuickViewProps {
  listing: ListingCardData | null
  isOpen: boolean
  onClose: () => void
  isCheckoutLoading?: boolean
  onCheckout?: () => void
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "Price on request"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD" }).format(price)
}

function inferCtaLabel(listing: ListingCardData): string {
  if (listing.listing_kind === "external") return "Continue to provider"
  if (listing.listing_kind === "service") {
    if (listing.service_mode === "booking_request") return "Request booking"
    if (listing.service_mode === "quote_request") return "Get a quote"
    return "Book now"
  }
  if (listing.category === "music" || listing.product_type === "digital_asset") return "Download"
  if (listing.category === "tickets" || listing.product_type === "ticket") return "Get tickets"
  return "Buy now"
}

export function ListingQuickView({
  listing,
  isOpen,
  onClose,
  isCheckoutLoading,
  onCheckout,
}: ListingQuickViewProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  // Trap focus
  useEffect(() => {
    if (!isOpen) return
    const prev = document.activeElement as HTMLElement | null
    overlayRef.current?.focus()
    return () => prev?.focus()
  }, [isOpen])

  if (!listing) return null

  const href = listing.public_slug
    ? `/marketplace/listing/${listing.public_slug}`
    : `/marketplace/listing/${listing.id}`
  const ctaLabel = inferCtaLabel(listing)
  const isExternal = listing.listing_kind === "external"
  const isSoldOut = listing.status === "sold_out"
  const isPaused = listing.status === "paused"
  const unavailable = isSoldOut || isPaused

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — desktop modal + mobile bottom-sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view: ${listing.title}`}
        ref={overlayRef}
        tabIndex={-1}
        className={[
          "fixed z-50 bg-slate-900 border border-slate-700 focus:outline-none transition-all duration-300",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh] overflow-y-auto",
          // Desktop: centered modal
          "sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:rounded-2xl sm:max-h-[90vh]",
          isOpen ? "translate-y-0 sm:opacity-100" : "translate-y-full sm:translate-y-[-48%] sm:opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white z-10"
          aria-label="Close quick view"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        {listing.cover_image_url && (
          <div className="aspect-video w-full overflow-hidden rounded-t-2xl bg-black/30 sm:rounded-t-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={listing.cover_image_url} alt={listing.title} className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="space-y-4 p-5">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <h2 className="flex-1 text-lg font-semibold text-white leading-snug">{listing.title}</h2>
              {isExternal && <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-amber-400" />}
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                {listing.category.replace(/-/g, " ")}
              </Badge>
              {listing.listing_kind === "service" && (
                <Badge variant="secondary" className="bg-sky-900/50 text-sky-300">
                  {listing.service_mode === "booking_request"
                    ? "Booking request"
                    : listing.service_mode === "quote_request"
                      ? "Quote / custom"
                      : "Fixed-price service"}
                </Badge>
              )}
              {isExternal && (
                <Badge variant="secondary" className="bg-amber-900/40 text-amber-300">External checkout</Badge>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-2xl font-bold text-white">
            {formatPrice(listing.base_price, listing.currency)}
          </div>

          {/* Description */}
          {listing.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{listing.description}</p>
          )}

          {/* External disclosure */}
          {isExternal && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              This listing links to an external provider. Checkout and fulfillment are handled by that provider, not Tourify.
            </div>
          )}

          {/* Sold out / paused */}
          {unavailable && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400">
              {isSoldOut ? "This item is currently sold out." : "This listing is temporarily unavailable."}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link href={href} className="flex-1">
              <Button variant="outline" className="w-full border-slate-700 text-white" size="sm">
                View full listing
              </Button>
            </Link>
            {!unavailable && onCheckout && (
              <Button
                className="flex-1"
                size="sm"
                disabled={isCheckoutLoading}
                onClick={onCheckout}
              >
                {isCheckoutLoading ? "…" : ctaLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
