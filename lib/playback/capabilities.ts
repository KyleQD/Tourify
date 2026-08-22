import type { MediaCapabilities, PlayableMediaKind } from "./types"

/**
 * Capability matrix (PLAYBACK_RESOLVER_IMPLEMENTATION_PLAN_V0_1 section 7).
 * UI renders controls from these values instead of hard-coded kind branches.
 */
const TRACK: MediaCapabilities = {
  seek: true,
  queue: true,
  repeat: true,
  shuffle: true,
  musicLibrary: true,
  nowPlaying: "track",
  live: false,
}

// Provider-dependent seek is expressed at the descriptor level; the generic
// track default keeps the existing Jukebox behavior.
const LIVE_RADIO: MediaCapabilities = {
  seek: false,
  queue: false,
  repeat: false,
  shuffle: false,
  musicLibrary: false,
  nowPlaying: "station_metadata",
  live: true,
}

const SOUND_GUIDE: MediaCapabilities = {
  seek: true,
  queue: true,
  repeat: true,
  shuffle: false,
  musicLibrary: false,
  nowPlaying: "static",
  live: false,
}

const ARCHIVE_AUDIO: MediaCapabilities = {
  // Rights/source dependent; conservative until per-asset capability data exists.
  seek: false,
  queue: true,
  repeat: true,
  shuffle: false,
  musicLibrary: false,
  nowPlaying: "static",
  live: false,
}

const NARRATION: MediaCapabilities = {
  seek: true,
  queue: true,
  repeat: true,
  shuffle: false,
  musicLibrary: false,
  nowPlaying: "static",
  live: false,
}

export function capabilitiesFor(kind: PlayableMediaKind): MediaCapabilities {
  switch (kind) {
    case "track":
      return { ...TRACK }
    case "radio_stream":
      return { ...LIVE_RADIO }
    case "sound_guide":
      return { ...SOUND_GUIDE }
    case "archive_audio":
      return { ...ARCHIVE_AUDIO }
    case "narration":
      return { ...NARRATION }
  }
}
