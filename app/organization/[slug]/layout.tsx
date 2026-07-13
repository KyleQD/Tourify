import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { getPublicOrganizationProfileDTO } from '@/lib/public-organization/get-public-organization-profile'
import {
  buildOrganizationPreviewMetadata,
  buildUnavailablePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'

interface OrganizationPublicLayoutProps {
  children: ReactNode
}

interface OrganizationPublicMetadataProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: OrganizationPublicMetadataProps): Promise<Metadata> {
  const { slug } = await params
  const fallbackPath = `/organization/${encodeURIComponent(slug)}`
  const dto = await getPublicOrganizationProfileDTO({ slug })

  if (!dto) return buildUnavailablePreviewMetadata(fallbackPath)

  return buildOrganizationPreviewMetadata({
    name: dto.name,
    subtypeLabel: dto.subtypeLabel,
    description: dto.description,
    specialties: dto.specialties,
    path: `/organization/${encodeURIComponent(dto.slug || slug)}`,
    imageUrl: dto.bannerUrl || dto.avatarUrl,
  })
}

export default function OrganizationPublicLayout({
  children,
}: OrganizationPublicLayoutProps) {
  return <>{children}</>
}
