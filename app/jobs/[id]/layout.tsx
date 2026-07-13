import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import {
  buildJobPreviewMetadata,
  buildUnavailablePreviewMetadata,
} from '@/lib/seo/public-preview-metadata'
import { getPublicJobPreview } from '@/lib/seo/public-preview-readers'

interface JobPublicLayoutProps {
  children: ReactNode
}

interface JobPublicMetadataProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: JobPublicMetadataProps): Promise<Metadata> {
  const { id } = await params
  const path = `/jobs/${encodeURIComponent(id)}`
  const job = await getPublicJobPreview(id)

  if (!job) return buildUnavailablePreviewMetadata(path)

  return buildJobPreviewMetadata({
    title: job.title,
    employerName: job.employerName,
    description: job.description,
    location: job.location,
    path,
  })
}

export default function JobPublicLayout({ children }: JobPublicLayoutProps) {
  return <>{children}</>
}
