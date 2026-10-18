export interface PublicMusicItem {
  id: string
  ownerUserId: string
  title: string
  description: string | null
  genre: string | null
  artworkUrl: string | null
  duration: number | null
  publishedAt: string | null
  releaseDate: string | null
  kind: "track" | "single" | "album" | "ep" | "mixtape"
  accessMode: "free" | "paid"
  hasStream: boolean
  artistName: string
  artistHandle: string | null
  tags: string[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function isValidMusicId(value: string): boolean {
  return UUID.test(value)
}

export function safeText(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function musicKind(value: unknown): PublicMusicItem["kind"] {
  return value === "album" || value === "ep" || value === "mixtape" || value === "single"
    ? value : "track"
}

export function isReleaseKind(kind: PublicMusicItem["kind"]): boolean {
  return kind === "album" || kind === "ep" || kind === "mixtape"
}

/**
 * Convert only non-sensitive public metadata to the client payload.
 * The underlying row may contain storage paths, raw file URLs, financial data
 * or verification history; none of those values are serialized.
 */
export function toPublicMusicItem(row: Record<string, any>, artist?: {
  name?: string | null
  handle?: string | null
}): PublicMusicItem {
  const id = String(row.id)
  return {
    id,
    ownerUserId: String(row.user_id || ""),
    title: safeText(row.title) || "Untitled music",
    description: safeText(row.description, 1600),
    genre: safeText(row.genre, 80),
    artworkUrl: safeText(row.cover_art_url, 2048),
    duration: typeof row.duration === "number" && row.duration >= 0 ? row.duration : null,
    publishedAt: safeText(row.created_at, 40),
    // Upload timestamp is not evidence of release date.
    releaseDate: safeText(row.release_date, 40),
    kind: musicKind(row.type),
    accessMode: row.access_mode === "paid" ? "paid" : "free",
    hasStream: Boolean(row.file_url || row.storage_path || row.preview_file_url || row.preview_storage_path),
    artistName: safeText(artist?.name) || safeText(row.artist_name) || safeText(row.artist_username) || "Independent artist",
    artistHandle: safeText(artist?.handle, 160) || null,
    tags: Array.isArray(row.tags)
      ? row.tags.filter((tag: unknown): tag is string => typeof tag === "string").slice(0, 15).map((tag: string) => tag.slice(0, 80))
      : [],
  }
}

