/**
 * P16-T09 — playback telemetry.
 *
 * Coarse, privacy-safe playback quality events: play-start success,
 * reconnects, early failures, rights denials. Structurally excludes raw
 * listener IPs, exact coordinates, and free-form identity the same way
 * place-picker telemetry does — only whitelisted keys survive.
 */

export type PlaybackTelemetryKind =
  | "play_start_success"
  | "reconnect"
  | "early_failure"
  | "rights_denied"
  | "terminal_unavailable"

export interface PlaybackTelemetryEvent {
  kind: PlaybackTelemetryKind
  /** Canonical station id (never a stream URL). */
  stationId?: string | undefined
  /** Canonical media id (track/media asset), never a URL. */
  mediaId?: string | undefined
  /** Seconds of playback before failure (early = < 10s). */
  secondsIntoPlayback?: number | undefined
  /** Attempt number for reconnect events (1-based). */
  reconnectAttempt?: number | undefined
}

export interface StoredPlaybackEvent {
  event_kind: PlaybackTelemetryKind
  station_id: string | null
  media_id: string | null
  seconds_into_playback: number | null
  reconnect_attempt: number | null
  occurred_at: string
}

const FORBIDDEN_KEY_FRAGMENTS = [
  "ip", "address", "lat", "lng", "lon", "coord", "location",
  "user_agent", "referrer", "email", "session",
]

function isCanonicalId(value: unknown): value is string {
  // Slugs/uuids only — a URL here would leak protected stream locations.
  return typeof value === "string" && value.length > 0 && value.length <= 120 && !value.includes("://") && !value.includes("//")
}

/**
 * Scrub an incoming event down to the whitelisted shape. Returns null when
 * nothing safe remains — callers must not persist anything else.
 */
export function sanitizePlaybackTelemetry(
  input: Record<string, unknown>,
  nowIso: string = new Date().toISOString(),
): StoredPlaybackEvent | null {
  const kinds: PlaybackTelemetryKind[] = [
    "play_start_success", "reconnect", "early_failure", "rights_denied", "terminal_unavailable",
  ]
  const kind = input.kind ?? input.event_kind
  if (typeof kind !== "string" || !kinds.includes(kind as PlaybackTelemetryKind)) return null

  const stationId = isCanonicalId(input.stationId) ? input.stationId : null
  const mediaId = isCanonicalId(input.mediaId) ? input.mediaId : null

  // Provided-but-invalid numeric details reject the whole event: partial
  // trust is still a way to smuggle junk into storage.
  let secondsIntoPlayback: number | null = null
  if (input.secondsIntoPlayback !== undefined && input.secondsIntoPlayback !== null) {
    const value = input.secondsIntoPlayback
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value >= 86_400) {
      return null
    }
    secondsIntoPlayback = Math.round(value * 100) / 100
  }

  let reconnectAttempt: number | null = null
  if (input.reconnectAttempt !== undefined && input.reconnectAttempt !== null) {
    const value = input.reconnectAttempt
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 99) {
      return null
    }
    reconnectAttempt = value
  }

  if (!stationId && !mediaId) return null

  // Defense-in-depth: reject any extra hostile-looking keys outright rather
  // than silently storing them alongside the whitelist.
  for (const key of Object.keys(input)) {
    const lowered = key.toLowerCase()
    if (FORBIDDEN_KEY_FRAGMENTS.some((fragment) => lowered.includes(fragment))) {
      if (!(lowered === "kind" || lowered === "event_kind")) return null
    }
  }

  return {
    event_kind: kind as PlaybackTelemetryKind,
    station_id: stationId,
    media_id: mediaId,
    seconds_into_playback: secondsIntoPlayback,
    reconnect_attempt: reconnectAttempt,
    occurred_at: nowIso,
  }
}
