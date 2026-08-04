/**
 * lib/events/providers/types.ts
 *
 * Canonical provider contracts for the Tourify event-discovery ecosystem.
 * Tourify owns the product model; providers contribute source records,
 * ticket offers, images and classifications. Nothing here is exposed to
 * the browser — provider clients and secrets are server-only.
 */

export const EVENT_PROVIDERS = [
  "ticketmaster",
  "bandsintown",
  "native",
] as const

/** `native` covers Tourify-owned rows (events, events_v2, artist_events). */
export type EventProvider = (typeof EVENT_PROVIDERS)[number]

export type NormalizedEventStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "rescheduled"
  | "unknown"

export interface NormalizedVenue {
  providerVenueId: string | null
  name: string | null
  address: string | null
  city: string | null
  stateCode: string | null
  countryCode: string | null
  postalCode: string | null
  /** WGS84 longitude. POINT(longitude latitude) order — never reversed. */
  longitude: number | null
  /** WGS84 latitude. */
  latitude: number | null
  timezone: string | null
}

export interface NormalizedPerformer {
  providerPerformerId: string | null
  name: string
  isHeadliner: boolean
}

export interface NormalizedClassification {
  kind: "segment" | "genre" | "subGenre" | "type" | "subType"
  key: string
  label: string | null
}

export interface NormalizedImage {
  url: string
  width: number | null
  height: number | null
  ratio: string | null
  isFallback: boolean
}

export interface NormalizedTicketOffer {
  label: string | null
  url: string
  currency: string | null
  minPrice: number | null
  maxPrice: number | null
  saleStartAt: string | null
  saleEndAt: string | null
  status: "onsale" | "offsale" | "presale" | "cancelled" | "unknown"
  isPrimary: boolean
}

/**
 * Provider-neutral event contract (see 03_TARGET_ARCHITECTURE.md §2).
 * All timestamps are ISO 8601 strings. The canonical application must
 * not depend on provider raw JSON.
 */
export interface NormalizedExternalEvent {
  provider: EventProvider
  providerEventId: string
  sourceUrl: string | null
  title: string
  normalizedTitle: string
  description: string | null
  status: NormalizedEventStatus
  startAt: string | null
  endAt: string | null
  localDate: string | null
  localTime: string | null
  timezone: string | null
  venue: NormalizedVenue | null
  performers: NormalizedPerformer[]
  classifications: NormalizedClassification[]
  images: NormalizedImage[]
  ticketOffers: NormalizedTicketOffer[]
  providerUpdatedAt: string | null
  rawPayloadHash: string
  fetchedAt: string
}

export interface ProviderEventSearchInput {
  /** WGS84 */
  latitude?: number
  longitude?: number
  radiusMiles?: number
  keyword?: string
  city?: string
  stateCode?: string
  countryCode?: string
  startDateTime?: string
  endDateTime?: string
  classificationKeys?: string[]
  page?: number
  size?: number
}

export interface ProviderPage {
  events: NormalizedExternalEvent[]
  page: number
  totalPages: number | null
  totalElements: number | null
}

export interface ProviderArtistConnection {
  connectionId: string
  ownerType: "artist" | "venue" | "organization"
  ownerId: string
  provider: EventProvider
  externalIdentity: string
  displayName: string | null
}

export interface ProviderArtistEventQuery {
  startDate?: string
  endDate?: string
}

export interface ProviderRateLimitState {
  remaining: number | null
  resetAt: string | null
  /** Requests per rolling window allowed by config. */
  configuredPerSecond: number
}

export interface ProviderHealth {
  provider: EventProvider
  ok: boolean
  checkedAt: string
  latencyMs: number | null
  errorCode: string | null
}

export type ProviderErrorCode =
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "INVALID_RESPONSE"
  | "DISABLED"
  | "NETWORK"

export class EventProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly retryable: boolean,
    public readonly provider?: EventProvider,
  ) {
    super(message)
    this.name = "EventProviderError"
  }
}

/**
 * Provider adapter interface (03_TARGET_ARCHITECTURE.md §1).
 * Broad search is optional — Bandsintown only supports artist-connected
 * event retrieval.
 */
export interface EventProviderAdapter {
  readonly provider: EventProvider

  searchEvents?(input: ProviderEventSearchInput): Promise<ProviderPage>
  getEvent?(providerEventId: string): Promise<NormalizedExternalEvent | null>

  getArtistEvents?(
    connection: ProviderArtistConnection,
    input: ProviderArtistEventQuery,
  ): Promise<ProviderPage>

  normalizeEvent(raw: unknown): NormalizedExternalEvent
  getRateLimitState?(): Promise<ProviderRateLimitState | null>
  healthCheck(): Promise<ProviderHealth>
}

/** Bandsintown authorization modes (05_BANDSINTOWN_INTEGRATION.md). */
export const BANDSINTOWN_MODES = [
  "disabled",
  "artist_owned_key",
  "partner",
] as const
export type BandsintownMode = (typeof BANDSINTOWN_MODES)[number]
