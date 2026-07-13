import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import {
  buildUnavailablePreviewMetadata,
  buildVenuePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'
import { getPublicVenuePreview } from '@/lib/seo/public-preview-readers'

interface VenuePublicLayoutProps {
  children: ReactNode
}

interface VenuePublicMetadataProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: VenuePublicMetadataProps): Promise<Metadata> {
  const { slug } = await params
  const fallbackPath = `/venues/${encodeURIComponent(slug)}`
  const venue = await getPublicVenuePreview(slug)

  if (!venue) return buildUnavailablePreviewMetadata(fallbackPath)

  return buildVenuePreviewMetadata({
    venueName: venue.venueName,
    description: venue.description,
    city: venue.city,
    state: venue.state,
    country: venue.country,
    path: `/venues/${encodeURIComponent(venue.canonicalSlug)}`,
    imageUrl: venue.imageUrl,
  })
}

export default function VenuePublicLayout({ children }: VenuePublicLayoutProps) {
  return <>{children}</>
}
