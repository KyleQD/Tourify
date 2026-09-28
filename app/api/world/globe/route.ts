/**
 * GET /api/world/globe
 *
 * Renderer-neutral marker index for the Discover globe.
 * Gated by WORLD_MUSIC_SEED_PREVIEW_ENABLED (404 when absent) — the globe is
 * a Phase 4 surface and stays unreachable until the preview gate is on.
 */
import { NextResponse } from "next/server"

import { buildGlobeIndex } from "@/lib/world/globe/build-globe-index"

export const dynamic = "force-dynamic"

export async function GET() {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const index = buildGlobeIndex()
  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  })
}
