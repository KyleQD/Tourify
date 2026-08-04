/**
 * lib/events/providers/ticketmaster/client.ts
 *
 * Server-only Ticketmaster Discovery API v2 client. The API key never
 * leaves the server. All requests pass through the shared conservative
 * rate limiter; response headers feed quota tracking.
 */

import "server-only"

import { EventProviderError, type ProviderEventSearchInput } from "../types"
import { tmSearchResponseSchema, type TmSearchResponse } from "./schema"
import { TicketmasterRateLimiter } from "./rate-limiter"

const BASE_URL = "https://app.ticketmaster.com/discovery/v2"

export interface TicketmasterClientOptions {
  apiKey: string
  rateLimiter?: TicketmasterRateLimiter
  fetchImpl?: typeof fetch
  /** Max backoff sleep per retry. */
  maxBackoffMs?: number
}

export interface QuotaInfo {
  rateLimitRemaining: number | null
  rateLimitResetAt: string | null
}

export class TicketmasterClient {
  private readonly apiKey: string
  private readonly limiter: TicketmasterRateLimiter
  private readonly fetchImpl: typeof fetch
  private readonly maxBackoffMs: number
  private lastQuota: QuotaInfo = { rateLimitRemaining: null, rateLimitResetAt: null }

  constructor(options: TicketmasterClientOptions) {
    if (!options.apiKey?.trim()) {
      throw new EventProviderError("DISABLED", "TICKETMASTER_API_KEY is not configured", false, "ticketmaster")
    }
    this.apiKey = options.apiKey
    this.limiter = options.rateLimiter ?? new TicketmasterRateLimiter({
      dailyBudget: Number(process.env.TICKETMASTER_DAILY_BUDGET ?? "") || null,
    })
    this.fetchImpl = options.fetchImpl ?? fetch
    this.maxBackoffMs = options.maxBackoffMs ?? 8_000
  }

  get quota(): QuotaInfo {
    return this.lastQuota
  }

  async searchEvents(input: ProviderEventSearchInput): Promise<TmSearchResponse> {
    const params = new URLSearchParams({ apikey: this.apiKey })
    if (input.keyword) params.set("keyword", input.keyword)
    if (input.city) params.set("city", input.city)
    if (input.stateCode) params.set("stateCode", input.stateCode)
    if (input.countryCode) params.set("countryCode", input.countryCode)
    if (input.latitude != null && input.longitude != null) {
      params.set("latlong", `${input.latitude},${input.longitude}`)
      params.set("radius", String(Math.round(input.radiusMiles ?? 25)))
      params.set("unit", "miles")
    }
    if (input.startDateTime) params.set("startDateTime", input.startDateTime)
    if (input.endDateTime) params.set("endDateTime", input.endDateTime)
    if (input.classificationKeys?.length) params.set("classificationName", input.classificationKeys.join(","))
    params.set("page", String(input.page ?? 0))
    params.set("size", String(Math.min(input.size ?? 50, 200)))
    params.set("sort", "date,asc")

    return this.request(`/events.json?${params.toString()}`)
  }

  async getEvent(providerEventId: string): Promise<TmSearchResponse["_embedded"] extends never ? never : import("./schema").TmEvent | null> {
    const params = new URLSearchParams({ apikey: this.apiKey })
    const data = await this.request<{ id?: string } & Record<string, unknown>>(
      `/events/${encodeURIComponent(providerEventId)}.json?${params.toString()}`,
      false,
    )
    if (!data || typeof data !== "object" || !("id" in data)) return null
    return data as import("./schema").TmEvent
  }

  private async request<T = TmSearchResponse>(path: string, allowRetry = true): Promise<T> {
    const waitMs = this.limiter.acquire()
    if (waitMs === -1) {
      throw new EventProviderError("RATE_LIMITED", "Ticketmaster daily budget exhausted (reserve protected)", true, "ticketmaster")
    }
    if (waitMs > 0) await sleep(waitMs)

    let response: Response
    try {
      response = await this.fetchImpl(`${BASE_URL}${path}`, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      throw new EventProviderError("NETWORK", `Ticketmaster request failed: ${(error as Error).message}`, true, "ticketmaster")
    }

    this.trackQuota(response.headers)

    if (response.status === 429) {
      if (allowRetry) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "") || 2
        await sleep(Math.min(retryAfter * 1000, this.maxBackoffMs) + jitter())
        return this.request<T>(path, false)
      }
      throw new EventProviderError("RATE_LIMITED", "Ticketmaster returned 429 after one backoff", true, "ticketmaster")
    }
    if (response.status === 401 || response.status === 403) {
      throw new EventProviderError("UNAUTHORIZED", `Ticketmaster auth failed (${response.status})`, false, "ticketmaster")
    }
    if (response.status === 404) {
      throw new EventProviderError("NOT_FOUND", "Ticketmaster resource not found", false, "ticketmaster")
    }
    if (!response.ok) {
      throw new EventProviderError("UPSTREAM_ERROR", `Ticketmaster HTTP ${response.status}`, response.status >= 500, "ticketmaster")
    }

    const json = await response.json()
    const parsed = tmSearchResponseSchema.safeParse(json)
    if (!parsed.success) {
      // getEvent returns a single-event payload; validate loosely there.
      if ((json as Record<string, unknown>)?.id) return json as T
      throw new EventProviderError("INVALID_RESPONSE", "Ticketmaster payload failed validation", false, "ticketmaster")
    }
    return parsed.data as T
  }

  private trackQuota(headers: Headers): void {
    const remaining = headers.get("ratelimit-remaining")
    const reset = headers.get("ratelimit-reset")
    this.lastQuota = {
      rateLimitRemaining: remaining != null ? Number(remaining) : null,
      rateLimitResetAt: reset != null ? new Date(Number(reset) * 1000).toISOString() : null,
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jitter(): number {
  return Math.floor(Math.random() * 500)
}
