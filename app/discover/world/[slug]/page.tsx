/**
 * P11 — /discover/world/[slug]: conventional non-globe regional page.
 * This IS the accessible route (P11-T12) — Detroit remains fully usable
 * without the globe. Gated by the preview flag like all World surfaces.
 */
import { notFound } from "next/navigation"

import { WorldPlacePageV2 } from "@/components/world/place-v2/WorldPlacePageV2"
import { buildGlobeIndex } from "@/lib/world/globe/build-globe-index"
import { composeWorldPlaceV2 } from "@/lib/world/place-api-v2/compose"

export const dynamic = "force-dynamic"

export default async function DiscoverWorldPlacePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") notFound()

  const { slug } = await params
  const index = buildGlobeIndex()
  const place = index.places.find((p) => p.key === slug)
  if (!place) notFound()

  // Compose a bounded v2 response from the promoted corpus.
  const response = composeWorldPlaceV2({
    identity: {
      key: place.key,
      canonicalPath: place.canonicalPath,
      name: place.name,
      countryName: place.countryName,
      center: place.center,
    },
    musicalIdentity: place.musicalIdentity,
    curatedSections: {},
    sourceRefs: [],
    provenance: {},
  })

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4">
      <WorldPlacePageV2 data={response} />
    </main>
  )
}
