import { Suspense } from 'react'
import { ArtistPageClient } from '@/components/dashboard/artist-page-client'
import ArtistLoading from '../loading'

export default function ArtistOverviewPage() {
  return (
    <Suspense fallback={<ArtistLoading />}>
      <ArtistPageClient />
    </Suspense>
  )
}
