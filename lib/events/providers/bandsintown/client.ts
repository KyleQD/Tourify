/**
 * lib/events/providers/bandsintown/client.ts
 *
 * Server-only Bandsintown client. Scoped to artist-event retrieval only —
 * no platform-wide search. Failed lookups are negatively cached by the
 * caller (event_provider_connections.last_error_code), never retried in a
 * loop.
 */

import "server-only"

import { EventProviderError } from "../types"
import { bitEventsResponseSchema, type BitEvent } from "./schema"

export interface BandsintownClientOptions {
  appId: string
  baseUrl?: string
  fetchImpl?: typeof fetch
}

export class BandsintownClient {
  private readonly appId: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: BandsintownClientOptions) {
    if (!options.appId?.trim()) {
      throw new EventProviderError("DISABLED", "BANDSINTOWN_APP_ID is not configured", false, "bandsintown")
    }
    this.appId = options.appId
    this.baseUrl = (options.baseUrl ?? process.env.BANDSINTOWN_BASE_URL ?? "https://rest.bandsintown.com").replace(/\/$/, "")
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  /** Upcoming events for one connected artist identity (name or id). */
  async getArtistEvents(externalIdentity: string): Promise<BitEvent[]> {
    const params = new URLSearchParams({ app_id: this.appId, date: "upcoming" })
    const url = `${this.baseUrl}/artists/${encodeURIComponent(externalIdentity)}/events?${params}`
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      throw new EventProviderError("NETWORK", `Bandsintown request failed: ${(error as Error).message}`, true, "bandsintown")
    }

    if (response.status === 404) {
      throw new EventProviderError("NOT_FOUND", `Bandsintown artist "${externalIdentity}" not found`, false, "bandsintown")
    }
    if (response.status === 401 || response.status === 403) {
      throw new EventProviderError("UNAUTHORIZED", `Bandsintown auth failed (${response.status})`, false, "bandsintown")
    }
    if (response.status === 429) {
      throw new EventProviderError("RATE_LIMITED", "Bandsintown rate limited", true, "bandsintown")
    }
    if (!response.ok) {
      throw new EventProviderError("UPSTREAM_ERROR", `Bandsintown HTTP ${response.status}`, response.status >= 500, "bandsintown")
    }

    const json = await response.json()
    if (Array.isArray(json)) {
      const parsed = bitEventsResponseSchema.safeParse(json)
      if (!parsed.success) {
        throw new EventProviderError("INVALID_RESPONSE", "Bandsintown events payload failed validation", false, "bandsintown")
      }
      return parsed.data
    }
    // Bandsintown returns an object with an error for unknown artists.
    throw new EventProviderError("NOT_FOUND", "Bandsintown artist lookup failed", false, "bandsintown")
  }
}
