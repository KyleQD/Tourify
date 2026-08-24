/**
 * Pilot ingestion runner (PILOT_INGESTION_SPEC_V0_1).
 *
 * Usage:
 *   npx tsx scripts/world/ingestion/run-pilot.ts --source musicbrainz --pilot detroit --max-artists 15
 *   npx tsx scripts/world/ingestion/run-pilot.ts --source radio-browser --pilot detroit --max-stations 25
 *
 * Writes ONLY to private staging (world_ingestion_runs / world_ingestion_candidates)
 * plus draft world_radio_stations rows. Nothing publishes; no streams are stored.
 */
import { createHash } from "node:crypto"
import { createClient } from "@supabase/supabase-js"

import {
  browseAreaArtistsPage,
  findCityArea,
  normalizeArtist,
} from "./musicbrainz"
import { normalizeStation, rbGet, stationPayloadHash, type RbStation } from "./radio-browser"
import { slugify } from "./shared"

type Client = ReturnType<typeof createClient>

const PILOT_GEO: Record<string, { countryName: string; countryCode: string; cityName?: string; stateName?: string; paths: string[] }> = {
  detroit: {
    countryName: "United States",
    countryCode: "US",
    cityName: "Detroit",
    stateName: "Michigan",
        paths: ["us", "us/mi", "us/mi/detroit"],
  },
  kingston: {
    countryName: "Jamaica",
    countryCode: "JM",
    cityName: "Kingston",
    paths: ["jm", "jm/kingston"],
  },
  lagos: {
    countryName: "Nigeria",
    countryCode: "NG",
    cityName: "Lagos",
    paths: ["ng", "ng/lagos"],
  },
  london: {
    countryName: "United Kingdom",
    countryCode: "GB",
    cityName: "London",
    // Seeded hierarchy is gb/eng/london (matches data/world/reference).
    paths: ["gb", "gb/eng", "gb/eng/london"],
  },
  tokyo: {
    countryName: "Japan",
    countryCode: "JP",
    cityName: "Tokyo",
    paths: ["jp", "jp/tokyo"],
  },
}

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : undefined
  }
  const source = get("--source")
  const pilot = get("--pilot") ?? "detroit"
  if (source !== "musicbrainz" && source !== "radio-browser") {
    throw new Error("usage: run-pilot.ts --source musicbrainz|radio-browser [--pilot detroit|kingston|lagos|london|tokyo] [--limit N]")
  }
  if (!Object.keys(PILOT_GEO).includes(pilot)) {
    throw new Error(`unknown pilot '${pilot}' — expected one of: ${Object.keys(PILOT_GEO).join(", ")}`)
  }
  return { source, pilot, limit: Number(get("--limit") ?? (source === "musicbrainz" ? 15 : 25)) }
}

async function ensureSource(client: Client, key: string, fields: {
  name: string
  source_type: string
  homepage_url?: string
  license_class: string
}) {
  const existing = await client
    .from("world_sources")
    .select("id")
    .eq("source_key", key)
    .maybeSingle()
  if (existing.data?.id) return existing.data.id as string
  const inserted = await client
    .from("world_sources")
    .insert({
      source_key: key,
      name: fields.name,
      source_type: fields.source_type,
      homepage_url: fields.homepage_url ?? null,
      license_class: fields.license_class,
      ingestion_permission: "metadata_only",
      media_reuse_permission: "restricted",
      commercial_use_permission: "unknown",
      review_status: "needs_review",
      metadata: { authority: "external_directory_or_registry", pilot: true },
    })
    .select("id")
    .single()
  if (inserted.error) throw inserted.error
  return inserted.data.id as string
}

async function startRun(client: Client, sourceId: string, adapterKey: string, correlation: string) {
  const { data, error } = await client
    .from("world_ingestion_runs")
    .insert({
      source_id: sourceId,
      adapter_key: adapterKey,
      status: "running",
      correlation_id: correlation,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single()
  if (error) throw error
  return data.id as string
}

// Constraint vocabulary: queued|running|succeeded|partial|failed|cancelled.
// Update failures are NEVER swallowed again (they silently left runs at
// 'running' during the first rehearsal).
async function finishRun(client: Client, runId: string, status: "succeeded" | "failed" | "partial", patch: Record<string, unknown>) {
  const { error } = await client
    .from("world_ingestion_runs")
    .update({ status, finished_at: new Date().toISOString(), ...patch })
    .eq("id", runId)
  if (error) throw new Error(`finishRun failed: ${error.message}`)
}

interface StageCounters {
  requests: number
  received: number
  created: number
  matchedExisting: number
  errors: number
  notes: string[]
}

async function upsertCandidate(
  client: Client,
  runId: string,
  sourceId: string,
  entityKind: string,
  externalRecordId: string,
  normalizedPayload: Record<string, unknown>,
  opts: { matchStatus: string; matchedKind?: string; matchedId?: string; confidence: number },
): Promise<{ created: boolean }> {
  const payloadHash = createHash("sha256")
    .update(JSON.stringify(normalizedPayload))
    .digest("hex")
  const existing = await client
    .from("world_ingestion_candidates")
    .select("id,payload_hash")
    .eq("source_id", sourceId)
    .eq("entity_kind", entityKind)
    .eq("external_record_id", externalRecordId)
    .maybeSingle()
  if (existing.data?.id) {
    const changed = existing.data.payload_hash !== payloadHash
    await client
      .from("world_ingestion_candidates")
      .update({
        normalized_payload: normalizedPayload,
        payload_hash: payloadHash,
        match_status: opts.matchStatus,
        matched_kind: opts.matchedKind ?? null,
        matched_id: opts.matchedId ?? null,
        run_id: runId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.data.id)
    return { created: false, changed }
  }
  const { error } = await client.from("world_ingestion_candidates").insert({
    run_id: runId,
    source_id: sourceId,
    entity_kind: entityKind,
    external_record_id: externalRecordId,
    normalized_payload: normalizedPayload,
    payload_hash: payloadHash,
    match_status: opts.matchStatus,
    matched_kind: opts.matchedKind ?? null,
    matched_id: opts.matchedId ?? null,
    review_status: "needs_review",
    confidence: opts.confidence,
    metadata: { pipeline: "raw->normalized->matched->candidate (spec §6)" },
  })
  if (error) throw error
  return { created: true, changed: true }
}

// ---------- MusicBrainz pilot ----------
async function runMusicBrainz(client: Client, pilot: string, limit: number) {
  const geo = PILOT_GEO[pilot]
  if (!geo?.cityName) throw new Error(`no MB pilot geography for ${pilot}`)
  const geoSourceId = await ensureSource(client, "musicbrainz_geo", {
    name: "MusicBrainz area identity (CC0 core)",
    source_type: "music_metadata",
    homepage_url: "https://musicbrainz.org",
    license_class: "cc0",
  })
  const artistSourceId = await ensureSource(client, "musicbrainz_artist_identity", {
    name: "MusicBrainz artist identity (CC0 core)",
    source_type: "music_metadata",
    homepage_url: "https://musicbrainz.org",
    license_class: "cc0",
  })

  const correlation = `mb-${pilot}-${Date.now()}`
  const runId = await startRun(client, artistSourceId, "musicbrainz", correlation)
  const counters: StageCounters = { requests: 0, received: 0, created: 0, matchedExisting: 0, errors: 0, notes: [] }

  try {
    // Area identity + exact-match to the seeded canonical place.
    counters.requests += 1
    const area = await findCityArea(
      geo.cityName!,
      [geo.stateName, geo.countryName].filter((n): n is string => typeof n === 'string' && n.length > 0),
      { countryCode: geo.countryCode },
    )
    if (!area) {
      // P15-T04 fail-closed: unresolved city identity becomes a recorded run
      // error + partial status, never a guessed match.
      counters.errors += 1
      counters.notes.push(`MB city area not found: ${geo.cityName}`)
      await finishRun(client, runId, "partial", {
        request_count: counters.requests,
        records_received: counters.received,
        candidates_created: counters.created,
        error_count: counters.errors,
        error_summary: { notes: [...counters.notes] },
      })
      console.log(
        `musicbrainz ${pilot}: PARTIAL (city area unresolved) requests=${counters.requests} created=${counters.created} errors=${counters.errors}`,
      )
      return
    }
    const placeRow = await client
      .from("geo_places")
      .select("id")
      .in("canonical_path", geo.paths)
      .order("canonical_path", { ascending: false })
      .limit(1)
      .maybeSingle()
    const placeResult = await upsertCandidate(
      client, runId, geoSourceId, "place", area.id,
      {
        mbid: area.id, name: area.name, type: area.type ?? null,
        canonicalPathTarget: geo.paths[geo.paths.length - 1],
      },
      { matchStatus: placeRow.data?.id ? "matched" : "new_candidate",
        matchedKind: placeRow.data?.id ? "geo_place" : null,
        matchedId: placeRow.data?.id ?? null, confidence: 0.95 },
    )
    if (placeResult.created) counters.created += 1
    else counters.matchedExisting += 1

    // Artist identities via area browse (bounded pages of 25).
    let offset = 0
    while (counters.received < limit) {
      counters.requests += 1
      const page = await browseAreaArtistsPage(area.id, Math.min(25, limit - counters.received), offset)
      if (page.artists.length === 0) break
      for (const artist of page.artists) {
        counters.received += 1
        try {
          const result = await upsertCandidate(
            client, runId, artistSourceId, "artist", artist.id,
            normalizeArtist(artist),
            { matchStatus: "new_candidate", confidence: 0.85 },
          )
          if (result.created) counters.created += 1; else counters.matchedExisting += 1
        } catch (error) {
          counters.errors += 1
          counters.notes.push(`artist ${artist.id}: ${(error as Error).message}`)
        }
        if (counters.received >= limit) break
      }
      offset += page.artists.length
      if (offset >= page.count) break
    }

    await finishRun(client, runId, counters.errors > 0 ? "partial" : "succeeded", {
      request_count: counters.requests,
      records_received: counters.received,
      candidates_created: counters.created,
      matched_existing: counters.matchedExisting,
      published_count: 0,
      error_count: counters.errors,
      error_summary: counters.notes.slice(0, 10).join(" | ") || null,
      cursor_state: { areaMbid: area.id, offset, note: "recordings intentionally not bulk-ingested (spec §7)" },
    })
  } catch (error) {
    try {
      await finishRun(client, runId, "failed", {
        error_count: counters.errors + 1,
        error_summary: (error as Error).message.slice(0, 500),
      })
    } catch { /* original error takes precedence */ }
    throw error
  }
  console.log(`musicbrainz ${pilot}: requests=${counters.requests} received=${counters.received} created=${counters.created} updated=${counters.matchedExisting} errors=${counters.errors}`)
}

// ---------- Radio Browser pilot ----------
async function runRadioBrowser(client: Client, pilot: string, limit: number) {
  const geo = PILOT_GEO[pilot]
  if (!geo) throw new Error(`no RB pilot geography for ${pilot}`)
  const rbSourceId = await ensureSource(client, "radio_browser_directory", {
    name: "Radio Browser community station directory",
    source_type: "radio_directory",
    homepage_url: "https://www.radio-browser.info",
    license_class: "unknown",
  })

  const correlation = `rb-${pilot}-${Date.now()}`
  const runId = await startRun(client, rbSourceId, "radio-browser", correlation)
  const counters: StageCounters = { requests: 0, received: 0, created: 0, matchedExisting: 0, errors: 0, notes: [] }
  let relationEdgesCreated = 0

  // Canonical places for candidate edges (state always; city when clearly referenced)
  const statePath = geo.paths[geo.paths.length - 2]
  const cityPath = geo.paths[geo.paths.length - 1]
  const { data: places } = await client
    .from("geo_places")
    .select("id,canonical_path,name")
    .in("canonical_path", geo.paths)
  const { data: servesType } = await client
    .from("world_relation_types")
    .select("id")
    .eq("domain", "radio_place")
    .eq("relation_key", "serves")
    .maybeSingle()

  try {
    counters.requests += 1
    const params = new URLSearchParams({
      countrycode: geo.countryCode,
      ...(geo.stateName ? { state: geo.stateName } : {}),
      hidebroken: "true",
      order: "name",
      reverse: "false",
      limit: String(limit),
    })
    const stations = await rbGet<RbStation[]>(`/json/stations/search?${params.toString()}`)

    for (const station of stations) {
      counters.received += 1
      try {
        const normalized = normalizeStation(station)
        const mentionsCity =
          geo.cityName &&
          `${station.name} ${station.tags ?? ""}`.toLowerCase().includes(geo.cityName.toLowerCase())

        // Station draft row (identity only; playback stays metadata_only/blocked-by-default).
        const slug = `${slugify(normalized.name)}-${normalized.stationuuid.slice(0, 8)}`
        const existingStation = await client
          .from("world_radio_stations")
          .select("id")
          .eq("directory_provider", "radio_browser")
          .eq("directory_external_id", normalized.stationuuid)
          .maybeSingle()
        let stationId: string
        if (existingStation.data?.id) {
          stationId = existingStation.data.id as string
          await client
            .from("world_radio_stations")
            .update({
              name: normalized.name,
              homepage_url: normalized.homepage,
              languages: normalized.languagecodes,
              tags: normalized.tags,
              metadata: {
                codec: normalized.codec,
                bitrate_kbps: normalized.bitrateKbps,
                directory_lastcheckok: normalized.directoryLastCheckOk,
                stream_host: normalized.streamHost,
                stream_url_hash: normalized.streamUrlHash,
              },
              last_metadata_check_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", stationId)
          counters.matchedExisting += 1
        } else {
          const insertedStation = await client
            .from("world_radio_stations")
            .insert({
              slug,
              name: normalized.name,
              homepage_url: normalized.homepage,
              directory_provider: "radio_browser",
              directory_external_id: normalized.stationuuid,
              languages: normalized.languagecodes,
              tags: normalized.tags,
              rights_status: "unknown",
              metadata: {
                codec: normalized.codec,
                bitrate_kbps: normalized.bitrateKbps,
                directory_lastcheckok: normalized.directoryLastCheckOk,
                stream_host: normalized.streamHost,
                stream_url_hash: normalized.streamUrlHash,
              },
            })
            .select("id")
            .single()
          if (insertedStation.error) throw insertedStation.error
          stationId = insertedStation.data.id as string
          counters.created += 1
        }

        // Candidate row mirrors the station lifecycle through staging.
        const cand = await upsertCandidate(
          client, runId, rbSourceId, "radio_station", normalized.stationuuid,
          { ...normalized, stationSlug: slug },
          { matchStatus: "matched", matchedKind: "world_radio_stations", matchedId: stationId, confidence: 0.9 },
        )
        if (cand.created) counters.created += 1

        // Candidate radio_place edge (draft/candidate; requires 'serves' vocabulary).
        const targetPath = mentionsCity ? cityPath : statePath
        const targetPlace = (places ?? []).find((row) => row.canonical_path === targetPath)
        if (servesType?.id && targetPlace) {
          const existingEdge = await client
            .from("world_radio_station_places")
            .select("id")
            .eq("station_id", stationId)
            .eq("place_id", targetPlace.id)
            .maybeSingle()
          if (!existingEdge.data?.id) {
            const edgeInsert = await client.from("world_radio_station_places").insert({
              station_id: stationId,
              place_id: targetPlace.id,
              relation_type_id: servesType.id,
              relation_domain: "radio_place",
              review_status: "candidate",
              publication_status: "draft",
            })
            if (edgeInsert.error) throw edgeInsert.error
            relationEdgesCreated += 1
          }
        } else if (!servesType?.id) {
          counters.notes.push("radio_place|serves relation type missing; edges deferred")
        }
      } catch (error) {
        counters.errors += 1
        counters.notes.push(`station ${station.stationuuid}: ${(error as Error).message}`)
      }
    }
    await finishRun(client, runId, counters.errors > 0 ? "partial" : "succeeded", {
      request_count: counters.requests,
      records_received: counters.received,
      candidates_created: counters.created,
      matched_existing: counters.matchedExisting,
      published_count: 0,
      error_count: counters.errors,
      error_summary: counters.notes.slice(0, 10).join(" | ") || null,
      cursor_state: {
        searchParams: params.toString(),
        relationEdgesCreated,
        note: "stream URLs intentionally not persisted (spec §8 stream handling)",
      },
    })
  } catch (error) {
    try {
      await finishRun(client, runId, "failed", {
        error_count: counters.errors + 1,
        error_summary: (error as Error).message.slice(0, 500),
      })
    } catch { /* original error takes precedence */ }
    throw error
  }
  console.log(`radio-browser ${pilot}: requests=${counters.requests} received=${counters.received} created=${counters.created} updated=${counters.matchedExisting} edges=${relationEdgesCreated} errors=${counters.errors}`)
}

async function main() {
  const { source, pilot, limit } = parseArgs()
  // P15-T07 — per-provider kill switches, fail-closed (see
  // lib/world/ingestion/operations.ts). WORLD_INGEST_KILLED stops everything.
  if (process.env.WORLD_INGEST_KILLED?.toLowerCase() === "true") {
    throw new Error("WORLD_INGEST_KILLED=true — global ingestion kill switch is engaged.")
  }
  const flagName = `WORLD_INGEST_${source.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase()}_ENABLED`
  if (process.env[flagName]?.toLowerCase() !== "true" && process.env.WORLD_INGEST_ALLOW_UNSAFE !== "true") {
    throw new Error(`${flagName}=true is required to run this provider (fail-closed by default).`)
  }
  const url = process.env.WORLD_DB_URL
  const key = process.env.WORLD_SERVICE_KEY
  if (!url || !key) throw new Error("WORLD_DB_URL and WORLD_SERVICE_KEY required (local isolated stack only)")
  const client = createClient(url, key, { auth: { persistSession: false } })
  if (source === "musicbrainz") await runMusicBrainz(client, pilot, limit)
  else await runRadioBrowser(client, pilot, limit)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
