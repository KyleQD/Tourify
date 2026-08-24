import type { MediaCapabilities, PlayableMediaIdentity, PlayableMediaKind } from "../types"

/**
 * Jukebox adapter (plan section 8, Step A). Maps the current JukeboxTrack
 * shape to a PlayableMediaIdentity so existing callers keep working.
 */
export interface JukeboxTrackLike {
  id: string
  title?: string | null
  artist_name?: string | null
  cover_art_url?: string | null
  provider?: string | null
  [key: string]: unknown
}

export function jukeboxTrackToIdentity(track: JukeboxTrackLike): PlayableMediaIdentity {
  return {
    id: `track:${track.id}`,
    kind: "track",
    title: track.title ?? "",
    creatorName: track.artist_name ?? null,
    artworkUrl: track.cover_art_url ?? null,
    canonicalTrackId: track.id,
    provider: track.provider ?? "tourify",
  }
}

const TRANSIENT_KEYS = new Set([
  "sourceUrl",
  "source_url",
  "file_url",
  "streamUrl",
  "stream_url",
  "signedUrl",
  "signed_url",
  "expiresAt",
  "expires_at",
  "accessToken",
  "access_token",
])

/**
 * Persistence hardening (plan section 8, Step D): strip every transient
 * playable instruction from an identity before it can reach localStorage.
 * Identity is persisted; resolved URLs are re-obtained on restore.
 */
export function sanitizeMediaForPersistence<T extends Record<string, unknown>>(value: T): T {
  const clone: Record<string, unknown> = { ...value }
  for (const key of Object.keys(clone)) {
    if (TRANSIENT_KEYS.has(key)) delete clone[key]
  }
  return clone as T
}

export function identityForQueueEntry(kind: PlayableMediaKind, rawId: string): string {
  return `${kind}:${rawId}`
}

export function controlsForCapabilities(capabilities: MediaCapabilities): {
  canSeek: boolean
  canRepeat: boolean
  canShuffle: boolean
  showAddToLibrary: boolean
} {
  return {
    canSeek: capabilities.seek,
    canRepeat: capabilities.repeat,
    canShuffle: capabilities.shuffle,
    showAddToLibrary: capabilities.musicLibrary,
  }
}
