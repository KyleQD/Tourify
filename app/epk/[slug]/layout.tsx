import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import {
  buildEpkPreviewMetadata,
  buildUnavailablePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'
import { getPublicEpkPreview } from '@/lib/seo/public-preview-readers'

interface EpkPublicLayoutProps {
  children: ReactNode
}

interface EpkPublicMetadataProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: EpkPublicMetadataProps): Promise<Metadata> {
  const { slug } = await params
  const fallbackPath = `/epk/${encodeURIComponent(slug)}`
  const epk = await getPublicEpkPreview(slug)

  if (!epk) return buildUnavailablePreviewMetadata(fallbackPath)

  return buildEpkPreviewMetadata({
    artistName: epk.artistName,
    bio: epk.bio,
    genre: epk.genre,
    location: epk.location,
    path: `/epk/${encodeURIComponent(epk.canonicalSlug)}`,
    imageUrl: epk.imageUrl,
  })
}

export default function EpkPublicLayout({ children }: EpkPublicLayoutProps) {
  return <>{children}</>
}
