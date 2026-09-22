/**
 * Live-DB integration tests for SupabaseGeoRepository + resolvePlace.
 *
 * Runs ONLY when explicitly requested:
 *   GEO_INTEGRATION=1 WORLD_DB_URL=http://127.0.0.1:54321 \
 *   WORLD_SERVICE_KEY=<local service token> npx vitest run __tests__/geo/integration.local.test.ts
 *
 * Targets the disposable local Supabase stack (project tourify-beta) — never
 * Tourify Demo. Seeds uniquely-suffixed fixture rows and removes them after.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createClient } from "@supabase/supabase-js"

import { SupabaseGeoRepository } from "@/lib/geo/repository"
import { resolvePlace } from "@/lib/geo/resolver"
import type { GeoPlaceRow } from "@/lib/geo/types"

const RUN = `g1it${Date.now().toString(36)}`
const enabled =
  process.env.GEO_INTEGRATION === "1" &&
  !!process.env.WORLD_DB_URL &&
  !!process.env.WORLD_SERVICE_KEY

describe.skipIf(!enabled)("geo resolver live integration", () => {
  let client: ReturnType<typeof createClient>
  let repo: SupabaseGeoRepository
  const placeIds: string[] = []
  const cityId = { current: "" as string }

  async function insertPlace(row: {
    slug: string
    canonical_path: string
    name: string
    place_type: string
    country_code?: string | null
    admin1_code?: string | null
    publication_status?: string
  }): Promise<GeoPlaceRow> {
    const { data, error } = await client
      .from("geo_places")
      .insert({
        slug: row.slug,
        canonical_path: row.canonical_path,
        name: row.name,
        place_type: row.place_type,
        country_code: row.country_code ?? null,
        admin1_code: row.admin1_code ?? null,
        publication_status: row.publication_status ?? "published",
      })
      .select("*")
      .single()
    expect(error).toBeNull()
    placeIds.push((data as GeoPlaceRow).id)
    return data as GeoPlaceRow
  }

  beforeAll(async () => {
    client = createClient(process.env.WORLD_DB_URL!, process.env.WORLD_SERVICE_KEY!, {
      auth: { persistSession: false },
    })
    repo = new SupabaseGeoRepository(client)

    await insertPlace({ slug: `${RUN}-us`, canonical_path: `${RUN}/us`, name: `${RUN} United States`, place_type: "country", country_code: "US" })
    await insertPlace({ slug: `${RUN}-tx`, canonical_path: `${RUN}/us/tx`, name: `${RUN} Texas`, place_type: "state_province", country_code: "US" })
    const city = await insertPlace({
      slug: `${RUN}-austin`, canonical_path: `${RUN}/us/tx/austin`,
      name: `${RUN} Austin`, place_type: "city", country_code: "US", admin1_code: "TX",
    })
    cityId.current = city.id
    // Ambiguity fixture: same display name in two different states.
    await insertPlace({ slug: `${RUN}-springfield-il`, canonical_path: `${RUN}/us/il/springfield`, name: `${RUN} Springfield`, place_type: "city", country_code: "US", admin1_code: "IL" })
    await insertPlace({ slug: `${RUN}-springfield-mo`, canonical_path: `${RUN}/us/mo/springfield`, name: `${RUN} Springfield`, place_type: "city", country_code: "US", admin1_code: "MO" })
    // Draft fixture must never resolve publicly.
    await insertPlace({ slug: `${RUN}-atlantis`, canonical_path: `${RUN}/us/tx/atlantis`, name: `${RUN} Atlantis`, place_type: "city", country_code: "US", publication_status: "draft" })

    const { error: aliasError } = await client.from("geo_place_aliases").insert({
      place_id: city.id,
      alias: `${RUN} music city`,
      alias_type: "alternate",
    })
    expect(aliasError).toBeNull()

    const { error: refError } = await client.from("geo_external_references").insert({
      place_id: city.id,
      provider: "wikidata-test",
      external_type: "place",
      external_id: `Q${RUN}`,
    })
    expect(refError).toBeNull()
  }, 30000)

  afterAll(async () => {
    if (!enabled || placeIds.length === 0) return
    await client.from("geo_place_aliases").delete().in("place_id", placeIds)
    await client.from("geo_external_references").delete().in("place_id", placeIds)
    await client.from("geo_places").delete().in("id", placeIds)
  }, 30000)

  it("resolves an exact external reference end-to-end", async () => {
    const result = await resolvePlace(
      { externalReferences: [{ provider: "wikidata-test", externalId: `Q${RUN}` }] },
      repo,
    )
    expect(result.matchMethod).toBe("external_id")
    expect(result.placeId).toBe(cityId.current)
    expect(result.needsReview).toBe(false)
  })

  it("resolves exact hierarchy with country context", async () => {
    const ok = await resolvePlace(
      { hierarchy: { city: `${RUN} Austin`, countryCode: "US" } },
      repo,
    )
    expect(ok.matchMethod).toBe("hierarchy_exact")
    expect(ok.placeId).toBe(cityId.current)
  })

  it("keeps same-name cities ambiguous without state context", async () => {
    const ambiguous = await resolvePlace(
      { hierarchy: { city: `${RUN} Springfield` } },
      repo,
    )
    expect(ambiguous.placeId).toBeNull()
    expect(ambiguous.candidates.length).toBe(2)
    expect(ambiguous.needsReview).toBe(true)
  })

  it("resolves a historical alias through the normalized_alias column", async () => {
    const result = await resolvePlace(
      { freeText: `${RUN} MUSIC CITY` }, // case-insensitive via normalization
      repo,
    )
    expect(result.matchMethod).toBe("alias_exact")
    expect(result.placeId).toBe(cityId.current)
  })

  it("never leaks draft places through public resolution", async () => {
    const rows = await repo.findTextCandidates(`${RUN} Atlantis`)
    expect(rows.length).toBe(0)
    const result = await resolvePlace({ freeText: `${RUN} Atlantis` }, repo)
    expect(result.placeId).toBeNull()
  })

  it("leaves coordinate-only input unresolved with diagnostics", async () => {
    const result = await resolvePlace(
      { coordinates: { latitude: 30.2672, longitude: -97.7431 } },
      repo,
    )
    expect(result.matchMethod).toBe("unresolved")
    expect(result.needsReview).toBe(true)
  })
})
