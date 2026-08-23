/**
 * GET /api/world/places/search?q=<query>&countryCode=US
 *
 * Canonical place search for the CanonicalPlacePicker: geo_places text
 * candidates + exact alias matches, merged, deduped, bounded, stably sorted.
 * Preview-flag gated. Returns no coordinates (picker needs identity only).
 */
import { NextRequest, NextResponse } from "next/server"

import { SupabaseGeoRepository } from "@/lib/geo/repository"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export interface PlaceSearchItem {
  id: string
  canonicalPath: string
  name: string
  displayName: string | null
  placeType: string
  countryCode: string | null
  matchedVia: "name" | "alias"
}

const PLACE_TYPE_ORDER: Record<string, number> = {
  city: 0,
  neighborhood: 1,
  state_province: 2,
  region: 3,
  cultural_region: 3,
  country: 4,
  landmark: 5,
}

function rank(item: PlaceSearchItem, query: string): number {
  const name = item.name.toLowerCase()
  const q = query.toLowerCase()
  let score = 100
  if (name === q) score -= 50
  else if (name.startsWith(q)) score -= 25
  score += PLACE_TYPE_ORDER[item.placeType] ?? 9
  return score + (item.matchedVia === "name" ? 0 : 1)
}

export async function GET(request: NextRequest) {
  if (process.env.WORLD_MUSIC_SEED_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const url = new URL(request.url)
  const query = (url.searchParams.get("q") ?? "").trim()
  const countryCode = url.searchParams.get("countryCode")?.toUpperCase()
  if (query.length < 2 || query.length > 120) {
    return NextResponse.json({ schemaVersion: "world-place-search-v1.0", items: [] })
  }

  const supabase = await createClient()
  const repo = new SupabaseGeoRepository(supabase)
  const opts = { includeDraft: false }

  const [byName, byAlias] = await Promise.all([
    repo.findTextCandidates(query, opts),
    repo.findExactAlias(query, opts),
  ])

  const merged = new Map<string, PlaceSearchItem>()
  const add = (
    row: { id: string; canonical_path: string; name: string; display_name: string | null; place_type: string; country_code: string | null },
    via: "name" | "alias",
  ) => {
    if (!merged.has(row.id)) {
      merged.set(row.id, {
        id: row.id,
        canonicalPath: row.canonical_path,
        name: row.name,
        displayName: row.display_name,
        placeType: row.place_type,
        countryCode: row.country_code,
        matchedVia: via,
      })
    }
  }
  for (const row of byName) add(row as never, "name")
  for (const row of byAlias) if (!merged.has(row.id)) add(row as never, "alias")

  // Stable, bounded ordering: type tier, then name-match quality, then name.
  const items = [...merged.values()]
    .sort((a, b) => rank(a, query) - rank(b, query) || a.name.localeCompare(b.name))
    .slice(0, 10)

  void countryCode // reserved for server-side country boosting post-telemetry
  return NextResponse.json({ schemaVersion: "world-place-search-v1.0", items })
}
