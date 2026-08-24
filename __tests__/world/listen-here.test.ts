/**
 * P16 — Listen Here domain tests: source labels, capability-aware session
 * machine, telemetry scrubbing, playlist canonical-id enforcement.
 */
import { describe, expect, it } from "vitest"

import { validatePlaylistDraft, type RegionalPlaylistDraft } from "@/lib/world/listen/editorial-playlists"
import {
  sanitizePlaybackTelemetry,
  type StoredPlaybackEvent,
} from "@/lib/world/listen/playback-telemetry"
import {
  MAX_RECONNECT_ATTEMPTS,
  RECONNECT_BACKOFF_MS,
  reduceRadioSession,
  shouldAttemptReconnect,
} from "@/lib/world/listen/radio-session"
import { SOURCE_LABEL_META, sourceLabelForKind, WORLD_SOURCE_LABELS } from "@/lib/world/listen/source-labels"

describe("P16-T06 source labels", () => {
  it("covers exactly the six product labels", () => {
    expect(WORLD_SOURCE_LABELS).toEqual([
      "tourify_track",
      "live_radio",
      "provider_preview",
      "archive_audio",
      "instrument_sample",
      "narration",
    ])
  })

  it("maps every resolver kind to a label (total function)", () => {
    for (const kind of ["track", "radio_stream", "sound_guide", "archive_audio", "narration"] as const) {
      const label = sourceLabelForKind(kind)
      expect(WORLD_SOURCE_LABELS).toContain(label)
      expect(SOURCE_LABEL_META[label].display.length).toBeGreaterThan(0)
    }
    expect(sourceLabelForKind("radio_stream")).toBe("live_radio")
    expect(sourceLabelForKind("sound_guide")).toBe("narration")
  })
})

describe("P16-T05 radio session machine", () => {
  it("connect_requested → connected → live", () => {
    let state = reduceRadioSession({ phase: "idle" }, "connect_requested")
    expect(state.phase).toBe("connecting")
    state = reduceRadioSession(state, "connected")
    expect(state.phase).toBe("live")
  })

  it("transient errors reconnect with bounded attempts and backoff", () => {
    let state = reduceRadioSession({ phase: "live" }, "transient_error")
    expect(state).toMatchObject({ phase: "reconnecting", attempt: 1, backoffMs: RECONNECT_BACKOFF_MS[0] })
    state = reduceRadioSession(state, "transient_error")
    state = reduceRadioSession(state, "transient_error")
    expect(state).toMatchObject({ phase: "reconnecting", attempt: 3 })
    // Budget exhausted → honest terminal state.
    state = reduceRadioSession(state, "transient_error")
    expect(state).toEqual({ phase: "terminal", reason: "unavailable" })
    expect(MAX_RECONNECT_ATTEMPTS).toBe(3)
  })

  it("rights denials are terminal immediately and absorb everything", () => {
    let state = reduceRadioSession({ phase: "connecting" }, "rights_denied")
    expect(state).toEqual({ phase: "terminal", reason: "rights_denied" })
    expect(reduceRadioSession(state, "connected").phase).toBe("terminal")
  })

  it("stop returns to idle; reconnect waits for backoff to elapse", () => {
    expect(reduceRadioSession({ phase: "live" }, "stopped").phase).toBe("idle")
    const reconnecting = reduceRadioSession({ phase: "live" }, "transient_error") as Extract<
      RadioSessionState,
      { phase: "reconnecting" }
    >
    expect(shouldAttemptReconnect(reconnecting, reconnecting.backoffMs - 1)).toBe(false)
    expect(shouldAttemptReconnect(reconnecting, reconnecting.backoffMs)).toBe(true)
  })
})

describe("P16-T09 playback telemetry scrubbing", () => {
  it("keeps only whitelisted coarse fields", () => {
    const stored = sanitizePlaybackTelemetry(
      { kind: "play_start_success", stationId: "st-123" },
      "2026-08-23T00:00:00Z",
    )
    expect(stored).toEqual({
      event_kind: "play_start_success",
      station_id: "st-123",
      media_id: null,
      seconds_into_playback: null,
      reconnect_attempt: null,
      occurred_at: "2026-08-23T00:00:00Z",
    } satisfies StoredPlaybackEvent)
  })

  it("rejects events carrying listener identity or location fields", () => {
    expect(sanitizePlaybackTelemetry({ kind: "play_start_success", stationId: "s1", ip: "1.2.3.4" })).toBeNull()
    expect(sanitizePlaybackTelemetry({ kind: "play_start_success", stationId: "s1", lat: 42.3, lng: -83 })).toBeNull()
    expect(sanitizePlaybackTelemetry({ kind: "play_start_success", stationId: "s1", user_agent: "x" })).toBeNull()
    expect(sanitizePlaybackTelemetry({ kind: "play_start_success", stationId: "s1", sessionId: "abc" })).toBeNull()
  })

  it("rejects unknown kinds and URL-shaped canonical ids (no stream leaks)", () => {
    expect(sanitizePlaybackTelemetry({ kind: "everything", stationId: "s1" })).toBeNull()
    expect(sanitizePlaybackTelemetry({ kind: "play_start_success", stationId: "https://cdn.example/stream.m3u8" })).toBeNull()
    expect(sanitizePlaybackTelemetry({ kind: "play_start_success" })).toBeNull() // no id at all
  })

  it("bounds numeric detail fields", () => {
    const ok = sanitizePlaybackTelemetry({ kind: "reconnect", mediaId: "trk_9", reconnectAttempt: 2, secondsIntoPlayback: 3.456 })
    expect(ok).toMatchObject({ reconnect_attempt: 2, seconds_into_playback: 3.46 })
    expect(sanitizePlaybackTelemetry({ kind: "reconnect", mediaId: "m1", reconnectAttempt: 500 })).toBeNull()
    expect(sanitizePlaybackTelemetry({ kind: "early_failure", mediaId: "m1", secondsIntoPlayback: -5 })).toBeNull()
  })
})

describe("P16-T07 editorial playlists store canonical ids only", () => {
  const base: RegionalPlaylistDraft = {
    placeKey: "us/mi/detroit",
    title: "Motor City Nights",
    curatorId: "editor-1",
    items: [{ item_kind: "radio_station", item_id: "station-uuid-1" }],
  }

  it("accepts valid drafts with normalized positions and dedupe", () => {
    const result = validatePlaylistDraft({
      ...base,
      items: [
        { item_kind: "track", item_id: "track-1" },
        { item_kind: "track", item_id: "track-1" },
        { item_kind: "media_asset", item_id: "asset-7" },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items.map((i) => i.position)).toEqual([0, 1])
      expect(result.items).toHaveLength(2)
    }
  })

  it("rejects raw URLs in canonical identifiers", () => {
    const result = validatePlaylistDraft({
      ...base,
      items: [{ item_kind: "radio_station", item_id: "http://ice1.example/stream" }],
    })
    expect(result.ok === false && result.error).toBe("canonical_id_required_no_urls")
  })

  it("fails closed on missing place/title/curator/items and bad kinds", () => {
    expect(validatePlaylistDraft({ ...base, placeKey: "" }).ok).toBe(false)
    expect(validatePlaylistDraft({ ...base, title: "" }).ok).toBe(false)
    expect(validatePlaylistDraft({ ...base, curatorId: "" }).ok).toBe(false)
    expect(validatePlaylistDraft({ ...base, items: [] }).ok).toBe(false)
    expect(validatePlaylistDraft({ ...base, items: [{ item_kind: "vibe" as never, item_id: "x" }] }).ok).toBe(false)
  })
})
