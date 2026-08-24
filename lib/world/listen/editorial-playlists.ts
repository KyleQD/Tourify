/**
 * P16-T07 — regional editorial playlists.
 *
 * Playlists store CANONICAL IDENTIFIERS only (track/station/media ids or
 * slugs). Raw media URLs are structurally rejected: copying a stream URL
 * into editorial data would bypass the rights-resolved resolver and freeze
 * protected locations into public payloads.
 */

export type PlaylistItemKind = "track" | "radio_station" | "media_asset"

export interface PlaylistItemDraft {
  item_kind: PlaylistItemKind
  /** Canonical id/slug. URLs rejected. */
  item_id: string
}

export interface RegionalPlaylistDraft {
  placeKey: string
  title: string
  curatorId: string
  items: PlaylistItemDraft[]
}

export type PlaylistValidation =
  | { ok: true; items: Array<PlaylistItemDraft & { position: number }> }
  | { ok: false; error: string }

function isCanonicalId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= 160 &&
    !value.includes("://") &&
    !value.includes("//")
  )
}

/** Validate + normalize one playlist draft (dedupe, position, fail-closed). */
export function validatePlaylistDraft(draft: RegionalPlaylistDraft): PlaylistValidation {
  if (!draft.placeKey?.trim()) return { ok: false, error: "place_required" }
  if (!draft.title?.trim() || draft.title.trim().length > 120) return { ok: false, error: "title_invalid" }
  if (!draft.curatorId?.trim()) return { ok: false, error: "curator_required" }
  if (!Array.isArray(draft.items) || draft.items.length === 0) return { ok: false, error: "items_required" }
  if (draft.items.length > 100) return { ok: false, error: "too_many_items" }

  const seen = new Set<string>()
  const items: Array<PlaylistItemDraft & { position: number }> = []
  for (const raw of draft.items) {
    const kinds: PlaylistItemKind[] = ["track", "radio_station", "media_asset"]
    if (!kinds.includes(raw.item_kind)) return { ok: false, error: `unknown_item_kind_${String(raw.item_kind)}` }
    if (!isCanonicalId(raw.item_id)) return { ok: false, error: "canonical_id_required_no_urls" }
    const key = `${raw.item_kind}:${raw.item_id}`
    if (seen.has(key)) continue // dedupe silently — duplicates are not errors
    seen.add(key)
    items.push({ ...raw, item_id: raw.item_id.trim(), position: items.length })
  }
  if (items.length === 0) return { ok: false, error: "items_required" }
  return { ok: true, items }
}
