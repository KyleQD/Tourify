import { WorldEntryLink } from "@/components/world/globe/WorldEntryLink"
import { DiscoverPageClient } from "@/components/discover/discover-page-client"
import { getArtistPublicProfilePath } from "@/lib/utils/public-profile-routes"
import type { DiscoverMusicTrack } from "@/lib/discover/types"

/**
 * Canonical artist link for discover music cards: prefer the public username
 * handle, fall back to the display name. Cards never link by a raw UUID alone.
 */
export function discoverMusicCardArtistPath(track: DiscoverMusicTrack): string | null {
  return getArtistPublicProfilePath(track.artist_username || track.artist_name)
}

export default function DiscoverPage() {
  return (
    <>
      <WorldEntryLink />
      <DiscoverPageClient />
    </>
  )
}
