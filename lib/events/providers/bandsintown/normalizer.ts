/**
 * lib/events/providers/bandsintown/normalizer.ts
 *
 * Bandsintown → NormalizedExternalEvent. Artist name qualifiers are
 * stripped and Unicode normalized per the integration spec.
 */

import { normalizeTitleKey } from "../schemas"
import type { NormalizedExternalEvent, NormalizedTicketOffer } from "../types"
import type { BitEvent } from "./schema"

/** Remove misleading artist-name qualifiers ("DJ", "The", feat. segments). */
export function normalizeArtistName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\s*\((feat\.?|featuring)[^)]*\)/gi, "")
    .replace(/\s*(feat\.?|featuring)\s+.*$/i, "")
    .replace(/^dj\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseCoord(value: string | number | undefined): number | null {
  const n = typeof value === "string" ? Number(value) : value
  return typeof n === "number" && Number.isFinite(n) ? n : null
}

function mapOfferStatus(status: string | undefined): NormalizedTicketOffer["status"] {
  switch ((status ?? "").toLowerCase()) {
    case "available":
      return "onsale"
    case "sold out":
      return "offsale"
    default:
      return "unknown"
  }
}

export function normalizeBandsintownEvent(
  raw: BitEvent,
  artistDisplayName: string,
  meta: { rawPayloadHash: string; fetchedAt: string },
): NormalizedExternalEvent {
  const artistName = normalizeArtistName(artistDisplayName)
  const datePart = raw.datetime?.slice(0, 10) ?? null
  const timePart = raw.datetime?.includes("T") ? raw.datetime.slice(11, 19) : null
  const title = raw.title?.trim() || `${artistName} Live`

  return {
    provider: "bandsintown",
    providerEventId: String(raw.id),
    sourceUrl: raw.url ?? null,
    title,
    normalizedTitle: normalizeTitleKey(title),
    description: raw.description ?? null,
    status: "scheduled",
    startAt: raw.datetime ?? null,
    endAt: null,
    localDate: datePart,
    localTime: timePart,
    timezone: null,
    venue: raw.venue
      ? {
          providerVenueId: null,
          name: raw.venue.name ?? null,
          address: null,
          city: raw.venue.city ?? null,
          stateCode: raw.venue.region ?? null,
          countryCode: raw.venue.country ?? null,
          postalCode: null,
          longitude: parseCoord(raw.venue.longitude),
          latitude: parseCoord(raw.venue.latitude),
          timezone: null,
        }
      : null,
    performers: (raw.lineup?.length ? raw.lineup : [artistDisplayName]).map((name, index) => ({
      providerPerformerId: null,
      name: normalizeArtistName(name),
      isHeadliner: index === 0,
    })),
    classifications: [],
    images: [],
    ticketOffers: (raw.offers ?? [])
      .filter((o) => o.url)
      .map((o) => ({
        label: o.type ?? "Tickets",
        url: o.url as string,
        currency: null,
        minPrice: null,
        maxPrice: null,
        saleStartAt: raw.on_sale_datetime ?? null,
        saleEndAt: null,
        status: mapOfferStatus(o.status),
        isPrimary: false,
      })),
    providerUpdatedAt: null,
    rawPayloadHash: meta.rawPayloadHash,
    fetchedAt: meta.fetchedAt,
  }
}
