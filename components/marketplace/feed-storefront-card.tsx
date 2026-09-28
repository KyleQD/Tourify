'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { FeedStorefrontAttachment } from '@/lib/marketplace/feed-attachment'

interface FeedStorefrontCardProps {
  attachment: FeedStorefrontAttachment
}

/**
 * Feed card for a storefront share.
 *
 * - CTA is always "View marketplace" routing to /marketplace/store/[slug].
 * - Storefront attribution is fixed to original_seller_user_id.
 * - Does not force checkout — storefront shares are discovery-only.
 */
export function FeedStorefrontCard({ attachment }: FeedStorefrontCardProps) {
  const { storefront, available } = attachment

  if (!storefront) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-4 max-w-sm">
        <p className="text-xs text-slate-500">This storefront is no longer available.</p>
      </div>
    )
  }

  const storefrontHref = storefront.slug
    ? `/marketplace/store/${storefront.slug}`
    : '/marketplace'

  return (
    <article className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 max-w-sm w-full">
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              Marketplace
            </div>
            <Link href={storefrontHref} className="block font-semibold text-sm text-white leading-snug hover:underline truncate">
              {storefront.displayName}
            </Link>
          </div>
          {storefront.sellerType && (
            <Badge variant="secondary" className="shrink-0 bg-slate-800 text-slate-300 text-[10px] capitalize">
              {storefront.sellerType.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        {storefront.tagline && (
          <p className="text-xs text-slate-400 line-clamp-2">{storefront.tagline}</p>
        )}

        {/* Unavailable state */}
        {!available && (
          <div className="rounded-md border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-400">
            This storefront is currently paused.
          </div>
        )}

        {/* CTA */}
        <Link href={storefrontHref} className="block">
          <Button
            size="sm"
            variant={available ? 'default' : 'outline'}
            className="w-full"
            disabled={!available}
            aria-label={`View ${storefront.displayName} marketplace`}
          >
            View marketplace
          </Button>
        </Link>
      </div>
    </article>
  )
}
