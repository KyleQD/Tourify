import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { getPublicArtistProfileDTO } from '@/lib/public-artist/get-public-artist-profile'
import {
  buildArtistPreviewMetadata,
  buildUnavailablePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'

interface ArtistPublicLayoutProps {
  children: ReactNode
}

interface ArtistPublicMetadataProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({
  params,
}: ArtistPublicMetadataProps): Promise<Metadata> {
  const { username } = await params
  const fallbackPath = `/artist/${encodeURIComponent(username)}`
  const dto = await getPublicArtistProfileDTO({ username })

  if (!dto) return buildUnavailablePreviewMetadata(fallbackPath)

  const heroImage =
    dto.hero.banner?.kind === 'image'
      ? dto.hero.banner.url
      : dto.hero.banner?.thumbnailUrl || dto.hero.avatarUrl

  return buildArtistPreviewMetadata({
    artistName: dto.hero.artistName,
    bio: dto.about.bio,
    genres: dto.hero.genres,
    location: dto.hero.location,
    path: `/artist/${encodeURIComponent(username)}`,
    imageUrl: heroImage,
  })
}

export default function ArtistPublicLayout({ children }: ArtistPublicLayoutProps) {
  // This layout provides a clean, public view without the artist dashboard sidebar
  // The PublicProfileLayout component now handles the styling
  return <>{children}</>
}
