import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import {
  buildProfilePreviewMetadata,
  buildUnavailablePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'
import { getPublicProfilePreview } from '@/lib/seo/public-preview-readers'

interface ProfilePublicLayoutProps {
  children: ReactNode
}

interface ProfilePublicMetadataProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({
  params,
}: ProfilePublicMetadataProps): Promise<Metadata> {
  const { username } = await params
  const fallbackPath = `/profile/${encodeURIComponent(username)}`
  const profile = await getPublicProfilePreview(username)

  if (!profile) return buildUnavailablePreviewMetadata(fallbackPath)

  return buildProfilePreviewMetadata({
    displayName: profile.displayName,
    accountType: profile.accountType,
    bio: profile.bio,
    location: profile.location,
    path: `/profile/${encodeURIComponent(profile.canonicalUsername)}`,
    imageUrl: profile.imageUrl,
  })
}

export default function ProfilePublicLayout({ children }: ProfilePublicLayoutProps) {
  return <>{children}</>
}
