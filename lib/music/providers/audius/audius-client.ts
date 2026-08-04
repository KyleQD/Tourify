/**
 * lib/music/providers/audius/audius-client.ts
 *
 * Low-level HTTP client for the Audius discovery provider API.
 * - AbortController on every request (configurable timeout)
 * - Bounded retry (2 attempts) for idempotent GETs on 429/5xx
 * - Parses JSON and returns the raw body; callers apply Zod schemas
 * - Never logs or returns temporary stream URLs
 */

import type { AudiusConfig } from "./audius-config"
import { audiusHttpError, audiusNetworkError } from "./audius-errors"

const MAX_RETRIES = 2
const RETRY_BASE_DELAY_MS = 300

async function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

export interface AudiusClientOptions {
  config: AudiusConfig
  /** Override signal — used in tests to inject pre-aborted controllers */
  signal?: AbortSignal
}

/**
 * Make a GET request to the Audius API.
 * Retries up to MAX_RETRIES times for retryable errors.
 * Throws TourifyMusicError on unrecoverable failures.
 */
export async function audiusGet<T = unknown>(
  path: string,
  params: Record<string, string | number> = {},
  options: AudiusClientOptions
): Promise<T> {
  const { config } = options

  const searchParams = new URLSearchParams({
    app_name: config.appName,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  })

  const url = `${config.apiBaseUrl}${path}?${searchParams.toString()}`

  let lastError: unknown

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff with jitter
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 100
      await sleep(delay)
    }

    // Each attempt gets its own AbortController linked to the outer signal
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs)

    // If caller supplied a signal that's already aborted, abort immediately
    if (options.signal?.aborted) {
      clearTimeout(timeout)
      throw audiusNetworkError(new DOMException("Aborted", "AbortError"))
    }

    // Propagate outer abort to this attempt's controller
    const onAbort = () => controller.abort()
    options.signal?.addEventListener("abort", onAbort, { once: true })

    try {
      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: { Accept: "application/json" },
        // Do not follow redirects for stream URLs — we capture the Location header
        redirect: "follow",
      })

      clearTimeout(timeout)
      options.signal?.removeEventListener("abort", onAbort)

      if (!res.ok) {
        if (isRetryableStatus(res.status) && attempt < MAX_RETRIES) {
          lastError = audiusHttpError(res.status)
          continue
        }
        throw audiusHttpError(res.status)
      }

      const body = (await res.json()) as T
      return body
    } catch (err) {
      clearTimeout(timeout)
      options.signal?.removeEventListener("abort", onAbort)

      // Don't retry aborts — surface immediately
      if ((err as Error)?.name === "AbortError") {
        throw audiusNetworkError(err)
      }

      // Don't retry TourifyMusicError that's already non-retryable
      const { TourifyMusicError } = await import("../contracts")
      if (err instanceof TourifyMusicError && !err.retryable) {
        throw err
      }

      if (attempt < MAX_RETRIES) {
        lastError = err
        continue
      }

      // Final attempt failed
      if (err instanceof TourifyMusicError) throw err
      throw audiusNetworkError(err)
    }
  }

  // Exhausted retries
  if (lastError instanceof Error) {
    const { TourifyMusicError } = await import("../contracts")
    if (lastError instanceof TourifyMusicError) throw lastError
  }
  throw audiusNetworkError(lastError)
}

/**
 * Resolve a stream URL for an Audius track.
 * The Audius /v1/tracks/{id}/stream endpoint returns a 302 redirect to the actual MP3.
 * We follow the redirect and return the final URL.
 *
 * IMPORTANT: The returned URL is temporary. Never persist it.
 */
export async function resolveAudiusStreamUrl(
  trackId: string,
  options: AudiusClientOptions
): Promise<string> {
  const { config } = options
  const url = `${config.apiBaseUrl}/v1/tracks/${encodeURIComponent(trackId)}/stream?app_name=${encodeURIComponent(config.appName)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), config.playbackResolveTimeoutMs)

  const onAbort = () => controller.abort()
  options.signal?.addEventListener("abort", onAbort, { once: true })

  try {
    // Use redirect:"follow" — fetch will follow the 302 and land on the CDN URL.
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    })

    clearTimeout(timeout)
    options.signal?.removeEventListener("abort", onAbort)

    if (!res.ok) {
      throw audiusHttpError(res.status)
    }

    // The final URL after redirect is the stream URL
    const streamUrl = res.url
    if (!streamUrl || streamUrl === url) {
      // Some nodes return JSON with a url field instead of redirecting
      try {
        const body = (await res.clone().json()) as { url?: string }
        if (body?.url) return body.url
      } catch {}
      const { audiusPlaybackError } = await import("./audius-errors")
      throw audiusPlaybackError()
    }

    return streamUrl
  } catch (err) {
    clearTimeout(timeout)
    options.signal?.removeEventListener("abort", onAbort)
    if (err instanceof Error && err.name === "AbortError") throw audiusNetworkError(err)
    const { TourifyMusicError, audiusPlaybackError: _p } = await import("../contracts").then(
      async () => ({ TourifyMusicError: (await import("../contracts")).TourifyMusicError, audiusPlaybackError: null })
    )
    if (err instanceof TourifyMusicError) throw err
    const { audiusPlaybackError } = await import("./audius-errors")
    throw audiusPlaybackError(err)
  }
}
