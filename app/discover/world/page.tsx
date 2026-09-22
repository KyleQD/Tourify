/**
 * /discover/world — Phase 4 interactive globe.
 *
 * Gated by WORLD_MUSIC_SEED_PREVIEW_ENABLED (404 when absent), same gate as
 * the pilot explorer: the globe reads the promoted draft corpus until the
 * public rollout flag (`world_music_public_globe_enabled`) is approved.
 */
import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WorldGlobeExperience } from "@/components/world/globe/GlobeExperience"
import { buildGlobeIndex } from "@/lib/world/globe/build-globe-index"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "World of Music — Globe",
  description:
    "Spin the planet and drop into the sound of a city: artists, milestones, recordings, instruments, and radio.",
}

export default function DiscoverWorldPage() {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") notFound()

  const index = buildGlobeIndex()
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Explore the planet&rsquo;s sound</h1>
        <p className="mt-1 text-sm text-slate-400">
          Five cities. One rotating planet. Every glowing point opens a source-backed story.
        </p>
      </header>
      <WorldGlobeExperience places={index.places} />
    </main>
  )
}
