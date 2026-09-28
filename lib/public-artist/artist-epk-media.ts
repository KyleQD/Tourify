/**
 * Canonical public artist media source.
 *
 * `artist_photos` / `artist_videos` are not in the active migration chain and are
 * not declared by `lib/database.types.ts` (DB-008 code-drift cluster "artist":
 * the only definitions live in `supabase/artist-features-setup.sql` and
 * `supabase/migrations/archive/**`, both out of chain). Every public read of
 * those tables therefore fails at the data boundary and renders an empty
 * gallery, so the public artist page must not depend on them.
 *
 * The canonical, in-chain store for artist-owned media is the EPK settings
 * document: `artist_epk_settings.settings.photoItems`, written by
 * `app/artist/epk/page.tsx` and read back by `lib/services/epk.service.ts`
 * (`settings.photoItems` -> `EPKData.photos`). This module maps that document to
 * the public profile media DTO so the single-artist page and the ARTIST-006 band
 * aggregation share one mapping.
 *
 * Privacy: the caller must only pass rows that already passed the
 * `artist_epk_settings.is_public = true` filter, and band aggregation must
 * additionally exclude members whose artist profile is hidden (ARTIST-005).
 */

export interface PublicArtistMediaItem {
  id: string
  kind: 'photo' | 'video'
  /** Always present: an item without a url is dropped rather than rendered. */
  url: string
  thumbnailUrl: string | null
  caption: string | null
  isHero: boolean
}

export interface EpkMediaSourceRow {
  id?: string | null
  user_id?: string | null
  settings?: unknown
}

/** Shape the artist EPK surface persists for one gallery item. */
export interface EpkPhotoItem {
  id?: unknown
  url?: unknown
  thumbnailUrl?: unknown
  caption?: unknown
  isHero?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

/**
 * Extract the raw photo-item list from one `artist_epk_settings` row.
 *
 * `settings` is a JSONB document written by the EPK surface; `photoItems` is the
 * key the EPK service and page already use. Anything else yields an empty list
 * so a malformed document can never leak into the public page.
 */
export function readEpkPhotoItems(row: EpkMediaSourceRow): EpkPhotoItem[] {
  if (!isRecord(row?.settings)) return []
  const items = row.settings.photoItems
  return Array.isArray(items) ? (items as EpkPhotoItem[]) : []
}

/** Map one EPK photo item to the public media DTO. */
export function epkPhotoItemToMediaItem(item: EpkPhotoItem, fallbackId: string): PublicArtistMediaItem | null {
  if (!isRecord(item)) return null
  const url = readString(item.url)
  if (!url) return null

  return {
    id: readString(item.id) ?? fallbackId,
    kind: 'photo',
    url,
    thumbnailUrl: readString(item.thumbnailUrl),
    caption: readString(item.caption),
    isHero: item.isHero === true,
  }
}

/**
 * Map a list of `artist_epk_settings` rows to public media items.
 *
 * Rows are deduplicated by media id and the hero item is kept first so the
 * public page can use it as the gallery banner without a second query.
 */
export function epkMediaItemsFromRows(
  rows: EpkMediaSourceRow[] | null | undefined,
  options: { limit?: number } = {}
): PublicArtistMediaItem[] {
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 20
  const seen = new Set<string>()
  const hero: PublicArtistMediaItem[] = []
  const rest: PublicArtistMediaItem[] = []

  for (const row of rows || []) {
    const rowKey = readString(row?.id) ?? readString(row?.user_id) ?? ''
    for (const [index, item] of readEpkPhotoItems(row).entries()) {
      const media = epkPhotoItemToMediaItem(item, rowKey ? `${rowKey}:${index}` : `epk:${index}`)
      if (!media) continue
      if (seen.has(media.id)) continue
      seen.add(media.id)
      if (media.isHero) hero.push(media)
      else rest.push(media)
    }
  }

  return [...hero, ...rest].slice(0, limit)
}
