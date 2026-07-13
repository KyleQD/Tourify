export const MUSIC_UPLOAD_TIMEOUT_MS = 60_000
export const AUDIO_DURATION_TIMEOUT_MS = 8_000

export function parseMusicApiError(body: unknown, fallback = "Request failed") {
  if (!body || typeof body !== "object") return fallback
  const error = (body as { error?: unknown }).error
  if (typeof error === "string" && error.trim()) return error
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message
    const code = (error as { code?: unknown }).code
    if (typeof message === "string" && message.trim()) {
      if (typeof code === "string" && code.trim()) return `${message} (${code})`
      return message
    }
  }
  return fallback
}

export async function fetchJsonWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = MUSIC_UPLOAD_TIMEOUT_MS
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    })
    const body = await response.json().catch(() => ({}))
    return { response, body }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw new Error("Request timed out. Please try again.")
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export function getAudioDuration(file: File, timeoutMs = AUDIO_DURATION_TIMEOUT_MS): Promise<number> {
  return new Promise((resolve) => {
    if (typeof Audio === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      resolve(0)
      return
    }

    const audio = new Audio()
    const objectUrl = URL.createObjectURL(file)
    let settled = false

    function finish(duration: number) {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("error", onError)
      URL.revokeObjectURL(objectUrl)
      resolve(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0)
    }

    function onLoaded() {
      finish(audio.duration)
    }

    function onError() {
      finish(0)
    }

    const timeoutId = setTimeout(() => finish(0), timeoutMs)
    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("error", onError)
    audio.preload = "metadata"
    audio.src = objectUrl
  })
}

export function hasPlayableAudio(track: {
  storage_path?: string | null
  file_url?: string | null
  preview_storage_path?: string | null
  preview_file_url?: string | null
}) {
  return Boolean(
    track.storage_path ||
      track.file_url ||
      track.preview_storage_path ||
      track.preview_file_url
  )
}

export function resolveMusicStreamUrl(trackId: string) {
  return `/api/music/stream?trackId=${encodeURIComponent(trackId)}`
}

export function buildMusicSharePostMetadata(input: {
  trackId: string
  title: string
  artistName?: string | null
  genre?: string | null
  type?: string | null
  coverUrl?: string | null
}) {
  return {
    music_track_id: input.trackId,
    track_id: input.trackId,
    track_title: input.title,
    artist_name: input.artistName || null,
    genre: input.genre || null,
    type: input.type || null,
    cover_url: input.coverUrl || null,
  }
}

export function parsePaidTrackPrice(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}
