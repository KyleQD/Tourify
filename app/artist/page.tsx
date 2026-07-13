import { Suspense } from 'react'
import { ArtistPageClient } from '@/components/dashboard/artist-page-client'
import ArtistLoading from './loading'

export default function ArtistDashboardPage() {
  return (
    <Suspense fallback={<ArtistLoading />}>
      <ArtistPageClient />
    </Suspense>
  )
}
