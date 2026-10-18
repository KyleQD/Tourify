import "server-only"

import { createClient } from "@/lib/supabase/server"

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

function isPublicQuery(query: any) {
  return query.eq("is_public", true)
    .eq("is_visible", true)
    .eq("moderation_status", "approved")
    .eq("rights_confirmed", true)
}

function safeText(value: unknown, max = 200): string | null {
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

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function artistByOwner(supabase: SupabaseClient, userId: string): Promise<{
  name: string | null; handle: string | null
}> {
  if (!userId) return { name: null, handle: null }
  const { data: artist } = await supabase.from("artist_profiles")
    .select("artist_name, url_slug, settings").eq("user_id", userId).maybeSingle()
  // A public track doesn't confer permission to link to a hidden artist persona.
  const settings = artist?.settings && typeof artist.settings === "object"
    ? artist.settings as Record<string, unknown> : {}
  if (settings.public_profile === false) {
    return { name: safeText(artist?.artist_name), handle: null }
  }
  if (artist?.url_slug) return { name: safeText(artist.artist_name), handle: String(artist.url_slug) }
  const { data: profile } = await supabase.from("profiles")
    .select("username, full_name").eq("id", userId).maybeSingle()
  return { name: safeText(artist?.artist_name) || safeText(profile?.full_name), handle: safeText(profile?.username, 160) }
}

async function findPublicRow(supabase: SupabaseClient, id: string): Promise<{
  row: Record<string, any>; table: "music_tracks" | "artist_music"
} | null> {
  for (const table of ["music_tracks", "artist_music"] as const) {
    const { data, error } = await isPublicQuery(
      supabase.from(table).select("*").eq("id", id)
    ).maybeSingle()
    if (data && !error) return { row: data as Record<string, any>, table }
    // If one table is absent, unsupported, or does not contain the track,
    // try the canonical legacy catalog before returning not found.
  }
  return null
}

/** Resolve an actual release-typed catalog row, even if a music_tracks view omits type. */
export async function getPublicReleaseItem(id: string): Promise<PublicMusicItem | null> {
  if (!isValidMusicId(id)) return null
  const supabase = await createClient()
  const { data, error } = await isPublicQuery(
    supabase.from("artist_music").select("*").eq("id", id)
      .in("type", ["album", "ep", "mixtape"])
  ).maybeSingle()
  if (!data || error) return null
  const artist = await artistByOwner(supabase, String(data.user_id || ""))
  return toPublicMusicItem(data as Record<string, any>, artist)
}

export async function getPublicMusicItem(id: string): Promise<PublicMusicItem | null> {
  if (!isValidMusicId(id)) return null
  const supabase = await createClient()
  const found = await findPublicRow(supabase, id)
  if (!found) return null
  const artist = await artistByOwner(supabase, String(found.row.user_id || ""))
  return toPublicMusicItem(found.row, artist)
}

/** Strictly public, moderated, rights-confirmed music only. */
export async function getRelatedPublicMusic(item: PublicMusicItem, limit = 8): Promise<PublicMusicItem[]> {
  const supabase = await createClient()
  const capped = Math.min(Math.max(limit, 1), 16)
  const collected = new Map<string, Record<string, any>>()
  for (const table of ["music_tracks", "artist_music"] as const) {
    if (collected.size >= capped) break
    let query = isPublicQuery(supabase.from(table).select("*"))
    if (item.ownerUserId) query = query.eq("user_id", item.ownerUserId)
    else if (item.genre) query = query.eq("genre", item.genre)
    else break
    const { data, error } = await query.order("created_at", { ascending: false }).limit(capped + 5)
    if (error || !data) continue
    for (const row of data as Record<string, any>[]) {
      if (row.id !== item.id && !collected.has(row.id) && collected.size < capped) {
        collected.set(row.id, row)
      }
    }
  }
  return [...collected.values()].map((row) =>
    toPublicMusicItem(row, { name: item.artistName, handle: item.artistHandle })
  )
}

/**
 * Legacy artist_music stores album/EP/mixtape as upload type. It does not
 * prove a multi-track release association. Do not synthesize tracklists.
 */
export async function listPublicReleases(limit = 24): Promise<PublicMusicItem[]> {
  const supabase = await createClient()
  const capped = Math.min(Math.max(limit, 1), 40)
  const { data, error } = await isPublicQuery(supabase.from("artist_music")
    .select("*").in("type", ["album", "ep", "mixtape"]))
    .order("created_at", { ascending: false }).limit(capped)
  if (error || !data) return []
  const rows = data as Record<string, any>[]
  const owners = [...new Set(rows.map((row) => String(row.user_id || "")).filter(Boolean))]
  const artistLookup = new Map<string, { name: string | null; handle: string | null }>()
  // Small bounded public browse page; use a batched lookup to avoid N+1.
  if (owners.length) {
    const { data: artists } = await supabase.from("artist_profiles")
      .select("user_id, artist_name, url_slug, settings").in("user_id", owners)
    for (const artist of artists || []) {
      const settings = artist.settings && typeof artist.settings === "object"
        ? artist.settings as Record<string, unknown> : {}
      artistLookup.set(String(artist.user_id), {
        name: safeText(artist.artist_name),
        handle: settings.public_profile === false ? null : safeText(artist.url_slug, 160),
      })
    }
  }
  return rows.map((row) => toPublicMusicItem(row, artistLookup.get(String(row.user_id || ""))))
}
