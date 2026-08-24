/**
 * P12 — Discover with view state (feed | world).
 * Feed mode: existing DiscoverPageClient unchanged.
 * World mode: holographic globe + place panel inline.
 * Jukebox playback persists across switches (global provider).
 */
import { DiscoverPageClient } from "@/components/discover/discover-page-client"
import { buildGlobeIndex } from "@/lib/world/globe/build-globe-index"

export const dynamic = "force-dynamic"

export default function DiscoverPage() {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED === "true") {
    const index = buildGlobeIndex()
    return (
      <DiscoverViewToggle places={index.places}>
        <DiscoverPageClient />
      </DiscoverViewToggle>
    )
  }
  return <DiscoverPageClient />
}

import { DiscoverViewToggle } from "@/components/discover/discover-view-toggle"
