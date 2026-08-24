/**
 * P16-T06 — playback source labels.
 *
 * Every playable surface carries exactly one label so listeners always know
 * what kind of media they are hearing. Labels map 1:1 from the resolver's
 * PlayableMediaKind plus the editorial "signature sound" presentation of
 * instrument samples.
 */

export const WORLD_SOURCE_LABELS = [
  "tourify_track",
  "live_radio",
  "provider_preview",
  "archive_audio",
  "instrument_sample",
  "narration",
] as const

export type WorldSourceLabel = (typeof WORLD_SOURCE_LABELS)[number]

export interface SourceLabelMeta {
  label: WorldSourceLabel
  display: string
  description: string
}

export const SOURCE_LABEL_META: Readonly<Record<WorldSourceLabel, SourceLabelMeta>> = Object.freeze({
  tourify_track: {
    label: "tourify_track",
    display: "Tourify Track",
    description: "A track uploaded to Tourify by its creator.",
  },
  live_radio: {
    label: "live_radio",
    display: "Live Radio",
    description: "A live station broadcast — linear, not seekable.",
  },
  provider_preview: {
    label: "provider_preview",
    display: "Provider Preview",
    description: "Short metadata preview supplied by an external provider.",
  },
  archive_audio: {
    label: "archive_audio",
    display: "Archive Audio",
    description: "Rights-approved historical or archival recording.",
  },
  instrument_sample: {
    label: "instrument_sample",
    display: "Instrument Sample",
    description: "Approved demonstration clip of an instrument or technology.",
  },
  narration: {
    label: "narration",
    display: "Narration",
    description: "Spoken-word guide audio produced for journeys and listening modes.",
  },
})

/** Resolver kind → public source label (T06 mapping is total). */
export function sourceLabelForKind(kind: "track" | "radio_stream" | "sound_guide" | "archive_audio" | "narration"): WorldSourceLabel {
  switch (kind) {
    case "track":
      return "tourify_track"
    case "radio_stream":
      return "live_radio"
    case "sound_guide":
      return "narration"
    case "archive_audio":
      return "archive_audio"
    case "narration":
      return "narration"
  }
}
