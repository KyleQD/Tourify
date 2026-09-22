/**
 * lib/events/providers/ticketmaster/adapter.ts
 *
 * Adapter wiring the server-only client into the provider registry.
 * Registers itself only when EVENT_PROVIDER_TICKETMASTER is enabled.
 */

import "server-only"

import { registerEventProvider } from "../registry"
import { hashRawPayload } from "../schemas"
import type {
  EventProviderAdapter,
  NormalizedExternalEvent,
  ProviderEventSearchInput,
  ProviderHealth,
  ProviderPage,
  ProviderRateLimitState,
} from "../types"
import { isEventFeatureEnabled } from "../flags"
import { TicketmasterClient } from "./client"
import { normalizeTicketmasterEvent } from "./normalizer"
import { tmEventSchema } from "./schema"

export class TicketmasterAdapter implements EventProviderAdapter {
  readonly provider = "ticketmaster" as const

  constructor(private readonly client: TicketmasterClient) {}

  async searchEvents(input: ProviderEventSearchInput): Promise<ProviderPage> {
    const response = await this.client.searchEvents(input)
    const rawEvents = response._embedded?.events ?? []
    const events: NormalizedExternalEvent[] = []
    for (const raw of rawEvents) {
      events.push(
        normalizeTicketmasterEvent(raw, {
          rawPayloadHash: await hashRawPayload(raw),
          fetchedAt: new Date().toISOString(),
        }),
      )
    }
    return {
      events,
      page: response.page?.number ?? 0,
      totalPages: response.page?.totalPages ?? null,
      totalElements: response.page?.totalElements ?? null,
    }
  }

  async getEvent(providerEventId: string): Promise<NormalizedExternalEvent | null> {
    const raw = await this.client.getEvent(providerEventId)
    if (!raw) return null
    return normalizeTicketmasterEvent(raw, {
      rawPayloadHash: await hashRawPayload(raw),
      fetchedAt: new Date().toISOString(),
    })
  }

  normalizeEvent(raw: unknown): NormalizedExternalEvent {
    const parsed = tmEventSchema.parse(raw)
    // Synchronous normalizeEvent cannot hash async; adapters that need the
    // hash go through searchEvents/getEvent. This path is for validation.
    return normalizeTicketmasterEvent(parsed, {
      rawPayloadHash: "unhashed-validation-path",
      fetchedAt: new Date(0).toISOString(),
    })
  }

  async getRateLimitState(): Promise<ProviderRateLimitState | null> {
    const quota = this.client.quota
    return {
      remaining: quota.rateLimitRemaining,
      resetAt: quota.rateLimitResetAt,
      configuredPerSecond: 4,
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startedAt = Date.now()
    try {
      await this.client.searchEvents({ size: 1 })
      return {
        provider: this.provider,
        ok: true,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        errorCode: null,
      }
    } catch (error) {
      return {
        provider: this.provider,
        ok: false,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
        errorCode: (error as { code?: string }).code ?? "UPSTREAM_ERROR",
      }
    }
  }
}

/** Factory: builds the adapter from server env, or null when disabled. */
export function createTicketmasterAdapter(): TicketmasterAdapter | null {
  if (!isEventFeatureEnabled("EVENT_PROVIDER_TICKETMASTER")) return null
  const apiKey = process.env.TICKETMASTER_API_KEY?.trim()
  if (!apiKey) return null
  return new TicketmasterAdapter(new TicketmasterClient({ apiKey }))
}

// Self-registration on the server, mirroring the music provider pattern.
const adapter = createTicketmasterAdapter()
if (adapter) registerEventProvider(adapter)
