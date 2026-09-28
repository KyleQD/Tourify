/**
 * lib/music/providers/audius/__tests__/audius-errors.test.ts
 *
 * Unit tests for Audius error mapping to stable Tourify error codes.
 */

import { describe, it, expect } from "vitest"
import { audiusHttpError, audiusNetworkError, audiusSchemaError, audiusPlaybackError } from "../audius-errors"
import { TourifyMusicError } from "../../contracts"

describe("audiusHttpError", () => {
  it("maps 404 to TRACK_NOT_FOUND (not retryable)", () => {
    const err = audiusHttpError(404)
    expect(err).toBeInstanceOf(TourifyMusicError)
    expect(err.code).toBe("TRACK_NOT_FOUND")
    expect(err.retryable).toBe(false)
  })

  it("maps 403 to TRACK_UNAVAILABLE (not retryable)", () => {
    const err = audiusHttpError(403)
    expect(err.code).toBe("TRACK_UNAVAILABLE")
    expect(err.retryable).toBe(false)
  })

  it("maps 429 to PROVIDER_RATE_LIMITED (retryable)", () => {
    const err = audiusHttpError(429)
    expect(err.code).toBe("PROVIDER_RATE_LIMITED")
    expect(err.retryable).toBe(true)
  })

  it("maps 500 to PROVIDER_UNAVAILABLE (retryable)", () => {
    const err = audiusHttpError(500)
    expect(err.code).toBe("PROVIDER_UNAVAILABLE")
    expect(err.retryable).toBe(true)
  })

  it("maps 503 to PROVIDER_UNAVAILABLE (retryable)", () => {
    const err = audiusHttpError(503)
    expect(err.code).toBe("PROVIDER_UNAVAILABLE")
    expect(err.retryable).toBe(true)
  })
})

describe("audiusNetworkError", () => {
  it("maps AbortError to PROVIDER_TIMEOUT (retryable)", () => {
    const abort = new DOMException("Aborted", "AbortError")
    const err = audiusNetworkError(abort)
    expect(err.code).toBe("PROVIDER_TIMEOUT")
    expect(err.retryable).toBe(true)
  })

  it("maps generic network errors to PROVIDER_UNAVAILABLE", () => {
    const err = audiusNetworkError(new TypeError("Failed to fetch"))
    expect(err.code).toBe("PROVIDER_UNAVAILABLE")
    expect(err.retryable).toBe(true)
  })
})

describe("audiusSchemaError", () => {
  it("maps to PROVIDER_UNAVAILABLE (not retryable)", () => {
    const err = audiusSchemaError()
    expect(err.code).toBe("PROVIDER_UNAVAILABLE")
    expect(err.retryable).toBe(false)
  })
})

describe("audiusPlaybackError", () => {
  it("maps to PLAYBACK_RESOLUTION_FAILED (retryable)", () => {
    const err = audiusPlaybackError()
    expect(err.code).toBe("PLAYBACK_RESOLUTION_FAILED")
    expect(err.retryable).toBe(true)
  })
})
