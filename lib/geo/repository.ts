import type {
  GeoCoordinates,
  GeoExternalReferenceInput,
  GeoHierarchyInput,
  GeoNearbyCandidate,
  GeoPlaceRow,
  ResolveQueryOptions,
} from "./types"

/**
 * Repository contract (GEO_RESOLVER_CONTRACT_V0_1 section 7).
 * All access is server-side; public clients consume resolved APIs instead of
 * reproducing place-matching logic.
 */
export interface GeoRepository {
  findByExternalReference(
    ref: GeoExternalReferenceInput,
    opts?: { includeDraft?: boolean }
  ): Promise<GeoPlaceRow | null>
  findHierarchyCandidates(
    input: GeoHierarchyInput,
    opts?: ResolveQueryOptions
  ): Promise<GeoPlaceRow[]>
  findExactAlias(alias: string, opts?: ResolveQueryOptions): Promise<GeoPlaceRow[]>
  findNearbyCandidates(
    coordinates: GeoCoordinates,
    opts?: ResolveQueryOptions & { radiusMeters?: number }
  ): Promise<GeoNearbyCandidate[]>
  findTextCandidates(text: string, opts?: ResolveQueryOptions): Promise<GeoPlaceRow[]>
}

type RawRow = Record<string, unknown>

/**
 * Structural subset of the Supabase/PostgREST client. The real client
 * satisfies this at runtime; keeping it structural avoids coupling shared geo
 * infrastructure to curated DB types (same pattern as lib/world/history).
 */
export interface GeoPostgrestClientLike {
  from(table: string): any
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function asPlace(row: RawRow, embedded?: unknown): GeoPlaceRow {
  const source =
    embedded && typeof embedded === "object" && !Array.isArray(embedded)
      ? (embedded as RawRow)
      : row
  const centerSource = source.center ?? row.center
  let center: GeoPlaceRow["center"] = null
  if (
    centerSource &&
    typeof centerSource === "object" &&
    "latitude" in (centerSource as RawRow) &&
    "longitude" in (centerSource as RawRow)
  ) {
    center = {
      latitude: Number((centerSource as RawRow).latitude),
      longitude: Number((centerSource as RawRow).longitude),
    }
  }
  return {
    id: String(source.id),
    slug: String(source.slug ?? ""),
    canonical_path: String(source.canonical_path ?? ""),
    name: String(source.name ?? ""),
    display_name: asString(source.display_name),
    place_type: String(source.place_type ?? ""),
    parent_place_id: asString(source.parent_place_id),
    country_code: asString(source.country_code),
    admin1_code: asString(source.admin1_code),
    timezone: asString(source.timezone),
    publication_status: String(source.publication_status ?? "draft"),
    center,
  }
}

export class SupabaseGeoRepository implements GeoRepository {
  constructor(private readonly client: GeoPostgrestClientLike) {}

  private visibilityFilter(builder: any, opts?: { includeDraft?: boolean }): any {
    // Public resolution sees published rows only. Draft access is a
    // deliberate server/editorial decision expressed through includeDraft.
    if (!opts?.includeDraft) {
      return builder.eq("publication_status", "published")
    }
    return builder.in("publication_status", ["published", "draft"])
  }

  async findByExternalReference(
    ref: GeoExternalReferenceInput,
    opts?: { includeDraft?: boolean }
  ): Promise<GeoPlaceRow | null> {
    const builder = this.client
      .from("geo_external_references")
      .select("place:geo_places(*)")
      .eq("provider", ref.provider)
      .eq("external_id", ref.externalId)
      .eq("external_type", ref.externalType ?? "place")
      .limit(2)
    const { data, error } = await this.visibilityFilter(builder, opts)
    if (error || !data || data.length !== 1) return null
    return asPlace({}, data[0]?.place)
  }

  async findHierarchyCandidates(
    input: GeoHierarchyInput,
    opts?: ResolveQueryOptions
  ): Promise<GeoPlaceRow[]> {
    const names = [input.neighborhood, input.city, input.admin1, input.country]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0)
    if (names.length === 0) return []
    const countryCode =
      typeof input.countryCode === "string" ? input.countryCode.toUpperCase() : null
    const builder = this.client.from("geo_places").select("*").in("name", names)
    const filtered = countryCode ? builder.eq("country_code", countryCode) : builder
    const { data, error } = await this.visibilityFilter(filtered.limit(50), opts)
    if (error || !Array.isArray(data)) return []
    return data.map((row: RawRow) => asPlace(row))
  }

  async findExactAlias(alias: string, opts?: ResolveQueryOptions): Promise<GeoPlaceRow[]> {
    const normalized = alias.trim().toLowerCase()
    if (!normalized) return []
    // normalized_alias is a generated lower(btrim(alias)) column.
    const { data, error } = await this.visibilityFilter(
      this.client
        .from("geo_place_aliases")
        .select("place:geo_places(*)")
        .eq("normalized_alias", normalized)
        .limit(10),
      opts
    )
    if (error || !Array.isArray(data)) return []
    return data.map((row: RawRow) => asPlace({}, (row as RawRow).place))
  }

  /**
   * v0.1 schema exposes `center` geography with a GiST index but no spatial
   * RPC callable through PostgREST, so distance ranking is not available yet.
   * Returns empty results; callers treat coordinate-only inputs per the
   * conservative policy in GEO_RESOLVER_CONTRACT_V0_1 sections 5 and 6
   * (point-only never proves containment). A future `geo_places_nearby` RPC
   * can fill this method without changing the contract or the resolver.
   */
  async findNearbyCandidates(): Promise<GeoNearbyCandidate[]> {
    return []
  }

  async findTextCandidates(text: string, opts?: ResolveQueryOptions): Promise<GeoPlaceRow[]> {
    const normalized = text.replace(/\s+/g, " ").trim()
    if (!normalized) return []
    const { data, error } = await this.visibilityFilter(
      this.client.from("geo_places").select("*").ilike("name", normalized).limit(20),
      opts
    )
    if (error || !Array.isArray(data)) return []
    return data.map((row: RawRow) => asPlace(row))
  }
}
