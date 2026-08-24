/**
 * Radio Browser staging adapter (PILOT_INGESTION_SPEC_V0_1 §3/§8).
 * Station metadata first; UUIDs preserved; stream URLs are NEVER persisted
 * here (world_radio_streams requires separate ingestion-policy review) —
 * only hostname + url hash travel inside the private candidate payload.
 */
import { RateLimiter, fetchJson, sha256json } from "./shared"

const MIRRORS = [
  "de1.api.radio-browser.info",
  "de2.api.radio-browser.info",
  "fi1.api.radio-browser.info",
]
const limiter = new RateLimiter(200)

export interface RbStation {
  stationuuid: string
  name: string
  country?: string
  countrycode?: string
  state?: string
  languagecodes?: string | null
  tags?: string | null
  homepage?: string | null
  url_resolved?: string | null
  codec?: string | null
  bitrate?: number | null
  lastcheckok?: number
}

let mirrorIndex = 0

export async function rbGet<T>(path: string): Promise<T> {
  await limiter.wait()
  let lastError: unknown = null
  for (let attempt = 0; attempt < MIRRORS.length; attempt += 1) {
    const host = MIRRORS[(mirrorIndex + attempt) % MIRRORS.length]
    try {
      return await fetchJson<T>(`https://${host}${path}`)
    } catch (error) {
      lastError = error
    }
  }
  mirrorIndex = (mirrorIndex + 1) % MIRRORS.length
  throw lastError ?? new Error("radio browser mirrors exhausted")
}

export function normalizeStation(station: RbStation) {
  const host = station.url_resolved ? new URL(station.url_resolved).host : null
  return {
    stationuuid: station.stationuuid,
    name: station.name?.trim() || "(unnamed station)",
    country: station.country ?? null,
    countryCode: station.countrycode ?? null,
    state: station.state?.trim() || null,
    languagecodes: (station.languagecodes ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    tags: (station.tags ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 12),
    homepage: station.homepage || null,
    // Operational locator stays out of staged payloads entirely.
    streamHost: host,
    streamUrlHash: station.url_resolved ? sha256json({ u: station.url_resolved }) : null,
    codec: station.codec ?? null,
    bitrateKbps: station.bitrate ?? null,
    directoryLastCheckOk: station.lastcheckok === 1,
  }
}

export function stationPayloadHash(station: RbStation): string {
  return sha256json(normalizeStation(station))
}
