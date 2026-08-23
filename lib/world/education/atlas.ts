/**
 * P20-T01 — Instrument Atlas contract.
 *
 * One renderer-neutral shape for educational instrument pages. Every
 * factual section cites sources; the sound demo is an APPROVED media
 * identifier resolved through playback (never a URL).
 */

export interface InstrumentAtlasEntry {
  /** Canonical slug, e.g. "cuban_tres". */
  key: string
  name: string
  family: "strings" | "drums" | "wind" | "keys" | "electronic" | "voice" | "other"
  originPlaceKey: string | null
  originEra: string | null
  construction: string
  technique: string
  /** Approved demo media id (world_media_assets) — URLs forbidden. */
  approvedSoundDemoMediaId: string | null
  traditions: string[]
  genres: string[]
  /** Place keys where the instrument is culturally active. */
  geographyPlaceKeys: string[]
  performerArtistRefs: string[]
  /** Coarse timeline entries; precision follows evidence (no fake dates). */
  timeline: Array<{ label: string; year?: number | null; era?: string | null }>
  sourceKeys: readonly string[]
}

export type AtlasValidation =
  | { ok: true }
  | { ok: false; error: string }

/** Fail-closed structural validation for atlas entries. */
export function validateAtlasEntry(entry: InstrumentAtlasEntry): AtlasValidation {
  if (!entry.key?.trim() || !entry.name?.trim()) return { ok: false, error: "identity_required" }
  if (!entry.construction?.trim() || !entry.technique?.trim()) return { ok: false, error: "craft_sections_required" }
  if (!Array.isArray(entry.sourceKeys) || entry.sourceKeys.length === 0) {
    return { ok: false, error: "sources_required" }
  }
  const demo = entry.approvedSoundDemoMediaId
  if (demo !== null && (demo.includes("://") || demo.includes("//"))) {
    return { ok: false, error: "demo_must_be_canonical_media_id" }
  }
  if (
    entry.timeline.some(
      (t) => !t.label?.trim() || (t.year == null && !t.era?.trim()),
    )
  ) {
    return { ok: false, error: "timeline_entries_need_label_and_date_or_era" }
  }
  return { ok: true }
}
