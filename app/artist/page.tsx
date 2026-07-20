import { Suspense } from 'react'
import { ArtistHomeFeed } from '@/components/artist/artist-home-feed'
import ArtistLoading from './loading'

export default function ArtistHomePage() {
  return (
    <Suspense fallback={<ArtistLoading />}>
      <ArtistHomeFeed />
    </Suspense>
  )
}
