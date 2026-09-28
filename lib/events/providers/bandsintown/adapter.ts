/**
 * lib/events/providers/bandsintown/adapter.ts
 *
 * Permission-safe Bandsintown adapter. No broad search — only
 * artist-connected event retrieval. Registers only when the resolved mode
 * is not `disabled`.
 */

import "server-only"

import { registerEventProvider } from "../registry"
import { hashRawPayload } from "../schemas"
import { getBandsintownMode } from "../flags"
import type {
  EventProviderAdapter,
  NormalizedExternalEvent,
  ProviderArtistConnection,
  ProviderArtistEventQuery,
  ProviderHealth,
  ProviderPage,
} from "../types"
import { BandsintownClient } from "./client"
import { normalizeBandsintownEvent } from "./normalizer"

export class BandsintownAdapter implements EventProviderAdapter {
  readonly provider = "bandsintown" as const

  constructor(private readonly client: BandsintownClient) {}

  async getArtistEvents(
    connection: ProviderArtistConnection,
    _input: ProviderArtistEventQuery,
  ): Promise<ProviderPage> {
    if (connection.provider !== this.provider) {
      throw new Error("Bandsintown adapter can only serve Bandsintown connections")
    }
    const rawEvents = await this.client.getArtistEvents(connection.externalIdentity)
    const displayName = connection.displayName ?? connection.externalIdentity
    const events: NormalizedExternalEvent[] = []
    for (const raw of rawEvents) {
      events.push(
        normalizeBandsintownEvent(raw, displayName, {
          rawPayloadHash: await hashRawPayload(raw),
          fetchedAt: new Date().toISOString(),
        }),
      )
    }
    return { events, page: 0, totalPages: 1, totalElements: events.length }
  }

  normalizeEvent(raw: unknown): NormalizedExternalEvent {
    throw new Error("Use getArtistEvents — Bandsintown events require a connected artist context")
  }

  async healthCheck(): Promise<ProviderHealth> {
    // No unauthenticated ping endpoint; health is derived from sync runs.
    return {
      provider: this.provider,
      ok: true,
      checkedAt: new Date().toISOString(),
      latencyMs: null,
      errorCode: null,
    }
  }
}

export function createBandsintownAdapter(): BandsintownAdapter | null {
  if (getBandsintownMode() === "disabled") return null
  const appId = process.env.BANDSINTOWN_APP_ID?.trim()
  if (!appId) return null
  return new BandsintownAdapter(new BandsintownClient({ appId }))
}

const adapter = createBandsintownAdapter()
if (adapter) registerEventProvider(adapter)
