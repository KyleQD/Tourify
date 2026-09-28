"use client"

import { supabase } from "@/lib/supabase"

/**
 * Browser contract for the artist-owned music surface.
 *
 * Artist pages must use the artist music API for catalog reads and writes. The
 * music domain continues to own playback, rights, royalties, and ingestion;
 * this module only standardizes the artist-facing transport and upload flow.
 */
export const ARTIST_MUSIC_API_PREFIX = "/api/artist/music"

export type ArtistMusicUploadKind = "full" | "preview" | "cover"

export interface ArtistMusicApiResult<T = any> {
  response: Response
  body: T
}

export interface ArtistMusicUpload {
  bucket: string
  path: string
  token: string
  signedUrl: string
  publicUrl: string
}

export async function uploadArtistMusicSignedUrl({
  bucket,
  path,
  token,
  file,
}: {
  bucket: string
  path: string
  token: string
  file: File
}): Promise<void> {
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, { contentType: file.type })
  if (error) throw error
}

export function isArtistMusicApiPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false

  let pathname = path
  try {
    // The browser transport receives relative API URLs, often with query
    // parameters for pagination or analytics ranges. Validate the route
    // namespace independently from the query string.
    pathname = new URL(path, "http://artist-music.local").pathname
  } catch {
    return false
  }

  return pathname === ARTIST_MUSIC_API_PREFIX || pathname.startsWith(`${ARTIST_MUSIC_API_PREFIX}/`)
}

/**
 * Send an authenticated, no-store request to an artist music route.
 * Keeping these defaults here prevents individual dashboards from silently
 * drifting into unauthenticated or cacheable artist catalog requests.
 */
export async function artistMusicApiFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<ArtistMusicApiResult<T>> {
  if (!isArtistMusicApiPath(path)) {
    throw new Error(`Invalid artist music API path: ${path}`)
  }

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: new Headers(init.headers),
  })

  const body = (await response.json().catch(() => ({}))) as T
  return { response, body }
}

function apiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback
  const candidate = body as { error?: { message?: unknown } | unknown; message?: unknown }
  if (candidate.error && typeof candidate.error === "object") {
    const message = (candidate.error as { message?: unknown }).message
    if (typeof message === "string" && message) return message
  }
  if (typeof candidate.error === "string" && candidate.error) return candidate.error
  if (typeof candidate.message === "string" && candidate.message) return candidate.message
  return fallback
}

export async function uploadArtistMusicArtifact(
  file: File,
  kind: ArtistMusicUploadKind,
): Promise<ArtistMusicUpload> {
  const { response, body } = await artistMusicApiFetch<{
    data?: Omit<ArtistMusicUpload, "publicUrl">
  }>(`${ARTIST_MUSIC_API_PREFIX}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type, kind }),
  })

  if (!response.ok || !body.data) {
    throw new Error(apiErrorMessage(body, "Unable to prepare upload"))
  }

  const prepared = body.data
  await uploadArtistMusicSignedUrl({ ...prepared, file })

  const { data } = supabase.storage.from(prepared.bucket).getPublicUrl(prepared.path)
  return { ...prepared, publicUrl: data.publicUrl }
}

export async function cleanupArtistMusicUploads(
  uploads: Array<{ bucket?: string; path?: string } | null | undefined>,
): Promise<void> {
  await Promise.all(
    uploads.map(async (upload) => {
      if (!upload?.bucket || !upload.path) return
      try {
        await supabase.storage.from(upload.bucket).remove([upload.path])
      } catch (error) {
        console.warn("Failed to clean up uploaded artist music file", upload.path, error)
      }
    }),
  )
}
