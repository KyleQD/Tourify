'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FeedListingAttachment } from '@/lib/marketplace/feed-attachment'

interface FeedListingCardProps {
  attachment: FeedListingAttachment
  isCheckoutLoading?: boolean
  onCheckout?: () => void
}

const CTA_LABELS: Record<string, string> = {
  buy_now: 'Buy now',
  request_booking: 'Request booking',
  request_quote: 'Get a quote',
  book_now: 'Book now',
  get_tickets: 'Get tickets',
  view_on_provider: 'View on provider',
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) return 'Price on request'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(price)
}

/**
 * Feed card for a marketplace listing attachment.
 *
 * - Renders current listing state (not a snapshot from share time).
 * - Shows unavailable state when listing is paused/suspended/sold_out.
 * - CTA matches listing_kind + service_mode.
 * - External listings route through the safe redirect endpoint.
 * - Preserves original seller attribution via originalStorefrontSlug.
 */
export function FeedListingCard({ attachment, isCheckoutLoading, onCheckout }: FeedListingCardProps) {
  const { listing, available, cta, isExternal, providerName, redirectHref, originalStorefrontSlug } = attachment

  // Listing was deleted or otherwise unavailable
  if (!listing) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 max-w-sm">
        <p className="text-xs text-slate-500">This listing is no longer available.</p>
      </div>
    )
  }

  const listingHref = listing.publicSlug
    ? `/marketplace/listing/${listing.publicSlug}`
    : `/marketplace/listing/${listing.id}`

  const storefrontHref = originalStorefrontSlug
    ? `/marketplace/store/${originalStorefrontSlug}`
    : null

  const ctaLabel = CTA_LABELS[cta] ?? 'View listing'
  const isSoldOut = listing.status === 'sold_out'
  const isPaused = listing.status === 'paused' || listing.status === 'suspended'

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 max-w-sm w-full">
      {/* Media */}
      {listing.coverImageUrl && (
        <Link href={listingHref} className="block">
          <div className="aspect-video overflow-hidden bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={listing.coverImageUrl}
              alt={listing.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </Link>
      )}

      <div className="p-4 space-y-3">
        {/* Title + badges */}
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <Link href={listingHref} className="flex-1 font-semibold text-sm text-white leading-snug hover:underline line-clamp-2">
              {listing.title}
            </Link>
            {isExternal && <ExternalLink className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 text-[10px]">
              {listing.category.replace(/-/g, ' ')}
            </Badge>
            {isExternal && (
              <Badge variant="secondary" className="bg-amber-900/40 text-amber-300 text-[10px]">
                External checkout
              </Badge>
            )}
            {listing.listingKind === 'service' && (
              <Badge variant="secondary" className="bg-sky-900/40 text-sky-300 text-[10px]">
                Service
              </Badge>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-base font-bold text-white">
          {formatPrice(listing.basePrice, listing.currency)}
          {isExternal && (
            <span className="ml-1.5 text-xs font-normal text-amber-400/80">
              · May differ on provider
            </span>
          )}
        </div>

        {/* External provider note */}
        {isExternal && providerName && (
          <p className="text-xs text-amber-200/70">
            Sold on {providerName} — checkout handled externally.
          </p>
        )}

        {/* Unavailable state */}
        {!available && (
          <div className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
            {isSoldOut ? 'This item is currently sold out.' : 'This listing is temporarily unavailable.'}
          </div>
        )}

        {/* CTA row */}
        <div className="flex items-center gap-2 pt-0.5">
          {available && (
            <>
              {isExternal && redirectHref ? (
                <a href={redirectHref} rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" className="w-full gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {ctaLabel}
                  </Button>
                </a>
              ) : onCheckout ? (
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={isCheckoutLoading}
                  onClick={onCheckout}
                >
                  {isCheckoutLoading ? '…' : ctaLabel}
                </Button>
              ) : (
                <Link href={listingHref} className="flex-1">
                  <Button size="sm" className="w-full">{ctaLabel}</Button>
                </Link>
              )}
            </>
          )}
          {storefrontHref && (
            <Link href={storefrontHref} className="shrink-0 text-xs text-slate-400 hover:text-white">
              View store
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
