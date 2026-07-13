"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export interface ListingPreviewData {
  id: string
  title: string
  description?: string | null
  price?: number | null
  currency?: string
  coverImageUrl?: string | null
  category?: string | null
  productType?: string | null
  url?: string | null
}

interface ListingFeedPreviewProps {
  listing: ListingPreviewData
  compact?: boolean
}

export function ListingFeedPreview({ listing, compact = false }: ListingFeedPreviewProps) {
  const href = listing.url || `/marketplace/listings/${listing.id}`
  const priceLabel =
    listing.price != null
      ? `${listing.currency || "USD"} ${Number(listing.price).toFixed(2)}`
      : "View listing"

  return (
    <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/30 ${compact ? "mt-2" : "mt-3"}`}>
      <div className={compact ? "flex gap-3 p-3" : "grid gap-0 sm:grid-cols-[160px_1fr]"}>
        <div className={compact ? "h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-black/40" : "aspect-square bg-black/40"}>
          {listing.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.coverImageUrl} alt={listing.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">No image</div>
          )}
        </div>
        <div className={compact ? "min-w-0 flex-1" : "flex flex-col justify-between gap-3 p-4"}>
          <div>
            <div className="truncate text-sm font-semibold text-white">{listing.title}</div>
            {listing.description ? (
              <p className="mt-1 line-clamp-2 text-xs text-white/60">{listing.description}</p>
            ) : null}
            <div className="mt-2 text-sm font-medium text-emerald-200">{priceLabel}</div>
          </div>
          <div className="mt-2 flex gap-2">
            <Button asChild size="sm" variant="outline" className="border-white/20">
              <Link href={href}>View</Link>
            </Button>
            <Button asChild size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Link href={href}>Buy</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
