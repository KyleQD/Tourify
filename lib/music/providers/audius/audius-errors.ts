/**
 * lib/music/providers/audius/audius-errors.ts
 *
 * Maps Audius HTTP errors and network failures to stable Tourify error codes.
 */

import { TourifyMusicError, type TourifyMusicErrorCode } from "../contracts"

interface AudiusErrorMapping {
  code: TourifyMusicErrorCode
  message: string
  retryable: boolean
}

function httpStatusToMapping(status: number): AudiusErrorMapping {
  if (status === 404) {
    return { code: "TRACK_NOT_FOUND", message: "This track was not found on Audius.", retryable: false }
  }
  if (status === 403) {
    return { code: "TRACK_UNAVAILABLE", message: "This track is not available for playback.", retryable: false }
  }
  if (status === 429) {
    return { code: "PROVIDER_RATE_LIMITED", message: "Audius rate limit reached. Please try again shortly.", retryable: true }
  }
  if (status >= 500) {
    return { code: "PROVIDER_UNAVAILABLE", message: "Audius is temporarily unavailable.", retryable: true }
  }
  return { code: "PROVIDER_UNAVAILABLE", message: "Audius returned an unexpected response.", retryable: true }
}

/**
 * Convert an HTTP status code from Audius into a TourifyMusicError.
 */
export function audiusHttpError(status: number, cause?: unknown): TourifyMusicError {
  const mapping = httpStatusToMapping(status)
  return new TourifyMusicError(mapping.code, mapping.message, mapping.retryable, cause)
}

/**
 * Convert a network/timeout error into a TourifyMusicError.
 */
export function audiusNetworkError(cause: unknown): TourifyMusicError {
  const err = cause as Error | undefined
  if (err?.name === "AbortError") {
    return new TourifyMusicError(
      "PROVIDER_TIMEOUT",
      "The Audius request timed out. Please try again.",
      true,
      cause
    )
  }
  return new TourifyMusicError(
    "PROVIDER_UNAVAILABLE",
    "Could not reach Audius. Check your connection and try again.",
    true,
    cause
  )
}

/**
 * Convert a schema validation failure into a TourifyMusicError.
 */
export function audiusSchemaError(cause?: unknown): TourifyMusicError {
  return new TourifyMusicError(
    "PROVIDER_UNAVAILABLE",
    "Audius returned an unexpected data format.",
    false,
    cause
  )
}

/**
 * Convert a playback resolution failure into a TourifyMusicError.
 */
export function audiusPlaybackError(cause?: unknown): TourifyMusicError {
  return new TourifyMusicError(
    "PLAYBACK_RESOLUTION_FAILED",
    "Could not resolve the Audius stream URL. Please try again.",
    true,
    cause
  )
}
