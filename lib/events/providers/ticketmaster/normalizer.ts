/**
 * lib/events/providers/ticketmaster/normalizer.ts
 *
 * Ticketmaster → NormalizedExternalEvent mapping. Pure functions, fully
 * fixture-testable.
 */

import { normalizeTitleKey } from "../schemas"
import type {
  NormalizedExternalEvent,
  NormalizedEventStatus,
  NormalizedTicketOffer,
} from "../types"
import type { TmEvent } from "./schema"

function mapStatus(code: string | undefined): NormalizedEventStatus {
  switch (code) {
    case "onsale":
    case "offsale":
      return "scheduled"
    case "cancelled":
      return "cancelled"
    case "postponed":
      return "postponed"
    case "rescheduled":
      return "rescheduled"
    default:
      return "unknown"
  }
}

function mapOfferStatus(code: string | undefined): NormalizedTicketOffer["status"] {
  switch (code) {
    case "onsale":
      return "onsale"
    case "offsale":
      return "offsale"
    case "cancelled":
      return "cancelled"
    default:
      return "unknown"
  }
}

function parseCoord(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Build the normalized event. `rawPayloadHash` and `fetchedAt` are supplied
 * by the caller (adapter), keeping this function deterministic for tests.
 */
export function normalizeTicketmasterEvent(
  raw: TmEvent,
  meta: { rawPayloadHash: string; fetchedAt: string },
): NormalizedExternalEvent {
  const venue = raw._embedded?.venues?.[0]
  const price = raw.priceRanges?.[0]
  const title = raw.name?.trim() || "Untitled Event"

  const ticketOffers: NormalizedTicketOffer[] = []
  if (raw.url) {
    ticketOffers.push({
      label: "Tickets on Ticketmaster",
      url: raw.url,
      currency: price?.currency ?? null,
      minPrice: price?.min ?? null,
      maxPrice: price?.max ?? null,
      saleStartAt: raw.sales?.public?.startDateTime ?? null,
      saleEndAt: raw.sales?.public?.endDateTime ?? null,
      status: mapOfferStatus(raw.dates?.status?.code),
      isPrimary: true,
    })
  }

  return {
    provider: "ticketmaster",
    providerEventId: raw.id,
    sourceUrl: raw.url ?? null,
    title,
    normalizedTitle: normalizeTitleKey(title),
    description: raw.description ?? raw.info ?? null,
    status: mapStatus(raw.dates?.status?.code),
    startAt: raw.dates?.start?.dateTime ?? null,
    endAt: raw.dates?.end?.dateTime ?? null,
    localDate: raw.dates?.start?.localDate ?? null,
    localTime: raw.dates?.start?.localTime ?? null,
    timezone: raw.dates?.timezone ?? venue?.timezone ?? null,
    venue: venue
      ? {
          providerVenueId: venue.id ?? null,
          name: venue.name ?? null,
          address: venue.address?.line1 ?? null,
          city: venue.city?.name ?? null,
          stateCode: venue.state?.stateCode ?? null,
          countryCode: venue.country?.countryCode ?? null,
          postalCode: venue.postalCode ?? null,
          longitude: parseCoord(venue.location?.longitude),
          latitude: parseCoord(venue.location?.latitude),
          timezone: venue.timezone ?? null,
        }
      : null,
    performers: (raw._embedded?.attractions ?? [])
      .filter((a) => a.name)
      .map((a, index) => ({
        providerPerformerId: a.id ?? null,
        name: a.name as string,
        isHeadliner: index === 0,
      })),
    classifications: (raw.classifications ?? []).flatMap((c) => {
      const out: NormalizedExternalEvent["classifications"] = []
      if (c.segment?.name) out.push({ kind: "segment", key: c.segment.name.toLowerCase(), label: c.segment.name })
      if (c.genre?.name) out.push({ kind: "genre", key: c.genre.name.toLowerCase(), label: c.genre.name })
      if (c.subGenre?.name) out.push({ kind: "subGenre", key: c.subGenre.name.toLowerCase(), label: c.subGenre.name })
      if (c.type?.name) out.push({ kind: "type", key: c.type.name.toLowerCase(), label: c.type.name })
      if (c.subType?.name) out.push({ kind: "subType", key: c.subType.name.toLowerCase(), label: c.subType.name })
      return out
    }),
    images: (raw.images ?? []).map((img) => ({
      url: img.url,
      width: img.width ?? null,
      height: img.height ?? null,
      ratio: img.ratio ?? null,
      isFallback: img.fallback ?? false,
    })),
    ticketOffers,
    providerUpdatedAt: null,
    rawPayloadHash: meta.rawPayloadHash,
    fetchedAt: meta.fetchedAt,
  }
}
